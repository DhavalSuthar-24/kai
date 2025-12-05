from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from app.services.curriculum_generator import curriculum_generator

router = APIRouter()

class CurriculumRequest(BaseModel):
    subject: str
    examName: Optional[str] = "General"
    userLevel: str

class CurriculumResponse(BaseModel):
    curriculum: Dict[str, Any]
    validation_issues: List[Dict[str, Any]]

@router.post("/generate", response_model=CurriculumResponse)
async def generate_curriculum(request: CurriculumRequest):
    try:
        curriculum = await curriculum_generator.generate_curriculum(
            request.subject, 
            request.examName, 
            request.userLevel
        )
        
        issues = await curriculum_generator.validate_curriculum(curriculum)
        
        return {
            "curriculum": curriculum,
            "validation_issues": issues
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
