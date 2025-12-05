import { type Response } from 'express';
import prisma from '../prisma.ts';
import { asyncHandler, successResponse, NotFoundError, type AuthRequest, userGoalSchema } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';

// POST /goals - Create kaizen goal
export const createGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  const data = userGoalSchema.parse(req.body);
  
  const goal = await prisma.userGoal.create({
    data: { userId, ...data }
  });
  
  // Publish event
  try {
    await kafkaClient.send('gamification-events', [{
      type: 'GOAL_SET',
      data: { userId, goal, createdAt: new Date() }
    }]);
  } catch (error) {
    console.error('Failed to publish GOAL_SET event', error);
  }
  
  res.status(201).json(successResponse(goal, 'Goal created'));
});

// GET /goals - List user goals
export const getGoals = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  const { category, isCompleted } = req.query;
  
  const goals = await prisma.userGoal.findMany({
    where: {
      userId,
      ...(category && { category: category as string }),
      ...(isCompleted !== undefined && { isCompleted: isCompleted === 'true' })
    },
    orderBy: { createdAt: 'desc' }
  });
  
  res.json(successResponse(goals));
});

// GET /goals/progress - Get goal completion stats
export const getGoalProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  
  const [total, completed, inProgress] = await Promise.all([
    prisma.userGoal.count({ where: { userId } }),
    prisma.userGoal.count({ where: { userId, isCompleted: true } }),
    prisma.userGoal.count({ where: { userId, isCompleted: false } })
  ]);
  
  const byCategory = await prisma.userGoal.groupBy({
    by: ['category'],
    where: { userId },
    _count: true
  });
  
  res.json(successResponse({
    total,
    completed,
    inProgress,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
    byCategory
  }));
});

// PUT /goals/:id - Update goal
export const updateGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  const { id } = req.params;
  const data = userGoalSchema.partial().parse(req.body);
  
  const goal = await prisma.userGoal.updateMany({
    where: { id, userId },
    data
  });
  
  if (goal.count === 0) {
    throw new NotFoundError('Goal not found');
  }
  
  res.json(successResponse(goal, 'Goal updated'));
});

// DELETE /goals/:id - Delete goal
export const deleteGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  const { id } = req.params;
  
  const goal = await prisma.userGoal.deleteMany({
    where: { id, userId }
  });
  
  if (goal.count === 0) {
    throw new NotFoundError('Goal not found');
  }
  
  res.json(successResponse(null, 'Goal deleted'));
});
