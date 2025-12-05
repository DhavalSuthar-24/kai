from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.document_processor import document_processor
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

class ProcessDocumentResponse(BaseModel):
    structure: dict
    topics: List[dict]
    flashcards: List[dict]
    analytics: dict

class GenerateFlashcardsRequest(BaseModel):
    content: str
    topicName: str
    count: int = 5

class GenerateFlashcardsResponse(BaseModel):
    flashcards: List[dict]

@router.post("/process", response_model=ProcessDocumentResponse)
async def process_document(file: UploadFile = File(...)):
    """Process uploaded document and extract structure, topics, and flashcards"""
    try:
        # Read file content
        content = await file.read()
        
        # Determine file type
        file_type = 'pdf' if file.filename.endswith('.pdf') else 'txt'
        
        # Process document
        result = await document_processor.process_document(
            file_content=content,
            file_type=file_type
        )
        
        return ProcessDocumentResponse(**result)
    except Exception as e:
        logger.error(f"Document processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-flashcards", response_model=GenerateFlashcardsResponse)
async def generate_flashcards(request: GenerateFlashcardsRequest):
    """Generate flashcards from content"""
    try:
        from app.core.gemini_client import get_gemini_client
        
        gemini = get_gemini_client()
        
        prompt = f"""Generate {request.count} flashcards for learning about: {request.topicName}

Content:
{request.content[:2000]}

Create flashcards that:
1. Focus on key concepts and definitions
2. Are clear and concise
3. Test understanding, not just memorization

Return JSON format:
{{
  "flashcards": [
    {{"front": "Question or term", "back": "Answer or definition"}},
    ...
  ]
}}
"""
        
        result = await gemini.generate_json(prompt)
        flashcards = result.get('flashcards', [])
        
        # Ensure we have the right structure
        if not flashcards:
            flashcards = []
        
        return GenerateFlashcardsResponse(flashcards=flashcards)
    except Exception as e:
        logger.error(f"Flashcard generation failed: {str(e)}")
        # Return empty list on error
        return GenerateFlashcardsResponse(flashcards=[])
