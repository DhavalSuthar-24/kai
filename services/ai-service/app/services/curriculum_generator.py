from typing import Dict, Any, List, Optional
from app.core.gemini_client import get_gemini_client
from app.core.logging import get_logger

logger = get_logger(__name__)

class CurriculumGenerator:
    """Generate comprehensive curricula using Gemini AI"""
    
    def __init__(self):
        self.gemini = get_gemini_client()
    
    async def generate_curriculum(
        self, 
        subject: str, 
        exam_name: str, 
        user_level: str
    ) -> Dict[str, Any]:
        """
        Generate a complete curriculum using Gemini AI
        
        Args:
            subject: Subject name (e.g., "Biology", "Mathematics")
            exam_name: Target exam (e.g., "JEE", "NEET", "SAT")
            user_level: User's current level (beginner, intermediate, advanced)
            
        Returns:
            Structured curriculum with modules, topics, and subtopics
        """
        
        prompt = f"""You are an expert curriculum designer. Create a COMPLETE curriculum for:
Subject: {subject}
Exam: {exam_name}
Level: {user_level}

Return a JSON object with this exact structure:
{{
  "modules": [
    {{
      "moduleName": "Module name",
      "order": 1,
      "estimatedHours": 10,
      "importance": "critical|high|medium",
      "topics": [
        {{
          "topicName": "Topic name",
          "order": 1,
          "difficulty": 1-5,
          "prerequisites": [],
          "estimatedTimeMinutes": 60,
          "bloomsLevel": "remember|understand|apply|analyze|evaluate|create",
          "subtopics": [
            {{
              "name": "Subtopic name",
              "keyPoints": ["point1", "point2"],
              "estimatedTimeMinutes": 20
            }}
          ]
        }}
      ]
    }}
  ],
  "totalEstimatedHours": 100,
  "examWeightageCoverage": 100
}}

Make the curriculum comprehensive and aligned with {exam_name} exam requirements.
"""
        
        try:
            curriculum = await self.gemini.generate_json(prompt)
            
            # Validate basic structure
            if not isinstance(curriculum.get('modules'), list):
                raise ValueError("Invalid curriculum structure")
            
            return curriculum
        except Exception as e:
            logger.error(f"Curriculum generation failed: {str(e)}")
            # Return minimal fallback curriculum
            return {
                "modules": [
                    {
                        "moduleName": f"Foundations of {subject}",
                        "order": 1,
                        "estimatedHours": 10,
                        "importance": "critical",
                        "topics": [
                            {
                                "topicName": f"Introduction to {subject}",
                                "order": 1,
                                "difficulty": 1,
                                "prerequisites": [],
                                "estimatedTimeMinutes": 60,
                                "bloomsLevel": "understand",
                                "subtopics": [
                                    {
                                        "name": "Basic Concepts",
                                        "keyPoints": ["Definition", "History", "Scope"],
                                        "estimatedTimeMinutes": 20
                                    }
                                ]
                            }
                        ]
                    }
                ],
                "totalEstimatedHours": 100,
                "examWeightageCoverage": 80
            }
    
    async def generate_questions(
        self,
        topic_ids: List[str],
        difficulty: str,
        count: int
    ) -> Dict[str, Any]:
        """
        Generate practice questions for given topics
        
        Args:
            topic_ids: List of topic identifiers
            difficulty: Question difficulty level
            count: Number of questions to generate
            
        Returns:
            Generated questions with answers and explanations
        """
        
        prompt = f"""Generate {count} practice questions with difficulty level: {difficulty}

Return a JSON object:
{{
  "questions": [
    {{
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct",
      "difficulty": "{difficulty}",
      "estimatedTime": 120
    }}
  ]
}}
"""
        
        try:
            result = await self.gemini.generate_json(prompt)
            return result
        except Exception as e:
            logger.error(f"Question generation failed: {str(e)}")
            return {"questions": []}
    
    async def validate_curriculum(self, curriculum: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Validate curriculum for gaps and issues using Gemini
        
        Args:
            curriculum: Curriculum object to validate
            
        Returns:
            List of validation issues found
        """
        
        prompt = f"""Analyze this curriculum and identify any gaps or issues:

{str(curriculum)[:2000]}

Return a JSON array of issues:
[
  {{
    "type": "missing_prerequisite|time_mismatch|difficulty_jump",
    "severity": "high|medium|low",
    "message": "Description of the issue",
    "suggestion": "How to fix it"
  }}
]

If no issues, return an empty array.
"""
        
        try:
            issues = await self.gemini.generate_json(prompt)
            if isinstance(issues, list):
                return issues
            return []
        except Exception as e:
            logger.error(f"Curriculum validation failed: {str(e)}")
            return []

# Global instance
curriculum_generator = CurriculumGenerator()
