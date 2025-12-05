import { PrismaClient } from '../prisma/generated/client';

import { createSoftDeleteMiddleware } from '@shared/index.ts';

export const prisma = new PrismaClient();
// @ts-ignore
prisma.$use(createSoftDeleteMiddleware());

export default prisma;
