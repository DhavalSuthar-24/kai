from typing import List
from sentence_transformers import SentenceTransformer
from app.core.redis_client import redis_client
from app.core.logging import get_logger
import json
import hashlib

logger = get_logger(__name__)

class EmbeddingService:
    """Generate real embeddings using Sentence Transformers with Redis caching"""
    
    def __init__(self):
        # Use a lightweight, fast model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.dimension = 384  # MiniLM embedding dimension
        self.cache_ttl = 86400  # 24 hours
        logger.info(f"Embedding service initialized with model all-MiniLM-L6-v2 (dim={self.dimension})")
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text with Redis caching
        
        Args:
            text: Input text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for embedding")
            return [0.0] * self.dimension
        
        # Create cache key from text hash
        text_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
        cache_key = f"embedding:{text_hash}"
        
        # Check Redis cache
        try:
            cached = redis_client.get(cache_key)
            if cached:
                logger.debug(f"Cache hit for embedding")
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Redis cache read failed: {str(e)}")
        
        # Generate real embedding
        try:
            embedding = self.model.encode(text, convert_to_numpy=True)
            embedding_list = embedding.tolist()
            
            # Cache the result
            try:
                redis_client.setex(
                    cache_key, 
                    self.cache_ttl, 
                    json.dumps(embedding_list)
                )
                logger.debug(f"Cached embedding for 24 hours")
            except Exception as e:
                logger.warning(f"Redis cache write failed: {str(e)}")
            
            return embedding_list
        except Exception as e:
            logger.error(f"Embedding generation failed: {str(e)}")
            # Return zero vector as fallback
            return [0.0] * self.dimension
    
    def generate_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        try:
            embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
            return [emb.tolist() for emb in embeddings]
        except Exception as e:
            logger.error(f"Batch embedding generation failed: {str(e)}")
            return [[0.0] * self.dimension for _ in texts]
    
    def get_dimension(self) -> int:
        """Get the dimension of the embedding vectors"""
        return self.dimension

# Global instance
embedding_service = EmbeddingService()
