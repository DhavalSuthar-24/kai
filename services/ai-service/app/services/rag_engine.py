from typing import List, Dict, Any
from app.services.embedding import embedding_service
from app.core.gemini_client import get_gemini_client
from app.core.logging import get_logger
import numpy as np

logger = get_logger(__name__)

class RagEngine:
    """Retrieval-Augmented Generation engine using real embeddings and Gemini"""
    
    def __init__(self):
        self.gemini = get_gemini_client()
    
    async def answer_query(
        self, 
        query: str, 
        context_chunks: List[str]
    ) -> Dict[str, Any]:
        """
        Answer a query using RAG with real AI
        
        Args:
            query: User's question
            context_chunks: Retrieved context from documents
            
        Returns:
            Answer with related topics and suggested questions
        """
        
        if not context_chunks:
            return {
                "answer": "I don't have enough context to answer this question.",
                "related_topics": [],
                "suggested_questions": []
            }
        
        # 1. Rank context chunks by relevance
        ranked_chunks = await self._rank_chunks(query, context_chunks)
        
        # 2. Prepare context (use top 3 most relevant chunks)
        top_chunks = ranked_chunks[:3]
        context_text = "\n\n---\n\n".join(top_chunks)
        
        # 3. Generate answer using Gemini
        prompt = f"""You are a helpful tutor answering a student's question based on their study material.

Context from documents:
{context_text}

Student's question: {query}

Instructions:
1. Answer directly and clearly using ONLY the provided context
2. If the context doesn't contain the answer, say so
3. Be concise but thorough
4. Use examples from the context when helpful

Answer:"""
        
        try:
            answer_text = await self.gemini.generate(prompt)
        except Exception as e:
            logger.error(f"Answer generation failed: {str(e)}")
            answer_text = "I'm having trouble generating an answer right now. Please try again."
        
        # 4. Extract related topics from context
        related_topics = await self._extract_topics(context_text)
        
        # 5. Generate follow-up questions
        follow_up = await self._generate_follow_up(query, answer_text)
        
        return {
            "answer": answer_text,
            "related_topics": related_topics,
            "suggested_questions": follow_up,
            "sources_used": len(top_chunks)
        }
    
    async def _rank_chunks(
        self, 
        query: str, 
        chunks: List[str]
    ) -> List[str]:
        """Rank chunks by semantic similarity to query"""
        
        if len(chunks) <= 1:
            return chunks
        
        try:
            # Generate embeddings
            query_embedding = embedding_service.generate_embedding(query)
            chunk_embeddings = embedding_service.generate_batch_embeddings(chunks)
            
            # Calculate cosine similarities
            query_vec = np.array(query_embedding)
            similarities = []
            
            for chunk_emb in chunk_embeddings:
                chunk_vec = np.array(chunk_emb)
                similarity = np.dot(query_vec, chunk_vec) / (
                    np.linalg.norm(query_vec) * np.linalg.norm(chunk_vec)
                )
                similarities.append(similarity)
            
            # Sort chunks by similarity (descending)
            ranked_indices = np.argsort(similarities)[::-1]
            return [chunks[i] for i in ranked_indices]
        except Exception as e:
            logger.error(f"Chunk ranking failed: {str(e)}")
            return chunks  # Return original order as fallback
    
    async def _extract_topics(self, context: str) -> List[str]:
        """Extract key topics from context"""
        
        prompt = f"""Extract 3-5 key topics or concepts from this text.
Return only a JSON array of topic names (strings).

Text:
{context[:1000]}
"""
        
        try:
            topics = await self.gemini.generate_json(prompt)
            if isinstance(topics, list):
                return topics[:5]
            return []
        except Exception as e:
            logger.error(f"Topic extraction failed: {str(e)}")
            return []
    
    async def _generate_follow_up(
        self, 
        original_query: str, 
        answer: str
    ) -> List[str]:
        """Generate relevant follow-up questions"""
        
        prompt = f"""Based on this Q&A, suggest 3 relevant follow-up questions a student might ask.
Return only a JSON array of question strings.

Original question: {original_query}
Answer given: {answer[:500]}
"""
        
        try:
            questions = await self.gemini.generate_json(prompt)
            if isinstance(questions, list):
                return questions[:3]
            return []
        except Exception as e:
            logger.error(f"Follow-up generation failed: {str(e)}")
            return [
                "Can you explain this in more detail?",
                "How does this relate to other concepts?",
                "Can you provide an example?"
            ]

# Global instance
rag_engine = RagEngine()
