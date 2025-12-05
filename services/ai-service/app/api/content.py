from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from app.services.content_generator import content_generator

router = APIRouter()

class TheoryRequest(BaseModel):
    topicName: str
    masteryLevel: int

class QuizRequest(BaseModel):
    topicName: str
    difficulty: int

@router.post("/generate-theory")
async def generate_theory(req: TheoryRequest):
    return await content_generator.generate_theory(req.topicName, req.masteryLevel)

@router.post("/generate-quiz")
async def generate_quiz(req: QuizRequest):
    return await content_generator.generate_quiz(req.topicName, req.difficulty)
