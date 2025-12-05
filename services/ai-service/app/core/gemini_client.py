import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
from typing import Optional, Dict, Any
import os
from app.core.logging import get_logger

logger = get_logger(__name__)

class GeminiClient:
    """Centralized Gemini API client with retry logic and error handling"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set, AI features will be limited")
            self.enabled = False
        else:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-pro')
            self.enabled = True
            logger.info("Gemini client initialized successfully")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True
    )
    async def generate(self, prompt: str, **kwargs) -> str:
        """
        Generate content using Gemini with retry logic
        
        Args:
            prompt: The prompt to send to Gemini
            **kwargs: Additional generation parameters
            
        Returns:
            Generated text response
            
        Raises:
            Exception: If all retries fail or API key not configured
        """
        if not self.enabled:
            raise Exception("Gemini API not configured. Set GEMINI_API_KEY environment variable.")
        
        try:
            response = await self.model.generate_content_async(prompt, **kwargs)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True
    )
    async def generate_json(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """
        Generate JSON content using Gemini
        
        Args:
            prompt: The prompt to send to Gemini (should request JSON output)
            **kwargs: Additional generation parameters
            
        Returns:
            Parsed JSON response
        """
        import json
        
        if not self.enabled:
            raise Exception("Gemini API not configured")
        
        try:
            # Add JSON formatting instruction to prompt
            json_prompt = f"{prompt}\n\nIMPORTANT: Return ONLY valid JSON, no markdown formatting."
            response = await self.model.generate_content_async(json_prompt, **kwargs)
            
            # Clean response text (remove markdown code blocks if present)
            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:]  # Remove ```json
            if text.startswith('```'):
                text = text[3:]  # Remove ```
            if text.endswith('```'):
                text = text[:-3]  # Remove trailing ```
            text = text.strip()
            
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini JSON response: {str(e)}")
            logger.error(f"Response text: {response.text}")
            raise
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            raise

# Global instance
_gemini_client: Optional[GeminiClient] = None

def get_gemini_client() -> GeminiClient:
    """Get or create the global Gemini client instance"""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
