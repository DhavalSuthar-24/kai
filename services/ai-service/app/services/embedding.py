from typing import List

class EmbeddingService:
    async def generate_embedding(self, text: str) -> List[float]:
        # Mock embedding generation
        # In real app: call Google/OpenAI embedding API
        # Returning a random vector of size 1536 (standard for many models) or small for test
        
        # Simulating a 1536-dim vector with mock data
        # Real implementation:
        # response = await text_embedding_model.embed_content(text)
        # return response.embedding
        
        return [0.1] * 1536 

embedding_service = EmbeddingService()
