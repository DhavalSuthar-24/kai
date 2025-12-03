import { PrismaClient } from './generated/client';
import { withAccelerate } from '@prisma/extension-accelerate';

// @ts-ignore - Prisma 7 TypeScript type issue
export const prisma = new PrismaClient().$extends(withAccelerate());

export default prisma;
