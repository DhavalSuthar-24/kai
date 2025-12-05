import { Kafka, type Producer, type Consumer, logLevel } from 'kafkajs';
import { createLogger } from './logger.ts';

const logger = createLogger('kafka-wrapper');

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Consumer[] = [];

  constructor(clientId: string, brokers: string[]) {
    this.kafka = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.ERROR,
    });
    this.producer = this.kafka.producer();
  }

  async connectProducer() {
    await this.producer.connect();
    logger.info('Kafka Producer connected');
  }

  async send(topic: string, messages: any[]) {
    try {
      await this.producer.send({
        topic,
        messages: messages.map((msg) => ({ value: JSON.stringify(msg) })),
      });
    } catch (error) {
      logger.error('Error sending message to Kafka', error);
      throw error;
    }
  }

  async consume(groupId: string, topic: string, callback: (message: any) => Promise<void>) {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (message.value) {
          try {
            const parsedMessage = JSON.parse(message.value.toString());
            await callback(parsedMessage);
          } catch (error) {
            logger.error('Error processing message', error);
          }
        }
      },
    });
    this.consumers.push(consumer);
    logger.info(`Kafka Consumer connected to topic: ${topic}`);
  }

  async publishEvent(topic: string, event: any) {
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(event) }],
      });
      logger.debug(`Event published to ${topic}`, { type: event.type });
    } catch (error) {
      logger.error(`Error publishing event to ${topic}`, error);
      throw error;
    }
  }

  async disconnect() {
    await this.producer.disconnect();
    for (const consumer of this.consumers) {
      await consumer.disconnect();
    }
  }
}
