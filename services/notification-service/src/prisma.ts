import { PrismaClient } from '../prisma/generated';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('notification-prisma');

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

prisma.$on('query' as never, (e: any) => {
  logger.debug('Query: ' + e.query);
  logger.debug('Duration: ' + e.duration + 'ms');
});

export default prisma;
