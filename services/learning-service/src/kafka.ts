import { KafkaClient } from '@shared/index.ts';

const kafkaClient = new KafkaClient('learning-service', ['localhost:9092']);

export default kafkaClient;
