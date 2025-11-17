import os
import time
import requests
import numpy as np
from ..utils.logging_utils import setup_logger, log_execution_time, get_request_id, get_process_id, set_process_id, create_process_banner, COLORS

# Configure logger
logger = setup_logger('embedding_service')

class EmbeddingService:
    def __init__(self):
        self.request_id = get_request_id()
        logger.info(f"Initializing EmbeddingService with request_id={self.request_id}")
        
        self.base_url = os.getenv('OLLAMA_BASE_URL', 'http://100.106.220.16:11434')
        logger.info(f"Using Ollama base URL: {self.base_url}")
        
        # Use nomic-embed-text for embeddings as it's specifically designed for this purpose
        self.model = os.getenv('DEFAULT_EMBEDDING_MODEL', 'nomic-embed-text')
        logger.info(f"Using embedding model: {self.model}")
    
    @log_execution_time(logger)
    def generate_embeddings(self, text):
        """Generate embeddings for a given text"""
        process_id = get_process_id()
        text_preview = text[:50] + '...' if len(text) > 50 else text
        logger.info(f"Generating embeddings for text: '{text_preview}' [Process: {process_id}]")
        
        start_time = time.time()
        try:
            logger.debug(f"Sending request to {self.base_url}/api/embeddings with model {self.model}")
            response = requests.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.model, "prompt": text}
            )
            
            request_time = time.time() - start_time
            logger.info(f"Embedding request completed in {request_time:.3f}s with status code {response.status_code}")
            
            if response.status_code == 200:
                embedding = response.json()["embedding"]
                embedding_size = len(embedding)
                logger.info(f"Successfully generated embedding with {embedding_size} dimensions")
                return embedding
            else:
                error_msg = f"Failed to generate embeddings: {response.text}"
                logger.error(f"{COLORS['RED']}{error_msg}{COLORS['RESET']}")
                raise Exception(error_msg)
                
        except Exception as e:
            error_msg = f"Error generating embeddings: {str(e)}"
            logger.error(f"{COLORS['RED']}{error_msg}{COLORS['RESET']}")
            raise
    
    @log_execution_time(logger)
    def generate_embeddings_batch(self, texts):
        """Generate embeddings for a list of texts"""
        process_id = get_process_id()
        create_process_banner(logger, "BATCH EMBEDDING GENERATION STARTED", process_id)
        
        batch_size = len(texts)
        logger.info(f"Generating embeddings for batch of {batch_size} texts")
        
        embeddings = []
        start_time = time.time()
        success_count = 0
        failure_count = 0
        
        for i, text in enumerate(texts):
            try:
                logger.info(f"Processing text {i+1}/{batch_size}")
                embedding = self.generate_embeddings(text)
                embeddings.append(embedding)
                success_count += 1
            except Exception as e:
                logger.error(f"{COLORS['RED']}Failed to generate embedding for text {i+1}: {str(e)}{COLORS['RESET']}")
                # Append None or empty vector to maintain index alignment
                embeddings.append(None)
                failure_count += 1
        
        total_time = time.time() - start_time
        avg_time = total_time / batch_size if batch_size > 0 else 0
        
        # Create completion banner
        completion_banner = f"{COLORS['GREEN']}{COLORS['BOLD']}" \
                f"BATCH EMBEDDING GENERATION COMPLETED [PROCESS: {process_id}]\n" \
                f"RESULTS: {success_count} succeeded, {failure_count} failed, {batch_size} total\n" \
                f"TIME: {total_time:.3f}s total, {avg_time:.3f}s per text{COLORS['RESET']}"
        logger.info(completion_banner)
        
        return embeddings
