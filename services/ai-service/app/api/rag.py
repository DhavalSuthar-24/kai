from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

from app.services.rag_engine import rag_engine

router = APIRouter()

class RagQueryRequest(BaseModel):
    query: str
    context_chunks: List[str]

class RagQueryResponse(BaseModel):
    answer: str
    related_topics: List[str]
    suggested_questions: List[str]

@router.post("/rag/answer", response_model=RagQueryResponse)
async def answer_rag_query(request: RagQueryRequest):
    """
    Synthesize an answer using RAG based on provided context chunks.
    """
    try:
        result = await rag_engine.answer_query(
            query=request.query,
            context_chunks=request.context_chunks
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
