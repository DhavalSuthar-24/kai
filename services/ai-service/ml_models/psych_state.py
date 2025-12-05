from sklearn.ensemble import RandomForestClassifier
import numpy as np
import os
import joblib
from typing import Dict, Any, List

class PsychStateAnalyzer:
    def __init__(self, model_path: str = "psych_model.joblib"):
        # Features: [app_switch_freq, variance, escape_app_usage, typing_speed, notification_freq]
        self.model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
        self.is_trained = False
        
        if os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                self.is_trained = True
                print(f"Loaded Psych model from {model_path}")
            except Exception as e:
                print(f"Failed to load Psych model: {e}")
        else:
            # Mock training for initialization
            print("Initializing mock Psych model behavior")
            X_dummy = np.random.rand(10, 5)
            y_dummy = np.random.randint(0, 11, 10) # 0-10 stress score
            self.model.fit(X_dummy, y_dummy)
            self.is_trained = True

    def calculate_metrics(self, activities: List[Dict[str, Any]]) -> List[float]:
        """
        Derive the 5 input features from raw activity logs (last 3 hours).
        """
        if not activities:
            return [0.0] * 5
            
        # Mock calculation logic
        # 1. App Switching Frequency
        switches = sum(1 for a in activities if a.get('type') == 'APP_SWITCH')
        freq = switches / 3.0 # per hour
        
        # 2. Variance (mock)
        durations = [a.get('duration', 0) for a in activities]
        variance = np.var(durations) if durations else 0
        
        # 3. Escape usage
        escape_time = sum(a.get('duration', 0) for a in activities if a.get('category') in ['SOCIAL', 'GAME'])
        
        # 4. Typing speed (mock - usually from separate sensor)
        typing = 0.5 
        
        # 5. Notification freq
        notifs = sum(1 for a in activities if a.get('type') == 'NOTIFICATION')
        
        return [freq, variance, escape_time, typing, notifs]

    def analyze(self, recent_activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Predict stress level and focus capacity.
        """
        features = self.calculate_metrics(recent_activities)
        features_reshaped = np.array(features).reshape(1, -1)
        
        # Predict Stress Score (0-10)
        # Using classifier probability as a proxy or regression if model was regressor.
        # Here we use the dummy classification output directly.
        stress_score = self.model.predict(features_reshaped)[0]
        
        # Heuristic for Focus Capacity (inverse of stress + variance factor)
        # 0-100 scale
        focus_capacity = max(0, 100 - (stress_score * 10) - (features[0] * 2))
        
        return {
            "stress_score": float(stress_score),
            "focus_capacity": float(focus_capacity),
            "indicators": {
                "high_switching": features[0] > 10,
                "escape_behavior": features[2] > 1800 # > 30 mins
            }
        }
