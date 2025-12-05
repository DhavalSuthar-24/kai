import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('cleanup-tokens');

export const cleanupTokens = async () => {
  try {
    logger.info('Starting token cleanup job...');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: thirtyDaysAgo } },
          { isRevoked: true, revokedAt: { lt: thirtyDaysAgo } },
        ],
      },
    });

    logger.info(`Cleanup complete. Deleted ${result.count} tokens.`);
  } catch (error) {
    logger.error('Error cleaning up tokens', error);
  }
};

// If run directly
if (require.main === module) {
  cleanupTokens()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
