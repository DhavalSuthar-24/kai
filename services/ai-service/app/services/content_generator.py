from typing import Dict, Any, List
from app.core.gemini_client import get_gemini_client
from app.core.logging import get_logger

logger = get_logger(__name__)

class ContentGenerator:
    """Generate educational content using Gemini AI"""
    
    def __init__(self):
        self.gemini = get_gemini_client()
    
    async def generate_theory(
        self, 
        topic_name: str, 
        mastery_level: int
    ) -> Dict[str, Any]:
        """
        Generate theory content for a topic
        
        Args:
            topic_name: Name of the topic
            mastery_level: User's current mastery (1-5)
            
        Returns:
            Structured theory content
        """
        
        difficulty_map = {
            1: "beginner-friendly with basic examples",
            2: "intermediate with some technical details",
            3: "advanced with in-depth explanations",
            4: "expert-level with complex concepts",
            5: "mastery-level with cutting-edge insights"
        }
        
        difficulty_desc = difficulty_map.get(mastery_level, "intermediate")
        
        prompt = f"""Create educational content about: {topic_name}
Level: {difficulty_desc}

Return a JSON object with this structure:
{{
  "title": "Topic title",
  "introduction": "Engaging introduction paragraph",
  "keyPoints": [
    {{
      "point": "Main concept name",
      "explanation": "Detailed explanation with examples"
    }}
  ],
  "summary": "Concise summary of key takeaways",
  "practiceHints": ["Hint 1", "Hint 2"]
}}

Make it educational, clear, and appropriate for the mastery level.
"""
        
        try:
            content = await self.gemini.generate_json(prompt)
            return content
        except Exception as e:
            logger.error(f"Theory generation failed: {str(e)}")
            return {
                "title": topic_name,
                "introduction": f"Introduction to {topic_name}",
                "keyPoints": [
                    {
                        "point": "Key Concept",
                        "explanation": "Detailed explanation will be generated."
                    }
                ],
                "summary": "Summary of key concepts",
                "practiceHints": []
            }
    
    async def generate_quiz(
        self, 
        topic_name: str, 
        difficulty: int
    ) -> Dict[str, Any]:
        """
        Generate a quiz question for a topic
        
        Args:
            topic_name: Topic to quiz on
            difficulty: Question difficulty (1-5)
            
        Returns:
            Quiz question with options and explanation
        """
        
        prompt = f"""Generate a quiz question about: {topic_name}
Difficulty level: {difficulty}/5

Return a JSON object:
{{
  "question": "Clear, specific question",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Option A",
  "explanation": "Why this answer is correct",
  "difficulty": {difficulty},
  "bloomsLevel": "remember|understand|apply|analyze|evaluate|create"
}}

Make the question challenging but fair for the difficulty level.
"""
        
        try:
            quiz = await self.gemini.generate_json(prompt)
            return quiz
        except Exception as e:
            logger.error(f"Quiz generation failed: {str(e)}")
            return {
                "question": f"What is a key property of {topic_name}?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": "Option A",
                "explanation": "This is the correct answer because...",
                "difficulty": difficulty,
                "bloomsLevel": "understand"
            }
    
    async def generate_flashcards(
        self, 
        topic_name: str, 
        count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate flashcards for a topic
        
        Args:
            topic_name: Topic to create flashcards for
            count: Number of flashcards to generate
            
        Returns:
            List of flashcard objects
        """
        
        prompt = f"""Generate {count} flashcards for learning: {topic_name}

Return a JSON array:
[
  {{
    "front": "Question or concept to recall",
    "back": "Answer or explanation",
    "difficulty": "easy|medium|hard",
    "tags": ["tag1", "tag2"]
  }}
]

Make flashcards that test understanding and recall.
"""
        
        try:
            flashcards = await self.gemini.generate_json(prompt)
            if isinstance(flashcards, list):
                return flashcards
            return []
        except Exception as e:
            logger.error(f"Flashcard generation failed: {str(e)}")
            return []

# Global instance
content_generator = ContentGenerator()
