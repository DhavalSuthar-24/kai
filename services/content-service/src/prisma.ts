import { PrismaClient } from '../prisma/generated/client';

import { createSoftDeleteMiddleware } from '@shared/index.ts';

const baseClient = new PrismaClient();
// @ts-ignore
baseClient.$use(createSoftDeleteMiddleware());

export const prisma = baseClient;

export default prisma;
