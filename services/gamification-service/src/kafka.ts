import { KafkaClient, getConfig } from '@shared/index.ts';

const config = getConfig();

const kafkaClient = new KafkaClient('gamification-service', [(config as any).KAFKA_BROKER || process.env.KAFKA_BROKER || 'localhost:9092']);

export default kafkaClient;
