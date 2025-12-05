import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import CircuitBreaker from 'opossum';
import { createLogger } from './logger.ts';

const logger = createLogger('http-client');

// Circuit breaker options
interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
}

// Retry configuration
interface RetryConfig {
  retries?: number;
  retryDelay?: (retryCount: number) => number;
  retryCondition?: (error: AxiosError) => boolean;
}

// Fallback function type
type FallbackFunction<T> = (error: Error) => T | Promise<T>;

export class ServiceClient {
  private client: AxiosInstance;
  private circuitBreaker?: CircuitBreaker;
  
  constructor(
    private serviceName: string,
    private baseURL: string,
    private fallback?: FallbackFunction<any>,
    retryConfig?: RetryConfig,
    circuitBreakerOptions?: CircuitBreakerOptions
  ) {
    this.client = axios.create({
      baseURL,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Setup retry logic
    this.setupRetry(retryConfig);
    
    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`${serviceName} request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error(`${serviceName} request error`, error);
        return Promise.reject(error);
      }
    );
    
    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`${serviceName} response: ${response.status}`);
        return response;
      },
      (error) => {
        logger.error(`${serviceName} response error`, error);
        return Promise.reject(error);
      }
    );
    
    // Setup circuit breaker if fallback is provided
    if (fallback) {
      this.setupCircuitBreaker(circuitBreakerOptions);
    }
  }
  
  private setupRetry(config?: RetryConfig) {
    const defaultConfig: RetryConfig = {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error: AxiosError) => {
        // Retry on network errors and 5xx errors
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response?.status ? error.response.status >= 500 : false);
      }
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    axiosRetry(this.client, {
      retries: finalConfig.retries,
      retryDelay: finalConfig.retryDelay,
      retryCondition: finalConfig.retryCondition,
      onRetry: (retryCount, error) => {
        logger.warn(`${this.serviceName} retry attempt ${retryCount}`, {
          error: error.message,
          url: error.config?.url
        });
      }
    });
  }
  
  private setupCircuitBreaker(options?: CircuitBreakerOptions) {
    const defaultOptions: CircuitBreakerOptions = {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      volumeThreshold: 10
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    this.circuitBreaker = new CircuitBreaker(
      async (fn: () => Promise<any>) => fn(),
      {
        timeout: finalOptions.timeout,
        errorThresholdPercentage: finalOptions.errorThresholdPercentage,
        resetTimeout: finalOptions.resetTimeout,
        volumeThreshold: finalOptions.volumeThreshold,
        name: this.serviceName
      }
    );
    
    // Circuit breaker event listeners
    this.circuitBreaker.on('open', () => {
      logger.error(`Circuit breaker OPEN for ${this.serviceName}`);
    });
    
    this.circuitBreaker.on('halfOpen', () => {
      logger.warn(`Circuit breaker HALF-OPEN for ${this.serviceName}`);
    });
    
    this.circuitBreaker.on('close', () => {
      logger.info(`Circuit breaker CLOSED for ${this.serviceName}`);
    });
    
    this.circuitBreaker.fallback(this.fallback!);
  }
  
  private async executeWithCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
    if (this.circuitBreaker) {
      try {
        return await this.circuitBreaker.fire(fn);
      } catch (error) {
        logger.error(`${this.serviceName} circuit breaker error`, error);
        throw error;
      }
    }
    return fn();
  }
  
  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithCircuitBreaker(async () => {
      const response = await this.client.get(path, config);
      return response.data;
    });
  }
  
  async post<T>(path: string, data: any, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithCircuitBreaker(async () => {
      const response = await this.client.post(path, data, config);
      return response.data;
    });
  }
  
  async put<T>(path: string, data: any, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithCircuitBreaker(async () => {
      const response = await this.client.put(path, data, config);
      return response.data;
    });
  }
  
  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithCircuitBreaker(async () => {
      const response = await this.client.delete(path, config);
      return response.data;
    });
  }
  
  // Get circuit breaker stats
  getStats() {
    if (this.circuitBreaker) {
      return {
        name: this.serviceName,
        state: this.circuitBreaker.opened ? 'OPEN' : this.circuitBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
        stats: this.circuitBreaker.stats
      };
    }
    return null;
  }
}

// Fallback responses for each service
const fallbacks = {
  auth: (error: Error) => {
    logger.warn('Auth service fallback triggered', error);
    return { user: null, authenticated: false };
  },
  content: (error: Error) => {
    logger.warn('Content service fallback triggered', error);
    return { captures: [], total: 0 };
  },
  learning: (error: Error) => {
    logger.warn('Learning service fallback triggered', error);
    return { topics: [], flashcards: [] };
  },
  gamification: (error: Error) => {
    logger.warn('Gamification service fallback triggered', error);
    return { points: 0, level: 1, achievements: [] };
  },
  ai: (error: Error) => {
    logger.warn('AI service fallback triggered', error);
    return { processed: false, message: 'AI service temporarily unavailable' };
  }
};

// Service registry with resilience
export const services = {
  auth: new ServiceClient(
    'auth-service',
    process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    fallbacks.auth
  ),
  content: new ServiceClient(
    'content-service',
    process.env.CONTENT_SERVICE_URL || 'http://localhost:3002',
    fallbacks.content
  ),
  learning: new ServiceClient(
    'learning-service',
    process.env.LEARNING_SERVICE_URL || 'http://localhost:3003',
    fallbacks.learning
  ),
  gamification: new ServiceClient(
    'gamification-service',
    process.env.GAMIFICATION_SERVICE_URL || 'http://localhost:3004',
    fallbacks.gamification
  ),
  ai: new ServiceClient(
    'ai-service',
    process.env.AI_SERVICE_URL || 'http://localhost:8000',
    fallbacks.ai,
    { retries: 2 }, // AI service gets fewer retries
    { timeout: 10000 } // AI service gets longer timeout
  )
};

// Export types
export type { RetryConfig, CircuitBreakerOptions, FallbackFunction };
