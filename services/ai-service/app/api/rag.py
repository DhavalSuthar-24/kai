from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.rag_engine import rag_engine
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

class QueryRequest(BaseModel):
    query: str
    userId: str
    topicId: Optional[str] = None
    maxResults: int = 5

class Source(BaseModel):
    content: str
    relevance: float
    metadata: dict

class QueryResponse(BaseModel):
    answer: str
    sources: List[Source]
    confidence: float

class AddDocumentRequest(BaseModel):
    userId: str
    topicId: str
    content: str
    metadata: Optional[dict] = None

class AddDocumentResponse(BaseModel):
    documentId: str
    indexed: bool

@router.post("/query", response_model=QueryResponse)
async def query_knowledge(request: QueryRequest):
    """Query the RAG system for answers"""
    try:
        result = await rag_engine.query(
            query=request.query,
            user_id=request.userId,
            topic_id=request.topicId,
            max_results=request.maxResults
        )
        
        sources = []
        for src in result.get('sources', []):
            sources.append(Source(
                content=src.get('content', ''),
                relevance=src.get('relevance', 0.0),
                metadata=src.get('metadata', {})
            ))
        
        return QueryResponse(
            answer=result.get('answer', 'I could not find relevant information.'),
            sources=sources,
            confidence=result.get('confidence', 0.0)
        )
    
    except Exception as e:
        logger.error(f"RAG query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/add-document", response_model=AddDocumentResponse)
async def add_document(request: AddDocumentRequest):
    """Add a document to the RAG knowledge base"""
    try:
        doc_id = await rag_engine.add_document(
            user_id=request.userId,
            topic_id=request.topicId,
            content=request.content,
            metadata=request.metadata or {}
        )
        
        return AddDocumentResponse(
            documentId=doc_id,
            indexed=True
        )
    
    except Exception as e:
        logger.error(f"Document indexing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
