from typing import Dict, Any, List
# Mocking classes
class ContentGenerator:
    async def generate_theory(self, topic_name: str, mastery_level: int) -> Dict[str, Any]:
        return {
            "title": topic_name,
            "introduction": f"Introduction to {topic_name}",
            "keyPoints": [
                {"point": "Key Concept 1", "explanation": "Detailed explanation..."},
                {"point": "Key Concept 2", "explanation": "Detailed explanation..."}
            ],
            "summary": "Summary of lesson"
        }

    async def generate_quiz(self, topic_name: str, difficulty: int) -> Dict[str, Any]:
        return {
            "question": f"What is a key property of {topic_name}?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "Option A",
            "explanation": "Because...",
            "difficulty": difficulty,
            "bloomsLevel": "understand"
        }

content_generator = ContentGenerator()
