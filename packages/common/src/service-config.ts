export interface ServiceConfig {
  port: number;
  serviceName: string;
  kafkaBrokers: string[];
  databaseUrl: string;
  redisUrl: string;
  environment: 'development' | 'production' | 'test';
  logLevel: string;
}

export function getServiceConfig(serviceName: string): ServiceConfig {
  const env = process.env.NODE_ENV || 'development';
  
  return {
    port: parseInt(process.env.PORT || '3000'),
    serviceName,
    kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    environment: env as 'development' | 'production' | 'test',
    logLevel: process.env.LOG_LEVEL || 'info'
  };
}

export function validateServiceConfig(config: ServiceConfig): void {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  
  if (config.kafkaBrokers.length === 0) {
    throw new Error('KAFKA_BROKERS is required');
  }
  
  if (!config.redisUrl) {
    throw new Error('REDIS_URL is required');
  }
}
