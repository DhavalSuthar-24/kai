from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.core.gemini_client import get_gemini_client
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

class GenerateQuestionsRequest(BaseModel):
    topicIds: List[str]
    difficulty: int  # 1-5
    count: int = 10

class Question(BaseModel):
    question: str
    options: List[str]
    correctAnswer: int
    explanation: str
    difficulty: int

class GenerateQuestionsResponse(BaseModel):
    questions: List[Question]

class GenerateCurriculumRequest(BaseModel):
    topicName: str
    userLevel: int = 1
    duration: int = 30  # days

class CurriculumModule(BaseModel):
    title: str
    description: str
    duration: int  # days
    topics: List[str]

class GenerateCurriculumResponse(BaseModel):
    modules: List[CurriculumModule]
    totalDuration: int

@router.post("/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_questions(request: GenerateQuestionsRequest):
    """Generate quiz questions for given topics"""
    try:
        gemini = get_gemini_client()
        
        # Map difficulty to descriptive level
        difficulty_map = {
            1: "beginner (basic recall)",
            2: "easy (simple application)",
            3: "medium (analysis)",
            4: "hard (synthesis)",
            5: "expert (evaluation)"
        }
        
        difficulty_desc = difficulty_map.get(request.difficulty, "medium")
        
        prompt = f"""Generate {request.count} multiple-choice questions at {difficulty_desc} level.

Requirements:
- Each question should have 4 options
- Mark the correct answer (0-3 index)
- Provide a brief explanation
- Questions should test understanding, not just memorization

Return JSON format:
{{
  "questions": [
    {{
      "question": "What is...?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "...",
      "difficulty": {request.difficulty}
    }}
  ]
}}
"""
        
        result = await gemini.generate_json(prompt)
        questions = result.get('questions', [])
        
        # Validate and format questions
        formatted_questions = []
        for q in questions[:request.count]:
            formatted_questions.append(Question(
                question=q.get('question', ''),
                options=q.get('options', [])[:4],
                correctAnswer=q.get('correctAnswer', 0),
                explanation=q.get('explanation', ''),
                difficulty=request.difficulty
            ))
        
        return GenerateQuestionsResponse(questions=formatted_questions)
    
    except Exception as e:
        logger.error(f"Question generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-curriculum", response_model=GenerateCurriculumResponse)
async def generate_curriculum(request: GenerateCurriculumRequest):
    """Generate a learning curriculum for a topic"""
    try:
        gemini = get_gemini_client()
        
        prompt = f"""Create a {request.duration}-day learning curriculum for: {request.topicName}

User level: {request.userLevel}/5
Duration: {request.duration} days

Structure the curriculum into modules with:
- Clear progression from basics to advanced
- Realistic time estimates
- Specific topics to cover
- Logical learning sequence

Return JSON format:
{{
  "modules": [
    {{
      "title": "Module 1: Fundamentals",
      "description": "...",
      "duration": 7,
      "topics": ["Topic 1", "Topic 2"]
    }}
  ],
  "totalDuration": {request.duration}
}}
"""
        
        result = await gemini.generate_json(prompt)
        modules_data = result.get('modules', [])
        
        modules = []
        total_duration = 0
        
        for m in modules_data:
            duration = m.get('duration', 7)
            total_duration += duration
            
            modules.append(CurriculumModule(
                title=m.get('title', ''),
                description=m.get('description', ''),
                duration=duration,
                topics=m.get('topics', [])
            ))
        
        return GenerateCurriculumResponse(
            modules=modules,
            totalDuration=total_duration
        )
    
    except Exception as e:
        logger.error(f"Curriculum generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
