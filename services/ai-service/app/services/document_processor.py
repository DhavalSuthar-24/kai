import os
import io
from typing import Dict, Any, List, Optional
from app.core.gemini_client import get_gemini_client
from app.core.logging import get_logger

logger = get_logger(__name__)

# Try to import pypdf, fallback gracefully if not available
try:
    from pypdf import PdfReader
    PDF_SUPPORT = True
except ImportError:
    logger.warning("pypdf not installed, PDF processing will be limited")
    PDF_SUPPORT = False

class DocumentProcessor:
    """Process documents using real AI (Gemini) for structure extraction and analysis"""
    
    def __init__(self):
        self.gemini = get_gemini_client()
    
    async def process_document(
        self, 
        file_path: Optional[str] = None, 
        file_content: Optional[bytes] = None, 
        file_type: str = "txt"
    ) -> Dict[str, Any]:
        """
        Main entry point for document processing with real AI
        
        Args:
            file_path: Path to document file
            file_content: Raw file content as bytes
            file_type: Type of file (txt, pdf, etc.)
            
        Returns:
            Processed document with structure, topics, and analytics
        """
        try:
            # 1. Extract Text
            text = self._extract_text(file_path, file_content, file_type)
            
            if not text or len(text.strip()) < 10:
                raise ValueError("Extracted text is too short or empty")
            
            # 2. Extract Structure using Gemini
            structure = await self._extract_structure(text)
            
            # 3. Extract Topics using Gemini
            topics = await self._extract_topics(text, structure)
            
            # 4. Generate Flashcards using Gemini
            flashcards = await self._generate_flashcards(text, topics)
            
            # 5. Calculate Analytics
            analytics = self._calculate_analytics(text)
            
            return {
                "structure": structure,
                "topics": topics,
                "curriculum": {"modules": []},  # Can be enhanced later
                "flashcards": flashcards,
                "practice_questions": [],  # Can be enhanced later
                "analytics": analytics
            }
        except Exception as e:
            logger.error(f"Document processing failed: {str(e)}")
            raise
    
    def _extract_text(
        self, 
        file_path: Optional[str], 
        content: Optional[bytes], 
        file_type: str
    ) -> str:
        """Extract text from various file formats"""
        
        # Handle PDF files
        if file_type.lower() == 'pdf' and PDF_SUPPORT:
            try:
                if content:
                    pdf_file = io.BytesIO(content)
                elif file_path and os.path.exists(file_path):
                    pdf_file = open(file_path, 'rb')
                else:
                    raise ValueError("No PDF content provided")
                
                reader = PdfReader(pdf_file)
                text_parts = []
                for page in reader.pages:
                    text_parts.append(page.extract_text())
                
                if isinstance(pdf_file, io.IOBase) and hasattr(pdf_file, 'close'):
                    pdf_file.close()
                
                return '\n\n'.join(text_parts)
            except Exception as e:
                logger.error(f"PDF extraction failed: {str(e)}")
                raise
        
        # Handle text content
        if content:
            try:
                return content.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    return content.decode('latin-1')
                except Exception as e:
                    raise ValueError(f"Failed to decode content: {str(e)}")
        
        # Handle file path
        if file_path and os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        
        raise ValueError("No valid content or file path provided")
    
    async def _extract_structure(self, text: str) -> Dict[str, Any]:
        """Extract document structure using Gemini AI"""
        
        # Limit text for API call (first 4000 chars for structure)
        text_sample = text[:4000] if len(text) > 4000 else text
        
        prompt = f"""Analyze this document and extract its hierarchical structure.
Return a JSON object with the following format:
{{
  "documentType": "textbook|article|notes|other",
  "title": "Document title",
  "chapters": [
    {{
      "title": "Chapter title",
      "pageRange": [start, end],
      "sections": [
        {{
          "title": "Section title",
          "summary": "Brief summary",
          "topics": ["topic1", "topic2"]
        }}
      ]
    }}
  ]
}}

Document text:
{text_sample}
"""
        
        try:
            structure = await self.gemini.generate_json(prompt)
            return structure
        except Exception as e:
            logger.error(f"Structure extraction failed: {str(e)}")
            # Fallback to basic structure
            return {
                "documentType": "unknown",
                "title": "Untitled Document",
                "chapters": [{
                    "title": "Main Content",
                    "pageRange": [1, 1],
                    "sections": [{
                        "title": "Content",
                        "summary": text[:200],
                        "topics": []
                    }]
                }]
            }
    
    async def _extract_topics(
        self, 
        text: str, 
        structure: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Extract key topics using Gemini AI"""
        
        text_sample = text[:3000] if len(text) > 3000 else text
        
        prompt = f"""Analyze this document and extract the main topics/concepts.
Return a JSON array of topics with this format:
[
  {{
    "name": "Topic name",
    "difficulty": 1-5,
    "importance": "high|medium|low",
    "description": "Brief description"
  }}
]

Document text:
{text_sample}
"""
        
        try:
            topics = await self.gemini.generate_json(prompt)
            if isinstance(topics, list):
                return topics
            return []
        except Exception as e:
            logger.error(f"Topic extraction failed: {str(e)}")
            return []
    
    async def _generate_flashcards(
        self, 
        text: str, 
        topics: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generate flashcards using Gemini AI"""
        
        if not topics:
            return []
        
        text_sample = text[:2000] if len(text) > 2000 else text
        topics_str = ', '.join([t.get('name', '') for t in topics[:3]])
        
        prompt = f"""Generate 5 flashcards for learning about: {topics_str}

Return a JSON array with this format:
[
  {{
    "front": "Question or concept",
    "back": "Answer or explanation",
    "difficulty": "easy|medium|hard"
  }}
]

Based on this content:
{text_sample}
"""
        
        try:
            flashcards = await self.gemini.generate_json(prompt)
            if isinstance(flashcards, list):
                return flashcards
            return []
        except Exception as e:
            logger.error(f"Flashcard generation failed: {str(e)}")
            return []
    
    def _calculate_analytics(self, text: str) -> Dict[str, Any]:
        """Calculate basic document analytics"""
        words = text.split()
        sentences = text.count('.') + text.count('!') + text.count('?')
        
        # Estimate difficulty based on average word length
        avg_word_length = sum(len(word) for word in words) / len(words) if words else 0
        difficulty_score = min(10, max(1, avg_word_length / 1.5))
        
        return {
            "word_count": len(words),
            "sentence_count": sentences,
            "reading_time": len(words) // 200,  # 200 wpm
            "difficulty_score": round(difficulty_score, 1),
            "avg_word_length": round(avg_word_length, 1)
        }

# Global instance
document_processor = DocumentProcessor()
