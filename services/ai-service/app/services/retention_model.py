import math
from typing import Dict, Any, List

class RetentionModel:
    def predict_retention(self, last_review_days: int, difficulty: float, interaction_history: List[Dict[str, Any]] = []) -> float:
        """
        Predict probability of recall based on forgetting curve.
        Using a simplified Ebbinghaus Forgetting Curve modification.
        R = e^(-t/S) where S is stability (memory strength).
        """
        
        # Calculate Stability (S) based on history
        # Base stability depends on difficulty (1-5, higher is harder) and previous successes
        stability = 1.0
        
        if not interaction_history:
            # First time: stability depends purely on difficulty
            stability = max(0.5, 5.0 - difficulty) 
        else:
            # Simple spacing effect simulation
            successes = sum(1 for h in interaction_history if h.get('result') == 'success')
            stability = (5.0 - difficulty) + (successes * 1.5)
            
        # Time elapsed (t)
        t = last_review_days
        
        # Retention (R)
        retention = math.exp(-t / stability)
        
        # Cap at 1.0, min 0.0
        return max(0.0, min(1.0, retention))

retention_model = RetentionModel()
