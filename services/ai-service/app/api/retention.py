from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.retention_model import retention_model

router = APIRouter()

class RetentionPredictionRequest(BaseModel):
    last_review_days: int
    difficulty: float
    history: List[Dict[str, Any]] = []

class RetentionPredictionResponse(BaseModel):
    probability: float
    recommended_interval: int # Days until next review

@router.post("/predict/retention", response_model=RetentionPredictionResponse)
async def predict_retention(request: RetentionPredictionRequest):
    """
    Predict memory retention probability and optimal review interval.
    """
    try:
        probability = retention_model.predict_retention(
            request.last_review_days,
            request.difficulty,
            request.history
        )
        
        # Calculate optimal interval: When probability drops to 0.9 (90% retention)
        # R = e^(-t/S) => 0.9 = e^(-t/S) => ln(0.9) = -t/S => t = -ln(0.9) * S
        # We need S (stability) again.
        
        # Re-calc stability (duplicate logic, ideally refactor model to return both)
        difficulty = request.difficulty
        interaction_history = request.history
        stability = 1.0
        if not interaction_history:
             stability = max(0.5, 5.0 - difficulty) 
        else:
            successes = sum(1 for h in interaction_history if h.get('result') == 'success')
            stability = (5.0 - difficulty) + (successes * 1.5)
            
        target_retention = 0.9
        import math
        optimal_interval = -math.log(target_retention) * stability
        
        return {
            "probability": probability,
            "recommended_interval": max(1, int(optimal_interval))
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
