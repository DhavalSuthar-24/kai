import { KafkaClient } from '@shared/index.ts';

const kafkaClient = new KafkaClient('notification-service', ['localhost:9092']);

export default kafkaClient;
