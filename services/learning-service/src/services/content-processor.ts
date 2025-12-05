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

export interface GeneratedSyllabusSection {
  order: number;
  name: string;
  objectives: string[];
  estimatedMinutes: number;
  resources: string[];
  completed?: boolean;
}

export interface GeneratedSyllabus {
  title: string;
  description: string;
  estimatedTotalHours: number;
  sections: GeneratedSyllabusSection[];
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

  async generateSyllabus(topicName: string): Promise<GeneratedSyllabus> {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn('GEMINI_API_KEY not found, using mock syllabus generation');
      return this.mockGenerateSyllabus(topicName);
    }

    try {
      const prompt = `
        Generate a comprehensive learning syllabus for the topic: "${topicName}".
        Structure your response as strictly valid JSON with this format:
        {
          "title": "${topicName} Learning Syllabus",
          "description": "A structured path to mastering ${topicName}",
          "estimatedTotalHours": 12,
          "sections": [
            {
              "order": 1,
              "name": "Section Name",
              "objectives": ["Objective 1", "Objective 2"],
              "estimatedMinutes": 60,
              "resources": ["Resource 1", "Resource 2"],
              "completed": false
            }
          ]
        }
        Ensure the syllabus is beginner-friendly, progressive, and includes practical exercises.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr) as GeneratedSyllabus;
    } catch (error) {
      logger.error('Failed to generate syllabus with LLM', error);
      return this.mockGenerateSyllabus(topicName);
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

  private mockGenerateSyllabus(topicName: string): GeneratedSyllabus {
    return {
      title: `${topicName} Learning Syllabus (Mock)`,
      description: `A structured path to mastering ${topicName}`,
      estimatedTotalHours: 5,
      sections: [
        {
          order: 1,
          name: 'Introduction',
          objectives: ['Understand the basics'],
          estimatedMinutes: 30,
          resources: ['Mock Resource 1'],
          completed: false,
        },
        {
          order: 2,
          name: 'Core Concepts',
          objectives: ['Learn key concepts'],
          estimatedMinutes: 60,
          resources: ['Mock Resource 2'],
          completed: false,
        },
      ],
    };
  }
}
