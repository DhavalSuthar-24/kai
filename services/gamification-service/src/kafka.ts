import { KafkaClient } from '@shared/index.ts';

const kafkaClient = new KafkaClient('gamification-service', ['localhost:9092']);

export default kafkaClient;
