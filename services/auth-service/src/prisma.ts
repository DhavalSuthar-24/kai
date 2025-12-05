import { PrismaClient } from '../prisma/generated/client';
import { withAccelerate } from '@prisma/extension-accelerate';

import { createSoftDeleteMiddleware } from '@shared/index.ts';

const baseClient = new PrismaClient();
// @ts-ignore
baseClient.$use(createSoftDeleteMiddleware());

export const prisma = baseClient.$extends(withAccelerate());

export default prisma;
