import os
import json
import math
import re
import logging
import time
from datetime import datetime
from sqlalchemy import text, func
from sqlalchemy.sql.expression import cast
from sqlalchemy.dialects.postgresql import ARRAY, FLOAT
from ..models import Knowledge, Document, DocumentVector, KnowledgeRetrievalHistory
from .. import db
from .embedding_service import EmbeddingService
from .document_service import DocumentService
from ..config import Config as config
from ..utils.logging_utils import setup_logger, log_execution_time, get_request_id, get_process_id, set_process_id, create_process_banner, COLORS

# Configure logger
logger = setup_logger('knowledge_service')

class KnowledgeService:
    """
    KnowledgeService handles all operations related to knowledge bases and documents.
    
    This service manages the creation, retrieval, and querying of knowledge bases and documents.
    It uses PostgreSQL with pgvector extension for vector storage and similarity search.
    """

    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.request_id = get_request_id()
        logger.info(f"Initializing KnowledgeService with request_id={self.request_id}")
        
        # Initialize pgvector extension if needed
        self._init_pgvector()

    @log_execution_time(logger)
    def _init_pgvector(self):
        """Initialize pgvector extension and required functions"""
        from flask import current_app
        
        # Only run this when there's an active application context
        if not current_app:
            logger.debug("No active Flask application context, skipping pgvector initialization")
            return
            
        try:
            # Check if pgvector extension is enabled
            logger.info("Checking if pgvector extension is enabled")
            result = db.session.execute(text("SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector'")).scalar()
            
            if result == 0:
                logger.info("pgvector extension not found, creating extension and functions")
                # Enable pgvector extension
                db.session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                
                # Create similarity functions if they don't exist
                logger.info("Creating cosine_similarity function")
                db.session.execute(text("""
                    CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector) 
                    RETURNS float 
                    AS $$
                      SELECT 1 - (a <=> b) AS result
                    $$ LANGUAGE SQL IMMUTABLE STRICT;
                """))
                
                logger.info("Creating euclidean_distance function")
                db.session.execute(text("""
                    CREATE OR REPLACE FUNCTION euclidean_distance(a vector, b vector) 
                    RETURNS float 
                    AS $$
                      SELECT a <-> b AS result
                    $$ LANGUAGE SQL IMMUTABLE STRICT;
                """))
                
                db.session.commit()
                logger.info("Successfully initialized pgvector extension and functions")
            else:
                logger.info("pgvector extension already enabled")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error initializing pgvector: {str(e)}")
            raise  # Re-raise the exception after logging
    
    @log_execution_time(logger)
    def create_knowledge(self, name, description, embedding_model=config.DEFAULT_EMBEDDING_MODEL):
        process_id = get_process_id()
        create_process_banner(logger, "KNOWLEDGE BASE CREATION STARTED", process_id)
        
        logger.info(f"Creating knowledge base: {name} with embedding model: {embedding_model}")
        knowledge = Knowledge(
            name=name,
            description=description,
            embedding_model=embedding_model
        )
        db.session.add(knowledge)
        db.session.commit()
        
        logger.info(f"Successfully created knowledge base with UUID: {knowledge.uuid}")
        return knowledge

    @log_execution_time(logger)
    def get_knowledge(self, knowledge_uuid):
        """
        Get a knowledge base by UUID with its associated documents.
        
        Args:
            knowledge_uuid: UUID of the knowledge base to retrieve
            
        Returns:
            dict: Knowledge base data with associated documents
            
        Raises:
            404: If knowledge base is not found
        """
        logger.info(f"Fetching knowledge base with UUID: {knowledge_uuid}")
        knowledge = Knowledge.query.get_or_404(knowledge_uuid)
    
        # Get associated documents and convert them to dictionaries
        logger.info(f"Fetching documents for knowledge base: {knowledge.name}")
        start_time = time.time()
        documents = Document.query.filter_by(knowledge_uuid=knowledge_uuid).all()
        documents_data = [d.to_dict() for d in documents]
        query_time = time.time() - start_time
        
        # Prepare the result
        word_count = sum(doc.word_count for doc in documents if doc.word_count)
        logger.info(f"Found {len(documents_data)} documents with {word_count} total words in {query_time:.3f}s")
        
        result = {
            'uuid': str(knowledge.uuid),
            'name': knowledge.name,
            'description': knowledge.description,
            'embedding_model': knowledge.embedding_model,
            'processing_config': knowledge.processing_config,
            'documents': documents_data,
            'document_count': len(documents_data),
            'word_count': word_count
        }
        
        return result

    def list_knowledge_paginated(self, page, per_page, keyword):
        """List knowledge bases with pagination and optional keyword filtering."""
        from sqlalchemy import func, or_

        # Prepare the filter pattern
        pattern = f"%{keyword}%" if keyword else None
        
        # Base query for knowledge bases with counts
        query = db.session.query(
            Knowledge,
            func.count(Document.uuid).label('document_count'),
            func.sum(
                func.length(func.coalesce(Document.content, '')) - 
                func.length(func.replace(func.coalesce(Document.content, ''), ' ', '')) + 1
            ).label('word_count')
        ).outerjoin(
            Document,
            Knowledge.uuid == Document.knowledge_uuid
        )

        # Apply keyword filter if provided
        if keyword:
            query = query.filter(
                or_(
                    Knowledge.name.ilike(pattern),
                    Knowledge.description.ilike(pattern)
                )
            )

        # Group and order the results
        query = query.group_by(Knowledge.uuid).order_by(Knowledge.created_at.desc())

        # Get total count with the same filters
        total = query.count()

        # Apply pagination
        page = max(1, int(page) if page is not None else 1)
        per_page = max(1, int(per_page) if per_page is not None else 10)
        offset = (page - 1) * per_page
        rows = query.offset(offset).limit(per_page).all()

        # Process results
        items = []
        for kb, doc_count, word_count in rows:
            kb_dict = kb.to_dict()
            kb_dict['document_count'] = doc_count or 0
            kb_dict['word_count'] = 0
            if word_count is not None:
                try:
                    wc = int(word_count)
                    kb_dict['word_count'] = 0 if wc == 1 else wc
                except (ValueError, TypeError):
                    pass
            kb_dict['linked_app'] = 0
            items.append(kb_dict)

        return {
            'items': items,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': math.ceil(total / per_page) if per_page else 0,
        }

    def list_knowledge(self):
        """
        List all knowledge bases with their document counts and word counts.
        
        Returns:
            list: List of knowledge bases with document_count and word_count
        """
        from sqlalchemy import func
        
        # Query knowledge bases with document counts and word counts
        kb_with_counts = db.session.query(
            Knowledge,
            func.count(Document.uuid).label('document_count'),
            func.sum(func.length(func.coalesce(Document.content, '')) - 
                    func.length(func.replace(func.coalesce(Document.content, ''), ' ', '')) + 1
                ).label('word_count')
        ).outerjoin(
            Document, 
            Knowledge.uuid == Document.knowledge_uuid
        ).group_by(Knowledge.uuid)\
        .order_by(Knowledge.created_at.desc())\
        .all()
        
        # Convert to list of dicts with counts
        result = []
        for kb, doc_count, word_count in kb_with_counts:        
            kb_dict = kb.to_dict()
            kb_dict['document_count'] = doc_count or 0
            if int(word_count) == 1 :
                kb_dict['word_count'] = 0
            else :
                if int(word_count) is not None:
                    kb_dict['word_count'] = int(word_count)
                else:
                    kb_dict['word_count'] = 0
            kb_dict['linked_app'] = 0
            result.append(kb_dict)
            
        return result
    
    def delete_knowledge(self, knowledge_uuid):
        """
        Delete a knowledge base by UUID.
        first delete document vector bay document id. get documents by knowledge_uuid
        
        Args:
            knowledge_uuid: UUID of the knowledge base to delete
        
        Raises:
            ValueError: If knowledge base is not found
        """

        documents = Document.query.filter_by(knowledge_uuid).all()
        for document in documents:
            document_vector = DocumentVector.query.get(document.uuid)
            try:
                document_service.delete_document(document.uuid)
            except Exception as e:
                logger.error(f"Failed to delete document {document.uuid}: {str(e)}")
            if document_vector:
                db.session.delete(document_vector)
            try:
                db.session.delete(document)
            except Exception as e:
                logger.error(f"Failed to delete document {document.uuid}: {str(e)}")
        

        knowledge = Knowledge.query.get(knowledge_uuid)
        if not knowledge:
            raise ValueError(f"Knowledge with UUID {knowledge_uuid} not found")
        db.session.delete(knowledge)
        db.session.commit()

    def initialize_knowledge(self, data):
        """
        Initialize or update a knowledge base with processing configuration and associate documents.
        
        Args:
            data (dict): Request data containing:
                - uuid (str, optional): UUID of existing knowledge base to update
                - name (str): Name of the knowledge base
                - description (str): Description of the knowledge base
                - processing_config (dict): Processing configuration
                - documents (list): List of document objects to associate
                
        Returns:
            tuple: (knowledge, document_count, documents) - The created/updated knowledge base, 
                count of processed documents, and documents with status
        """
        try:
            # Check if we're updating an existing knowledge base
            if 'uuid' in data and data['uuid']:
                knowledge = Knowledge.query.get(data['uuid'])
                if not knowledge:
                    raise ValueError(f"Knowledge with UUID {data['uuid']} not found")
                
                # Update existing knowledge base
                knowledge.name = data.get('name', knowledge.name)
                knowledge.description = data.get('description', knowledge.description)
                knowledge.processing_config = data.get('processing_config', knowledge.processing_config)
                knowledge.updated_at = datetime.utcnow()
                
            else:
                # Create new knowledge base
                knowledge = Knowledge(
                    name=data['name'],
                    description=data.get('description', ''),
                    processing_config=data['processing_config'],
                    embedding_model=config.DEFAULT_EMBEDDING_MODEL,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.session.add(knowledge)
            
            db.session.flush()
            
            # Process documents if provided
            documents = data.get('documents', [])
            document_ids = [doc.get('id') for doc in documents if doc.get('id')]
            document_count = 0
            
            if document_ids:
                # Update documents with the knowledge_uuid
                result = db.session.query(Document).filter(
                    Document.uuid.in_(document_ids)
                ).update({
                    Document.knowledge_uuid: knowledge.uuid,
                    Document.updated_at: datetime.utcnow()
                }, synchronize_session=False)
                document_count = result
            
            db.session.commit()

            """
            embeding documents
            """
            self._process_document_embeddings(str(knowledge.uuid), document_ids, data['processing_config'])
            
            # Update documents list with status
            for doc in documents:
                doc['embedding_status'] = 'completed' if doc.get('id') in document_ids else 'failed'

            return knowledge, document_count, documents
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f'Error initializing/updating knowledge base: {str(e)}')

    def _chunk_document(self, content, chunk_size, chunk_overlap, delimiter='\n\n'):
        """
        Split document content into chunks with sentence-aware overlap, preserving formatting.
        
        Args:
            content: The document content to chunk
            chunk_size: Maximum size of each chunk
            chunk_overlap: Number of characters to overlap between chunks
            delimiter: The delimiter to use for splitting text (default: '\n\n')
            
        Returns:
            List of chunk dictionaries with content and metadata
        """
        if not content:
            return []
        
        # Normalize line endings to ensure consistent handling
        content = content.replace('\r\n', '\n')
        
        # Compile regex for sentence detection
        # This pattern matches sentences ending with period, question mark, or exclamation mark
        # followed by a space or newline
        sentence_pattern = re.compile(r'(?<=[.!?])(?=\s|\n|$)')
        
        # Dify-style approach: preserve all formatting including newlines
        chunks = []
        
        # First try to split by delimiter
        if delimiter in content:
            # Split content by delimiter but keep the delimiter for formatting
            parts = content.split(delimiter)
            current_chunk = ""
            current_size = 0
            
            for i, part in enumerate(parts):
                # Skip completely empty parts
                if not part.strip():
                    continue
                
                # Calculate size with delimiter
                part_with_delimiter = delimiter + part if current_chunk else part
                part_size = len(part_with_delimiter)
                
                # If adding this part would exceed chunk size and we already have content
                if current_size + part_size > chunk_size and current_chunk:
                    # Save current chunk
                    chunks.append({
                        'content': current_chunk,
                        'word_count': len(current_chunk.split())
                    })
                    
                    # Start new chunk with sentence-aware overlap
                    if chunk_overlap > 0:
                        # Split the current chunk into sentences
                        sentences = [s.strip() for s in sentence_pattern.split(current_chunk) if s.strip()]
                        
                        # Take sentences from the end until we reach desired overlap
                        overlap_text = ""
                        for sentence in reversed(sentences):
                            if len(overlap_text) + len(sentence) + 1 <= chunk_overlap * 3:  # Allow for more overlap to get complete sentences
                                if overlap_text:
                                    overlap_text = sentence + " " + overlap_text
                                else:
                                    overlap_text = sentence
                            else:
                                break
                        
                        if overlap_text:
                            current_chunk = overlap_text
                            current_size = len(overlap_text)
                        else:
                            # Fallback to paragraph overlap if sentences are too long
                            last_paragraphs = current_chunk.split(delimiter)[-1:]
                            if last_paragraphs and last_paragraphs[0].strip():
                                current_chunk = last_paragraphs[0]
                                current_size = len(current_chunk)
                            else:
                                current_chunk = ""
                                current_size = 0
                    else:
                        current_chunk = ""
                        current_size = 0
                
                # Add part to current chunk
                if current_chunk:
                    current_chunk += delimiter + part
                    current_size += len(delimiter) + len(part)
                else:
                    current_chunk = part
                    current_size = len(part)
            
            # Add the last chunk if not empty
            if current_chunk:
                chunks.append({
                    'content': current_chunk,
                    'word_count': len(current_chunk.split())
                })
        else:
            # If no delimiter found, use semantic chunking with natural boundaries
            start = 0
            content_length = len(content)
            
            while start < content_length:
                end = min(start + chunk_size, content_length)
                
                # Try to end at a natural boundary if possible
                if end < content_length:
                    # Look for paragraph boundary
                    paragraph_end = content.rfind('\n\n', start, end)
                    if paragraph_end > start + chunk_size // 2:
                        end = paragraph_end + 2  # Include the newlines
                    else:
                        # Look for line boundary
                        line_end = content.rfind('\n', start, end)
                        if line_end > start + chunk_size // 2:
                            end = line_end + 1  # Include the newline
                        else:
                            # Look for sentence boundary - improved to find the last sentence boundary
                            # Find all sentence boundaries in the range
                            text_segment = content[start:end]
                            sentence_matches = list(sentence_pattern.finditer(text_segment))
                            
                            if sentence_matches:
                                # Get the last sentence boundary position
                                last_match = sentence_matches[-1]
                                sentence_end = start + last_match.start() + 1  # +1 to include the period
                                if sentence_end > start + chunk_size // 3:  # Ensure we have a reasonable chunk size
                                    end = sentence_end
                
                # Extract chunk text and ensure it's not empty
                chunk_text = content[start:end].strip()
                if chunk_text:
                    chunks.append({
                        'content': chunk_text,
                        'word_count': len(chunk_text.split())
                    })
                
                if end == content_length:
                    break
                    
                # Calculate next start position with sentence-aware overlap
                if chunk_overlap > 0:
                    # Find sentences in the current chunk
                    chunk_sentences = sentence_pattern.split(chunk_text)
                    
                    # Calculate how many sentences to include in overlap
                    # Aim for approximately chunk_overlap characters
                    overlap_text = ""
                    for sentence in reversed(chunk_sentences):
                        if len(overlap_text) + len(sentence) <= chunk_overlap * 3:  # Allow for more overlap to get complete sentences
                            if overlap_text:
                                overlap_text = sentence + overlap_text
                            else:
                                overlap_text = sentence
                        else:
                            break
                    
                    # Find where this overlap starts in the original text
                    if overlap_text:
                        overlap_start = content.rfind(overlap_text, start, end)
                        if overlap_start > start:
                            start = overlap_start
                        else:
                            # Fallback to character-based overlap
                            start = max(start + 1, end - chunk_overlap)
                    else:
                        # Fallback to character-based overlap
                        start = max(start + 1, end - chunk_overlap)
                else:
                    # No overlap requested
                    start = end
        
        # Ensure all chunks have proper formatting
        for i, chunk in enumerate(chunks):
            # Ensure no leading/trailing whitespace but preserve internal newlines
            chunks[i]['content'] = chunk['content'].strip()
            
        return chunks
                
    @log_execution_time(logger)
    def _process_document_embeddings(self, knowledge_id, document_ids, processing_config):
        """
        Process document embeddings and chunking synchronously.
        
        Args:
            knowledge_id: UUID of the knowledge base
            document_ids: List of document IDs to process
            processing_config: Configuration for processing including chunk settings
        """
        from app.models import Document, DocumentVector
        from .embedding_service import EmbeddingService
        from datetime import datetime
        import uuid
        
        # Create a unique process ID for this embedding operation
        process_id = get_process_id()
        create_process_banner(logger, "DOCUMENT EMBEDDING PROCESS STARTED", process_id)
        
        embedding_service = EmbeddingService()
        
        # Get chunking settings from processing config
        chunk_settings = processing_config.get('chunk_setting', {})
        chunk_size = chunk_settings.get('max_chunk_len', 1024)
        chunk_overlap = chunk_settings.get('chunk_overlap', 50)
        delimiter = chunk_settings.get('delimiter', '\n\n')
        
        logger.info(f"Processing {len(document_ids)} documents with chunk settings - size: {chunk_size}, overlap: {chunk_overlap}")
        
        total_chunks = 0
        successful_docs = 0
        failed_docs = 0
        start_time = time.time()
        
        for doc_id in document_ids:
            document = Document.query.get(doc_id)
            if not document or not document.content:
                logger.warning(f"Document {doc_id} not found or content is empty")
                failed_docs += 1
                continue
                
            try:
                doc_start_time = time.time()
                logger.info(f"Processing document {doc_id} - {document.filename} - {len(document.content)} chars")
                logger.debug(f"Chunk settings - size: {chunk_size}, overlap: {chunk_overlap}, delimiter: {repr(delimiter)}")
                
                # Chunk the document content
                chunk_start_time = time.time()
                chunks = self._chunk_document(
                    document.content,
                    chunk_size=chunk_size,
                    chunk_overlap=chunk_overlap,
                    delimiter=delimiter
                )
                chunk_time = time.time() - chunk_start_time
                logger.info(f"Document chunked into {len(chunks)} segments in {chunk_time:.3f}s")
                
                # Generate embeddings for each chunk
                embedding_start_time = time.time()
                for idx, chunk in enumerate(chunks):
                    logger.info(f"Generating embedding for chunk {idx + 1}/{len(chunks)} of document {doc_id}")
                    
                    # Generate embedding for the chunk
                    embedding = embedding_service.generate_embeddings(chunk['content'])
                    
                    # Create vector for the segment
                    vector = DocumentVector(
                        uuid=uuid.uuid4(),
                        knowledge_uuid=knowledge_id,
                        document_uuid=doc_id,
                        embedding=embedding,
                        chunk_index=idx,
                        total_chunks=len(chunks),
                        text_content=chunk['content'],
                        position=idx,
                        word_count=chunk['word_count'],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    
                    # Add to session
                    db.session.add(vector)
                
                embedding_time = time.time() - embedding_start_time
                
                # Update document status
                document.embedding_status = 'completed'
                document.updated_at = datetime.utcnow()
                db.session.commit()
                
                doc_processing_time = time.time() - doc_start_time
                logger.info(f"Successfully processed document {doc_id} - {len(chunks)} chunks in {doc_processing_time:.3f}s")
                logger.info(f"  - Chunking: {chunk_time:.3f}s, Embedding: {embedding_time:.3f}s")
                
                total_chunks += len(chunks)
                successful_docs += 1
                
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error processing document {doc_id}: {str(e)}")
                if document:
                    document.embedding_status = 'failed'
                    document.updated_at = datetime.utcnow()
                    db.session.commit()
                document.updated_at = datetime.utcnow()
                db.session.commit()
                failed_docs += 1
        
        total_time = time.time() - start_time
        completion_banner = f"{COLORS['MAGENTA']}{COLORS['BOLD']}" \
                f"DOCUMENT EMBEDDING PROCESS COMPLETED [PROCESS: {process_id}]\n" \
                f"DOCUMENTS: {successful_docs} successful, {failed_docs} failed | CHUNKS: {total_chunks} | TIME: {total_time:.2f}s{COLORS['RESET']}"
        logger.info(completion_banner)

    def add_document(self, knowledge_uuid, file, content_type):
        knowledge = self.get_knowledge(knowledge_uuid)
        
        # Create document record
        document = Document(
            filename=file.filename,
            content_type=content_type,
            knowledge_uuid=knowledge_uuid
        )
        db.session.add(document)
        db.session.commit()
        
        # Process and embed document
        try:
            # Extract text content
            content = DocumentService._extract_text(file, content_type)
            document.content = content
            document.embedding_status = 'processing'
            db.session.commit()
            
            # Generate embeddings using our embedding service
            embeddings = self.embedding_service.generate_embeddings(content)
            
            # Store document vector in PostgreSQL
            document_vector = DocumentVector(
                document_uuid=document.uuid,
                chunk_index=0,  # For now, we're not chunking documents
                total_chunks=1,
                document_type=content_type,
                text_content=content,
                embedding=embeddings,
                doc_metadata=json.dumps({"filename": file.filename})
            )
            
            db.session.add(document_vector)
            document.embedding_status = 'completed'
            db.session.commit()
            
        except Exception as e:
            document.embedding_status = 'failed'
            db.session.commit()
            raise e
        
        return document

    @log_execution_time(logger)
    def query(self, knowledge_id, query, limit=5):
        """
        Query the knowledge base using vector similarity search.
        
        This method performs the following steps:
        1. Generate embeddings for the query text using the embedding service
        2. Retrieve document vectors for the specified knowledge base using SQLAlchemy ORM
        3. Calculate cosine similarity between query embedding and each document embedding
        4. Return results in a format similar to ChromaDB's output for compatibility
        
        Args:
            knowledge_id (UUID): UUID of the knowledge base to query
            query (str): The query text to search for
            limit (int, optional): Maximum number of results to return. Defaults to 5.
            
        Returns:
            dict: A dictionary containing the search results with keys:
                - ids: List of document IDs
                - documents: List of document texts
                - metadatas: List of document metadata
                - distances: List of distances (1 - similarity) between query and documents
        """
        # Create a unique process ID for this query operation
        process_id = get_process_id()
        create_process_banner(logger, "KNOWLEDGE QUERY STARTED", process_id)
        
        logger.info(f"Querying knowledge base {knowledge_id} with query: '{query[:100]}{'...' if len(query) > 100 else ''}', limit: {limit}")

        # Generate query embedding
        embedding_start = time.time()
        query_embedding = self.embedding_service.generate_embeddings(query)
        embedding_time = time.time() - embedding_start
        logger.info(f"Generated query embedding in {embedding_time:.3f}s")
        
        # Use SQLAlchemy ORM approach instead of raw SQL
        # This avoids issues with parameter binding for vector types
        from sqlalchemy import func, text
        from sqlalchemy.sql.expression import literal
        
        # Get the document vectors for the specified knowledge base
        # with calculated similarity scores
        from app.models.document_vector import DocumentVector
        from app.models.document import Document
        
        # Use a simpler approach - first get all document vectors for this knowledge base
        query_start = time.time()
        document_vectors = db.session.query(DocumentVector, Document).\
            join(Document, DocumentVector.document_uuid == Document.uuid).\
            filter(Document.knowledge_uuid == knowledge_id).\
            all()
        query_time = time.time() - query_start
        
        logger.info(f"Retrieved {len(document_vectors)} document vectors in {query_time:.3f}s")
        
        # Format results similar to ChromaDB output
        documents = []
        document_uuids = []
        metadatas = []
        similarities = []
        
        # Process results if any found
        if document_vectors:
            import numpy as np
            from sklearn.metrics.pairwise import cosine_similarity
            
            # Convert query embedding to numpy array
            query_vector = np.array(query_embedding).reshape(1, -1)
            
            similarity_start = time.time()
            # Calculate similarity for each document vector
            for dv, doc in document_vectors:
                # Convert document embedding to numpy array
                doc_vector = np.array(dv.embedding).reshape(1, -1)
                
                # Calculate cosine similarity
                similarity = cosine_similarity(query_vector, doc_vector)[0][0]
                
                documents.append(dv.text_content)
                document_uuids.append(str(dv.document_uuid))
                metadatas.append({"filename": doc.filename})
                # Store distance (1 - similarity) to match ChromaDB's format
                similarities.append(1.0 - float(similarity))
            
            similarity_time = time.time() - similarity_start
            logger.info(f"Calculated similarities for {len(document_vectors)} vectors in {similarity_time:.3f}s")
            
            # Sort by similarity and limit results
            if len(similarities) > limit:
                # Create sorted pairs of (similarity, index)
                sorted_pairs = sorted(zip(similarities, range(len(similarities))))
                # Take only the top 'limit' results
                top_indices = [idx for _, idx in sorted_pairs[:limit]]
                
                # Filter results to only include top matches
                documents = [documents[i] for i in top_indices]
                document_uuids = [document_uuids[i] for i in top_indices]
                metadatas = [metadatas[i] for i in top_indices]
                similarities = [similarities[i] for i in top_indices]
                
                logger.info(f"Limited results to top {limit} matches")
        else:
            logger.info("No document vectors found for this knowledge base")
        
        total_time = time.time() - embedding_start
        completion_banner = f"{COLORS['MAGENTA']}{COLORS['BOLD']}" \
                f"KNOWLEDGE QUERY COMPLETED [PROCESS: {process_id}]\n" \
                f"RESULTS: {len(documents)} | TIME: {total_time:.2f}s{COLORS['RESET']}"
        logger.info(completion_banner)
        
        return {
            "uuids": document_uuids,
            "documents": documents,
            "metadatas": metadatas,
            "distances": similarities
        }

    def get_document_retrieval_history(self, knowledge_uuid, page, per_page, keyword):
        
        """
        query knowledge retrieval history based on knowledge_uuid with pagination and keyword search
        """
        
        #Query to knowledge retrieval history based on knowledge_uuid
        query = db.session.query(KnowledgeRetrievalHistory).filter(KnowledgeRetrievalHistory.knowledge_uuid == knowledge_uuid)

        #Apply keyword filter if provided
        if keyword:
            query = query.filter(KnowledgeRetrievalHistory.query.ilike(f"%{keyword}%"))

        #Order by created_at desc
        query = query.order_by(KnowledgeRetrievalHistory.created_at.desc())

        # Get total count with the same filters
        total = query.count()

        #Apply pagination
        page = max(1, int(page) if page is not None else 1)
        per_page = max(1, int(per_page) if per_page is not None else 10)
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page)


        # Process results
        items = []
        for history in query.all():
            history_dict = history.to_dict()
            items.append(history_dict)

        return {
            'items': items,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': math.ceil(total / per_page) if per_page else 0,
        }
    
