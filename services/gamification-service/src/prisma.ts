import { PrismaClient } from './generated/client';
import { withAccelerate } from '@prisma/extension-accelerate';

import { createSoftDeleteMiddleware } from '@shared/index.ts';

// @ts-ignore
const baseClient = new PrismaClient();
// @ts-ignore
baseClient.$use(createSoftDeleteMiddleware());

// @ts-ignore - Prisma 7 TypeScript type issue
export const prisma = baseClient.$extends(withAccelerate());

export default prisma;
