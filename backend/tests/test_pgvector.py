"""
Test script for PostgreSQL pgvector integration
"""
import os
import sys
import json
from datetime import datetime

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import KnowledgeBase, Document
from app.models.document_vector import DocumentVector
from app.services.embedding_service import EmbeddingService

def test_pgvector_storage():
    """Test storing and retrieving vectors from PostgreSQL"""
    app = create_app()
    
    with app.app_context():
        # Create a test knowledge base
        kb = KnowledgeBase(
            name="Test Knowledge",
            description="Test KB for pgvector",
            embedding_model="ollama"
        )
        db.session.add(kb)
        db.session.commit()
        
        # Create a test document
        doc = Document(
            filename="test.txt",
            content_type="text/plain",
            content="This is a test document for pgvector",
            knowledge_uuid=kb.uuid
        )
        db.session.add(doc)
        db.session.commit()
        
        # Generate embeddings
        embedding_service = EmbeddingService()
        embeddings = embedding_service.generate_embeddings("This is a test document for pgvector")
        
        # Create document vector
        doc_vector = DocumentVector(
            document_uuid=doc.uuid,
            chunk_index=0,
            total_chunks=1,
            document_type="text/plain",
            text_content="This is a test document for pgvector",
            embedding=embeddings,
            doc_metadata=json.dumps({"filename": "test.txt"})
        )
        db.session.add(doc_vector)
        db.session.commit()
        
        print(f"Created document vector with UUID: {doc_vector.uuid}")
        
        # Test similarity search
        query_embedding = embedding_service.generate_embeddings("test document")
        
        # First, verify that we can retrieve the stored document vector
        from sqlalchemy.sql import text
        
        # Simple query to retrieve the document vector we just created
        sql = text("""
            SELECT 
                dv.uuid, 
                dv.document_uuid,
                dv.text_content,
                d.filename
            FROM 
                document_vectors dv
            JOIN 
                document d ON dv.document_uuid = d.uuid
            WHERE 
                dv.document_uuid = :doc_uuid
        """)
        
        # Execute with simple parameters
        result = db.session.execute(
            sql, 
            {
                "doc_uuid": doc.uuid
            }
        )
        
        print("\nDocument vector retrieval results:")
        for row in result:
            print(f"Document UUID: {row.document_uuid}")
            print(f"Text: {row.text_content}")
            print(f"Filename: {row.filename}")
            print("---")
            
        # Now test similarity search using KnowledgeService
        from app.services.knowledge_service import KnowledgeService
        
        # Initialize the knowledge service
        knowledge_service = KnowledgeService()
        
        # Use the query method to perform a similarity search
        print("\nTesting similarity search using KnowledgeService...")
        search_query = "test document"
        search_results = knowledge_service.query(kb.uuid, search_query, limit=5)
        
        print("\nSimilarity search results:")
        for i, doc_uuid in enumerate(search_results["uuids"]):
            print(f"Document UUID: {doc_uuid}, Similarity: {1.0 - search_results['distances'][i]}")
            print(f"Text: {search_results['documents'][i]}")
            print(f"Metadata: {search_results['metadatas'][i]}")
            print("---")
        
        # Clean up test data
        db.session.delete(doc_vector)
        db.session.delete(doc)
        db.session.delete(kb)
        db.session.commit()
        print("Test data cleaned up")

if __name__ == "__main__":
    test_pgvector_storage()
