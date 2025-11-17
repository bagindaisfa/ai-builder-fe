from typing import Optional, List, Dict, Any
import uuid
import time
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, text
from flask import current_app
from .. import db

from ..models.knowledge_retrieval_history import KnowledgeRetrievalHistory
from ..models.document_vector import DocumentVector
from ..models.knowledge import Knowledge
from ..models.document import Document
from ..utils.logging_utils import setup_logger, log_execution_time, get_request_id, get_process_id, set_process_id, create_process_banner, COLORS, ANSI_ENABLED

# Configure logger
logger = setup_logger('knowledge_retrieval_service')

class RetrievalMethod:
    FULL_TEXT_SEARCH = "full-text"
    SEMANTIC_SEARCH = "semantic"
    HYBRID_SEARCH = "hybrid"

class KnowledgeRetrievalService:
    """Service for retrieving document chunks using various search methods."""

    @classmethod
    @log_execution_time(logger)
    def retrieve(
        cls,
        retrieval_method: str,
        dataset_id: str,
        query: str,
        top_k: int = 5,
        score_threshold: float = 0.0,
        reranking_model: Optional[dict] = None,
        document_ids_filter: Optional[List[str]] = None,
        **kwargs
    ) -> List[DocumentVector]:
        """
        Retrieve document chunks based on the specified retrieval method.
        
        Args:
            retrieval_method: The search method to use (keyword, semantic, hybrid)
            dataset_id: UUID of the knowledge base
            query: Search query string
            top_k: Maximum number of results to return
            score_threshold: Minimum score threshold for results
            reranking_model: Configuration for reranking (not implemented)
            document_ids_filter: Optional list of document IDs to filter by
            
        Returns:
            List of DocumentVector objects matching the query
        """
        # Create a unique process ID for this retrieval operation
        process_id = get_process_id()
        create_process_banner(logger, f"KNOWLEDGE RETRIEVAL STARTED - {retrieval_method.upper()}", process_id)
        
        # Log retrieval parameters
        query_preview = query[:50] + '...' if len(query) > 50 else query
        logger.info(f"Retrieval method: {retrieval_method}")
        logger.info(f"Knowledge base ID: {dataset_id}")
        logger.info(f"Query: '{query_preview}'")
        logger.info(f"Top-k: {top_k}, Score threshold: {score_threshold}")
        
        if document_ids_filter:
            logger.info(f"Document filter applied: {len(document_ids_filter)} documents")
        
        if not query:
            logger.warning("Empty query provided, returning empty result")
            return []

        # Get the knowledge base to verify it exists
        start_time = time.time()
        knowledge = Knowledge.query.get(dataset_id)
        if not knowledge:
            error_msg = f"Knowledge base with ID {dataset_id} not found"
            if ANSI_ENABLED:
                logger.error(f"{COLORS['RED']}{error_msg}{COLORS['RESET']}")
            else:
                logger.error(f"{error_msg}")
            raise ValueError(error_msg)
        
        logger.info(f"Found knowledge base: {knowledge.name}")
        
        # Create retrieval history record
        history_id = str(uuid.uuid4())
        logger.info(f"Creating retrieval history record with ID: {history_id}")
        knowledge_retrieval_history = KnowledgeRetrievalHistory(
            uuid=history_id,
            knowledge_uuid=dataset_id,
            source=retrieval_method,
            query=query,
            top_k=top_k,
            score_threshold=score_threshold
        )
        db.session.add(knowledge_retrieval_history)
        db.session.commit()
        logger.debug(f"Retrieval history record created successfully")

        # Execute the appropriate search method
        try:
            if retrieval_method == RetrievalMethod.FULL_TEXT_SEARCH or retrieval_method == "keyword":  # Support legacy 'keyword' value
                logger.info(f"Executing full-text search")
                results = cls._full_text_search(
                    knowledge_id=dataset_id,
                    query=query,
                    top_k=top_k,
                    score_threshold=score_threshold,
                    document_ids_filter=document_ids_filter
                )
            elif retrieval_method == RetrievalMethod.SEMANTIC_SEARCH:
                logger.info(f"Executing semantic search")
                results = cls._semantic_search(
                    knowledge_id=dataset_id,
                    query=query,
                    top_k=top_k,
                    score_threshold=score_threshold,
                    document_ids_filter=document_ids_filter
                )
            elif retrieval_method == RetrievalMethod.HYBRID_SEARCH:
                logger.info(f"Executing hybrid search")
                results = cls._hybrid_search(
                    knowledge_id=dataset_id,
                    query=query,
                    top_k=top_k,
                    score_threshold=score_threshold,
                    document_ids_filter=document_ids_filter
                )
            else:
                error_msg = f"Unsupported retrieval method: {retrieval_method}"
                if ANSI_ENABLED:
                    logger.error(f"{COLORS['RED']}{error_msg}{COLORS['RESET']}")
                else:
                    logger.error(f"{error_msg}")
                raise ValueError(error_msg)
                
            # Log completion
            total_time = time.time() - start_time
            result_count = len(results) if results else 0
            
            # Create completion banner with Windows compatibility
            if ANSI_ENABLED:
                completion_banner = f"{COLORS['GREEN']}{COLORS['BOLD']}" \
                        f"KNOWLEDGE RETRIEVAL COMPLETED [PROCESS: {process_id}]\n" \
                        f"METHOD: {retrieval_method} | RESULTS: {result_count} | TIME: {total_time:.3f}s{COLORS['RESET']}"
            else:
                completion_banner = f"KNOWLEDGE RETRIEVAL COMPLETED [PROCESS: {process_id}]\n" \
                        f"METHOD: {retrieval_method} | RESULTS: {result_count} | TIME: {total_time:.3f}s"
            logger.info(completion_banner)
            
            return results
            
        except Exception as e:
            # Create error banner with Windows compatibility
            if ANSI_ENABLED:
                error_banner = f"{COLORS['RED']}{COLORS['BOLD']}" \
                        f"KNOWLEDGE RETRIEVAL FAILED [PROCESS: {process_id}]\n" \
                        f"METHOD: {retrieval_method} | ERROR: {str(e)}{COLORS['RESET']}"
            else:
                error_banner = f"KNOWLEDGE RETRIEVAL FAILED [PROCESS: {process_id}]\n" \
                        f"METHOD: {retrieval_method} | ERROR: {str(e)}"
            logger.error(error_banner)
            raise

    @classmethod
    @log_execution_time(logger)
    def _full_text_search(
        cls,
        knowledge_id: str,
        query: str,
        top_k: int = 5,
        score_threshold: float = 0.0,
        document_ids_filter: Optional[List[str]] = None
    ) -> List[DocumentVector]:
        """
        Perform a full-text search across document chunks.
        
        Args:
            knowledge_id: UUID of the knowledge base
            query: Search query string
            top_k: Maximum number of results to return
            score_threshold: Minimum score threshold for results
            document_ids_filter: Optional list of document IDs to filter by
            
        Returns:
            List of DocumentVector objects matching the query
        """
        # Create a unique process ID for this search operation
        process_id = get_process_id()
        logger.info(f"Starting full-text search [Process: {process_id}]")
        
        # Import Document model here to avoid circular imports
        from app.models.document import Document
        
        # Clean and prepare the search query
        start_time = time.time()
        logger.info(f"Preparing search terms from query: '{query[:50]}...' if len(query) > 50 else query")
        search_terms = cls._prepare_search_terms(query)
        logger.info(f"Generated {len(search_terms)} search terms: {search_terms}")
        
        # Build the base query with join to Document table
        logger.info("Building database query")
        query_obj = db.session.query(DocumentVector, Document).join(
            Document,
            DocumentVector.document_uuid == Document.uuid
        ).filter(
            DocumentVector.knowledge_uuid == knowledge_id,
            DocumentVector.enable == True
        )
        
        # Apply document filter if provided
        if document_ids_filter:
            logger.info(f"Applying document filter with {len(document_ids_filter)} document IDs")
            query_obj = query_obj.filter(DocumentVector.document_uuid.in_(document_ids_filter))
        
        # Build the full-text search condition
        search_conditions = []
        for term in search_terms:
            # Search in text_content
            search_conditions.append(DocumentVector.text_content.ilike(f'%{term}%'))
        
        if search_conditions:
            # Use OR between search terms to find any matching term
            logger.info(f"Adding {len(search_conditions)} search conditions to query")
            query_obj = query_obj.filter(or_(*search_conditions))
            
        # Log the SQL query without literal binds to avoid UUID conversion issues
        compiled_query = query_obj.statement.compile()
        logger.debug(f"\n[FULL-TEXT SEARCH SQL]\n{compiled_query}\n")
        logger.debug(f"Parameters: knowledge_uuid={knowledge_id}, top_k={top_k}")
        
        # Get total count of matching documents without limit
        count_start_time = time.time()
        total_count = query_obj.count()
        count_time = time.time() - count_start_time
        logger.info(f"Found {total_count} matching chunks in {count_time:.3f}s")
        
        # Execute the query with limit
        query_start_time = time.time()
        results = query_obj.order_by(
            DocumentVector.hit_count.desc(),  # Prioritize frequently accessed chunks
            DocumentVector.updated_at.desc()  # Then by most recently updated
        ).limit(top_k).all()
        query_time = time.time() - query_start_time
        
        logger.info(f"Retrieved {len(results)} chunks with top_k={top_k} in {query_time:.3f}s")
        
        # If we have fewer results than requested, log the reason
        if len(results) < top_k and len(results) < total_count:
            logger.warning(f"Retrieved fewer results ({len(results)}) than requested ({top_k}) despite having {total_count} matching chunks")
        
        # Process results to combine vector and document data
        logger.info("Processing search results")
        process_start_time = time.time()
        combined_results = []
        for vector, document in results:
            # Update hit count for returned results
            vector.hit_count += 1
            
            # Combine vector and document data, ensuring all UUIDs are strings
            result_data = vector.to_dict()
            
            # Convert UUIDs to strings in the vector data
            for key in ['uuid', 'user_uuid', 'document_uuid', 'knowledge_uuid', 'bots_uuid']:
                if key in result_data and result_data[key] is not None:
                    result_data[key] = str(result_data[key])
            
            # Get document data and ensure UUIDs are strings
            doc_data = document.to_dict()
            for key in ['uuid', 'knowledge_uuid']:
                if key in doc_data and doc_data[key] is not None:
                    doc_data[key] = str(doc_data[key])
            
            result_data['document'] = doc_data
            
            # Add a simple relevance score based on hit count
            result_data['similarity_score'] = min(1.0, vector.hit_count * 0.1)  # Cap score at 1.0
            
            combined_results.append(result_data)
        
        # Sort by hit count (most relevant first) and limit to top_k
        combined_results.sort(key=lambda x: x['hit_count'], reverse=True)
        
        process_time = time.time() - process_start_time
        total_time = time.time() - start_time
        logger.info(f"Processed {len(combined_results)} results in {process_time:.3f}s")
        logger.info(f"Full-text search completed in {total_time:.3f}s total")
        
        return combined_results

    @classmethod
    @log_execution_time(logger)
    def _semantic_search(
        cls,
        knowledge_id: str,
        query: str,
        top_k: int = 5,
        score_threshold: float = 0.0,
        document_ids_filter: Optional[List[str]] = None
    ) -> List[DocumentVector]:
        """
        Perform a semantic search using vector embeddings and PostgreSQL's vector similarity.
        
        This method:
        1. Generates an embedding for the query
        2. Uses PostgreSQL to find similar document chunks using cosine similarity
        3. Returns the top-k results
        """
        # Create a unique process ID for this search operation
        process_id = get_process_id()
        logger.info(f"Starting semantic search [Process: {process_id}]")
        start_time = time.time()
        
        # Import necessary models
        from app.models.document import Document
        from ..services.embedding_service import EmbeddingService
        
        # Create embedding service instance
        logger.info("Initializing embedding service")
        embedding_service = EmbeddingService()
        
        try:
            # Generate embedding for the query
            logger.info("Generating embedding for query")
            embedding_start_time = time.time()
            query_embedding = embedding_service.generate_embeddings(query)
            embedding_time = time.time() - embedding_start_time
            logger.info(f"Generated embedding with {len(query_embedding)} dimensions in {embedding_time:.3f}s")
            
            # Convert embedding to a proper PostgreSQL array format for vector type
            # Use brackets instead of braces as required by pgvector
            embedding_str = '[' + ','.join(str(x) for x in query_embedding) + ']'
            
            # Build the base query with join to Document table
            logger.info("Building vector similarity SQL query")
            # Use pgvector's cosine similarity function with direct embedding insertion
            # Since the column is already of type vector, no need for casting the column
            # We need to use direct string formatting for the vector embedding
            # but can use bind parameters for other values
            sql_query = f"""
                SELECT dv.*, d.*,
                       1 - (dv.embedding <=> '{embedding_str}'::vector) as similarity_score
                FROM document_vectors dv
                JOIN document d ON dv.document_uuid = d.uuid
                WHERE dv.knowledge_uuid = :knowledge_id
                AND dv.enable = TRUE
                ORDER BY dv.embedding <=> '{embedding_str}'::vector
                LIMIT :top_k
            """
            
            # Add document filter if provided
            if document_ids_filter:
                logger.info(f"Adding document filter with {len(document_ids_filter)} document IDs")
                doc_ids_str = "'" + "','".join(document_ids_filter) + "'"
                sql_query = sql_query.replace(
                    "WHERE dv.knowledge_uuid = :knowledge_id",
                    f"WHERE dv.knowledge_uuid = :knowledge_id AND dv.document_uuid IN ({doc_ids_str})"
                )
            
            # Log the SQL query
            logger.debug(f"\n[SEMANTIC SEARCH SQL]\n{sql_query}\n")
            logger.debug(f"Parameters: knowledge_id={knowledge_id}, top_k={top_k}, query_embedding_length={len(embedding_str)}")
            
            # Create parameters dictionary for bind parameters
            params = {
                'knowledge_id': knowledge_id,
                'top_k': top_k
            }
            
            # Execute the query with bind parameters
            logger.info("Executing vector similarity query")
            query_start_time = time.time()
            result = db.session.execute(text(sql_query), params)
            query_time = time.time() - query_start_time
            logger.info(f"Query executed in {query_time:.3f}s")
            
            # Process results
            logger.info("Processing query results")
            process_start_time = time.time()
            combined_results = []
            row_count = 0
            
            for row in result:
                row_count += 1
                # Extract vector and document from row
                vector = DocumentVector(
                    uuid=row.uuid,
                    document_uuid=row.document_uuid,
                    knowledge_uuid=row.knowledge_uuid,
                    chunk_index=row.chunk_index,
                    total_chunks=row.total_chunks,
                    position=row.position,
                    word_count=row.word_count,
                    hit_count=row.hit_count,
                    enable=row.enable,
                    document_type=row.document_type,
                    text_content=row.text_content,
                    embedding=row.embedding,
                    created_at=row.created_at,
                    updated_at=row.updated_at,
                    bots_uuid=row.bots_uuid
                )
                
                document = Document(
                    uuid=row.uuid,
                    filename=row.filename,
                    content_type=row.content_type,
                    embedding_status=row.embedding_status,
                    created_at=row.created_at,
                    updated_at=row.updated_at,
                    knowledge_uuid=row.knowledge_uuid
                )
                
                # Update hit count for returned results
                vector.hit_count += 1
                
                # Combine vector and document data
                result_data = vector.to_dict()
                
                # Convert UUIDs to strings
                for key in ['uuid', 'user_uuid', 'document_uuid', 'knowledge_uuid', 'bots_uuid']:
                    if key in result_data and result_data[key] is not None:
                        result_data[key] = str(result_data[key])
                
                # Get document data
                doc_data = document.to_dict()
                for key in ['uuid', 'knowledge_uuid']:
                    if key in doc_data and doc_data[key] is not None:
                        doc_data[key] = str(doc_data[key])
                
                result_data['document'] = doc_data
                
                # Use the similarity_score directly from the query
                # This is already calculated as 1 - (cosine distance)
                if hasattr(row, 'similarity_score'):
                    similarity = max(0.0, min(1.0, row.similarity_score))
                    result_data['similarity_score'] = similarity
                    logger.debug(f"Result {row_count} has similarity score: {similarity:.4f}")
                else:
                    # Fallback if similarity_score is not available
                    result_data['similarity_score'] = 0.5
                    logger.warning("No similarity score available for result, using default 0.5")
                
                combined_results.append(result_data)
            
            process_time = time.time() - process_start_time
            total_time = time.time() - start_time
            
            logger.info(f"Semantic search found {len(combined_results)} results with top_k={top_k}")
            logger.info(f"Results processed in {process_time:.3f}s")
            logger.info(f"Total semantic search time: {total_time:.3f}s")
            
            # Log top results
            if combined_results:
                logger.info("Top results:")
                for i, result in enumerate(combined_results[:3], 1):
                    score = result.get('similarity_score', 0)
                    text_preview = result.get('text_content', '')[:50] + '...' if result.get('text_content') else 'No content'
                    logger.info(f"  {i}. Score: {score:.4f} - {text_preview}")
            
            return combined_results
            
        except Exception as e:
            error_msg = f"Error in semantic search: {str(e)}"
            if ANSI_ENABLED:
                logger.error(f"{COLORS['RED']}{error_msg}{COLORS['RESET']}")
            else:
                logger.error(f"{error_msg}")
            logger.warning("Falling back to keyword search")
            
            # Rollback the transaction to prevent "transaction is aborted" errors
            db.session.rollback()
            
            # Fall back to keyword search if there's an error
            logger.info("Executing fallback full-text search")
            return cls._full_text_search(
                knowledge_id=knowledge_id,
                query=query,
                top_k=top_k,
                score_threshold=score_threshold,
                document_ids_filter=document_ids_filter
            )

    @classmethod
    @log_execution_time(logger)
    def _hybrid_search(
        cls,
        knowledge_id: str,
        query: str,
        top_k: int = 5,
        score_threshold: float = 0.0,
        document_ids_filter: Optional[List[str]] = None
    ) -> List[DocumentVector]:
        """
        Perform a hybrid search combining keyword and semantic search.
        
        This method:
        1. Runs both keyword and semantic searches
        2. Combines and re-ranks the results
        3. Returns the top-k results
        """
        # Create a unique process ID for this search operation
        process_id = get_process_id()
        logger.info(f"Starting hybrid search [Process: {process_id}]")
        start_time = time.time()
        
        query_preview = query[:50] + '...' if len(query) > 50 else query
        logger.info(f"Hybrid search query: '{query_preview}' with top_k={top_k}")
        
        try:
            # Get results from both search methods
            # Use top_k * 2 to get more candidates for re-ranking
            logger.info("Running keyword search component...")
            keyword_start_time = time.time()
            keyword_results = cls._full_text_search(
                knowledge_id=knowledge_id,
                query=query,
                top_k=top_k * 2,  # Get more results for better hybrid ranking
                score_threshold=score_threshold,
                document_ids_filter=document_ids_filter
            )
            keyword_time = time.time() - keyword_start_time
            logger.info(f"Keyword search returned {len(keyword_results)} results in {keyword_time:.3f}s")
            
            logger.info("Running semantic search component...")
            semantic_start_time = time.time()
            semantic_results = cls._semantic_search(
                knowledge_id=knowledge_id,
                query=query,
                top_k=top_k * 2,  # Get more results for better hybrid ranking
                score_threshold=score_threshold,
                document_ids_filter=document_ids_filter
            )
            semantic_time = time.time() - semantic_start_time
            logger.info(f"Semantic search returned {len(semantic_results)} results in {semantic_time:.3f}s")
            
            # Create a dictionary to track unique results by UUID
            logger.info("Combining and re-ranking results...")
            combine_start_time = time.time()
            combined_dict = {}
            
            # Add keyword results with their scores
            logger.info(f"Processing {len(keyword_results)} keyword results")
            for result in keyword_results:
                uuid = result['uuid']
                combined_dict[uuid] = {
                    'data': result,
                    'keyword_score': result.get('similarity_score', 0.0),
                    'semantic_score': 0.0,  # Default if not found in semantic results
                    'combined_score': 0.0    # Will calculate after combining
                }
            
            # Add or update with semantic results
            logger.info(f"Processing {len(semantic_results)} semantic results")
            for result in semantic_results:
                uuid = result['uuid']
                if uuid in combined_dict:
                    # Update existing entry with semantic score
                    combined_dict[uuid]['semantic_score'] = result.get('similarity_score', 0.0)
                    # Keep the original data from keyword search
                else:
                    # Add new entry from semantic search
                    combined_dict[uuid] = {
                        'data': result,
                        'keyword_score': 0.0,  # Default if not found in keyword results
                        'semantic_score': result.get('similarity_score', 0.0),
                        'combined_score': 0.0  # Will calculate after combining
                    }
            
            # Calculate combined scores (weighted average of keyword and semantic scores)
            # Adjust these weights based on your preference
            keyword_weight = 0.4
            semantic_weight = 0.6
            
            logger.info(f"Calculating combined scores with weights: keyword={keyword_weight}, semantic={semantic_weight}")
            for uuid, item in combined_dict.items():
                item['combined_score'] = (
                    item['keyword_score'] * keyword_weight + 
                    item['semantic_score'] * semantic_weight
                )
                # Update the similarity_score in the result data
                item['data']['similarity_score'] = item['combined_score']
            
            # Sort by combined score and take top_k
            sorted_results = sorted(
                [item['data'] for item in combined_dict.values()],
                key=lambda x: x['similarity_score'],
                reverse=True
            )[:top_k]
            
            combine_time = time.time() - combine_start_time
            total_time = time.time() - start_time
            
            logger.info(f"Final results after combining and re-ranking: {len(sorted_results)} results")
            logger.info(f"Combination and re-ranking completed in {combine_time:.3f}s")
            logger.info(f"Total hybrid search time: {total_time:.3f}s")
            
            # Log top results
            if sorted_results:
                logger.info("Top results:")
                for i, result in enumerate(sorted_results[:3], 1):
                    score = result.get('similarity_score', 0)
                    text_preview = result.get('text_content', '')[:50] + '...' if result.get('text_content') else 'No content'
                    logger.info(f"  {i}. Score: {score:.4f} - {text_preview}")
            
            # Create completion banner with Windows compatibility
            if ANSI_ENABLED:
                completion_banner = f"{COLORS['GREEN']}{COLORS['BOLD']}" \
                        f"HYBRID SEARCH COMPLETED [PROCESS: {process_id}]\n" \
                        f"RESULTS: {len(sorted_results)} | TIME: {total_time:.3f}s{COLORS['RESET']}"
            else:
                completion_banner = f"HYBRID SEARCH COMPLETED [PROCESS: {process_id}]\n" \
                        f"RESULTS: {len(sorted_results)} | TIME: {total_time:.3f}s"
            logger.info(completion_banner)
            
            return sorted_results
            
        except Exception as e:
            error_msg = f"Error in hybrid search: {str(e)}"
            if ANSI_ENABLED:
                logger.error(f"{COLORS['RED']}{error_msg}{COLORS['RESET']}")
            else:
                logger.error(f"{error_msg}")
            logger.warning("Falling back to full-text search")
            
            # Rollback the transaction to prevent "transaction is aborted" errors
            db.session.rollback()
            
            # Create error banner with Windows compatibility
            if ANSI_ENABLED:
                error_banner = f"{COLORS['RED']}{COLORS['BOLD']}" \
                        f"HYBRID SEARCH FAILED [PROCESS: {process_id}]\n" \
                        f"ERROR: {str(e)}{COLORS['RESET']}"
            else:
                error_banner = f"HYBRID SEARCH FAILED [PROCESS: {process_id}]\n" \
                        f"ERROR: {str(e)}"
            logger.error(error_banner)
            
            # Fall back to full-text search if there's an error
            logger.info("Executing fallback full-text search")
            return cls._full_text_search(
                knowledge_id=knowledge_id,
                query=query,
                top_k=top_k,
                score_threshold=score_threshold,
                document_ids_filter=document_ids_filter
            )

    @staticmethod
    @log_execution_time(logger)
    def _prepare_search_terms(query: str) -> List[str]:
        """
        Prepare search terms from the query string.
        
        Args:
            query: The search query string
            
        Returns:
            List of cleaned search terms
        """
        logger.debug(f"Preparing search terms from query: '{query}'")
        
        if not query:
            logger.warning("Empty query provided, returning empty search terms")
            return []
            
        # Basic cleaning - remove special characters and split into terms
        import re
        
        # First, add the complete query as a term for exact phrase matching
        terms = [query.strip()]
        logger.debug(f"Added complete query as search term: '{query.strip()}'")
        
        # Then add individual words as terms
        individual_terms = re.split(r'\s+', query.strip())
        individual_terms = [term.lower() for term in individual_terms if len(term) > 2]
        
        # Add individual terms to the list
        terms.extend(individual_terms)
        
        logger.debug(f"Generated {len(terms)} search terms: {terms}")
        return terms