import torch
import torch.nn as nn
import numpy as np
import os
from typing import List, Dict, Any

class LSTMDoomscrollModel(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size):
        super(LSTMDoomscrollModel, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return self.sigmoid(out)

class DoomscrollDetector:
    def __init__(self, model_path: str = "model.pth"):
        self.input_features = [
            'time_of_day_encoded',
            'app_category_encoded',
            'previous_session_duration',
            'scroll_velocity',
            'interaction_rate',
            'battery_level',
            'day_of_week'
        ]
        self.input_size = len(self.input_features)
        self.hidden_size = 64
        self.num_layers = 2
        self.output_size = 1
        
        self.model = LSTMDoomscrollModel(self.input_size, self.hidden_size, self.num_layers, self.output_size)
        self.model.eval()
        
        # Load model if exists, otherwise stay initialized with random weights (Mock behavior)
        if os.path.exists(model_path):
            try:
                self.model.load_state_dict(torch.load(model_path))
                print(f"Loaded model from {model_path}")
            except Exception as e:
                print(f"Failed to load model: {e}")
        else:
            print("No model found, using initialized weights (Mock/Heuristic mode)")

    def engineer_features(self, session_window: List[Dict[str, Any]]) -> torch.Tensor:
        """
        Transform raw session data into tensor input for LSTM.
        Window size should be fixed (e.g., 10 sessions).
        """
        features_list = []
        for session in session_window:
            # Simple encoding logic for demo
            # Time of day: Morning=0, Afternoon=1, Evening=2, Night=3
            tod_map = {'MORNING': 0.0, 'AFTERNOON': 0.25, 'EVENING': 0.5, 'NIGHT': 0.75}
            tod = session.get('timeOfDay', 'MORNING')
            
            # App Category (simplified hash)
            app_hash = (hash(session.get('appPackageName', '')) % 10) / 10.0
            
            feat = [
                tod_map.get(tod, 0.0), # time_of_day_encoded
                app_hash,              # app_category_encoded
                float(session.get('sessionDuration', 0)) / 60000.0, # duration (mins)
                float(session.get('scrollDistance', 0)) / 1000.0,   # velocity approx
                float(session.get('interactionCount', 0)),          # interaction rate
                float(session.get('batteryLevel', 100)) / 100.0,    # battery
                1.0 if session.get('dayType') == 'WEEKEND' else 0.0 # day_of_week
            ]
            features_list.append(feat)
            
        # Pad if less than 10
        while len(features_list) < 10:
            features_list.append([0.0] * self.input_size)
            
        return torch.tensor([features_list], dtype=torch.float32)

    def predict(self, session_window: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Predict probability of doomscrolling.
        """
        if not session_window:
            return {'risk_level': 'LOW', 'probability': 0.0}

        with torch.no_grad():
            features = self.engineer_features(session_window)
            prediction = self.model(features).item()
            
        risk_level = 'LOW'
        if prediction > 0.8:
            risk_level = 'CRITICAL'
        elif prediction > 0.6:
            risk_level = 'HIGH'
        elif prediction > 0.4:
            risk_level = 'MEDIUM'
            
        return {
            'risk_level': risk_level,
            'probability': prediction,
            'intervention_urgency': 'IMMEDIATE' if risk_level in ['HIGH', 'CRITICAL'] else 'NONE'
        }
