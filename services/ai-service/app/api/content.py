from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from app.services.content_generator import content_generator
from app.core.gemini_client import get_gemini_client
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

class TheoryRequest(BaseModel):
    topicName: str
    masteryLevel: int

class QuizRequest(BaseModel):
    topicName: str
    difficulty: int

class CategorizeRequest(BaseModel):
    content: str
    includeKeywords: bool = True

class CategorizeResponse(BaseModel):
    category: str
    summary: str
    suggestedTopic: str
    confidence: float
    keywords: List[str]

class GenerateCaptionRequest(BaseModel):
    achievement: str
    context: str
    prompt: Optional[str] = None

class GenerateCaptionResponse(BaseModel):
    caption: str

@router.post("/generate-theory")
async def generate_theory(req: TheoryRequest):
    return await content_generator.generate_theory(req.topicName, req.masteryLevel)

@router.post("/generate-quiz")
async def generate_quiz(req: QuizRequest):
    return await content_generator.generate_quiz(req.topicName, req.difficulty)

@router.post("/categorize", response_model=CategorizeResponse)
async def categorize_content(request: CategorizeRequest):
    """Categorize and summarize content using AI"""
    try:
        gemini = get_gemini_client()
        
        prompt = f"""Analyze this content and provide:
1. A category (e.g., Programming, Mathematics, Science, Language, etc.)
2. A brief summary (max 100 characters)
3. A suggested topic name for learning
4. Your confidence level (0.0 to 1.0)
5. 5 key keywords

Content:
{request.content[:1000]}

Return JSON format:
{{
  "category": "...",
  "summary": "...",
  "suggestedTopic": "...",
  "confidence": 0.0,
  "keywords": ["...", "..."]
}}
"""
        
        result = await gemini.generate_json(prompt)
        
        return CategorizeResponse(
            category=result.get('category', 'General'),
            summary=result.get('summary', request.content[:100]),
            suggestedTopic=result.get('suggestedTopic', 'General Topic'),
            confidence=result.get('confidence', 0.7),
            keywords=result.get('keywords', [])
        )
    except Exception as e:
        logger.error(f"Categorization failed: {str(e)}")
        return CategorizeResponse(
            category='General',
            summary=request.content[:100],
            suggestedTopic='General Topic',
            confidence=0.5,
            keywords=[]
        )

@router.post("/generate-caption", response_model=GenerateCaptionResponse)
async def generate_caption(request: GenerateCaptionRequest):
    """Generate social media caption for achievements"""
    try:
        gemini = get_gemini_client()
        
        prompt = request.prompt or f"""Generate an engaging social media caption for:
Achievement: {request.achievement}
Context: {request.context}

Make it humble-brag, encouraging, not arrogant. Include emojis.
Return only the caption text, no JSON."""
        
        caption = await gemini.generate(prompt)
        
        return GenerateCaptionResponse(caption=caption.strip())
    except Exception as e:
        logger.error(f"Caption generation failed: {str(e)}")
        return GenerateCaptionResponse(
            caption=f"Just achieved {request.achievement}! 🎯 #Learning"
        )

