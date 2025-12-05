import { PrismaClient } from '@prisma/client';

export const createSoftDeleteMiddleware = () => {
  return async (params: any, next: any) => {
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      // Change to findFirst - you cannot filter by deletedAt with findUnique
      params.action = 'findFirst';
      if (params.args.where.deletedAt === undefined) {
        params.args.where['deletedAt'] = null;
      }
    }
    if (params.action === 'findMany') {
      // Find many queries
      if (params.args.where) {
        if (params.args.where.deletedAt == undefined) {
          // Exclude deleted records if they have not been explicitly requested
          params.args.where['deletedAt'] = null;
        }
      } else {
        params.args.where = { deletedAt: null };
      }
    }
    if (params.action == 'update') {
      // Change to updateMany - you cannot filter by deletedAt with update
      params.action = 'updateMany';
      if (params.args.where.deletedAt === undefined) {
        params.args.where['deletedAt'] = null;
      }
    }
    if (params.action == 'updateMany') {
      if (params.args.where != undefined) {
        if (params.args.where.deletedAt === undefined) {
          params.args.where['deletedAt'] = null;
        }
      } else {
        params.args.where = { deletedAt: null };
      }
    }
    if (params.action == 'delete') {
      // Delete queries
      // Change action to an update
      params.action = 'update';
      params.args['data'] = { deletedAt: new Date() };
    }
    if (params.action == 'deleteMany') {
      // Delete many queries
      params.action = 'updateMany';
      if (params.args.data != undefined) {
        params.args.data['deletedAt'] = new Date();
      } else {
        params.args.data = { deletedAt: new Date() };
      }
    }
    return next(params);
  };
};
