from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from ml_models.psych_state import PsychStateAnalyzer

router = APIRouter()
analyzer = PsychStateAnalyzer()

class ActivityLog(BaseModel):
    type: str # APP_SWITCH, USAGE, NOTIFICATION
    duration: float = 0.0
    category: Optional[str] = None
    timestamp: str

class AnalysisRequest(BaseModel):
    userId: str
    activities: List[Dict[str, Any]] # Flexible dict to accommodate raw logs

class AnalysisResponse(BaseModel):
    userId: str
    stress_score: float
    focus_capacity: float
    indicators: Dict[str, bool]

@router.post("/analyze-state", response_model=AnalysisResponse)
async def analyze_psychological_state(request: AnalysisRequest):
    try:
        result = analyzer.analyze(request.activities)
        return {
            "userId": request.userId,
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
