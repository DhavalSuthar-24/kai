import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('content-processor');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

export interface GeneratedTopic {
  name: string;
  flashcards: GeneratedFlashcard[];
}

export class ContentProcessor {
  async process(content: string): Promise<GeneratedTopic> {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn('GEMINI_API_KEY not found, using mock generation');
      return this.mockGenerate(content);
    }

    try {
      const prompt = `
        Analyze the following text and extract the main topic. 
        Then, generate 3-5 flashcards (front and back) to help learn this topic.
        Return the response in strictly valid JSON format like this:
        {
          "name": "Topic Name",
          "flashcards": [
            { "front": "Question 1", "back": "Answer 1" },
            { "front": "Question 2", "back": "Answer 2" }
          ]
        }
        
        Text: "${content.substring(0, 1000)}"
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean up markdown code blocks if present
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(jsonStr) as GeneratedTopic;
    } catch (error) {
      logger.error('Failed to generate content with LLM', error);
      return this.mockGenerate(content);
    }
  }

  private mockGenerate(content: string): GeneratedTopic {
    return {
      name: `Topic from ${content.substring(0, 20)}...`,
      flashcards: [
        { front: 'What is the main idea?', back: 'The content provided.' },
        { front: 'Key detail 1', back: 'Detail from content.' },
        { front: 'Key detail 2', back: 'Another detail.' },
      ],
    };
  }
}
