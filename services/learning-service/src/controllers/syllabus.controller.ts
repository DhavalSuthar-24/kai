import { type Request, type Response } from 'express';
import prisma from '../prisma.ts';
import { asyncHandler, successResponse, type AuthRequest, UnauthorizedError, NotFoundError, BadRequestError } from '@shared/index.ts';
import { ContentProcessor } from '../services/content-processor.ts';
import kafkaClient from '../kafka.ts';

const contentProcessor = new ContentProcessor();

export const generateSyllabus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { topicId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  if (!topicId) {
    throw new BadRequestError('Topic ID is required');
  }

  // Check if topic exists and belongs to user
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, userId },
  });

  if (!topic) {
    throw new NotFoundError('Topic not found');
  }

  // Check if syllabus already exists
  const existingSyllabus = await prisma.syllabus.findUnique({
    where: { topicId },
  });

  if (existingSyllabus) {
    return res.status(200).json(successResponse(
      { ...existingSyllabus, content: JSON.parse(existingSyllabus.content) },
      'Syllabus already exists'
    ));
  }

  // Generate syllabus
  const syllabusContent = await contentProcessor.generateSyllabus(topic.name);

  // Save to DB
  const syllabus = await prisma.syllabus.create({
    data: {
      topicId,
      content: JSON.stringify(syllabusContent),
    },
  });

  // Publish event
  try {
    await kafkaClient.send('learning-events', [{
      type: 'SYLLABUS_GENERATED',
      data: {
        syllabusId: syllabus.id,
        topicId,
        userId,
        generatedAt: new Date().toISOString(),
      },
    }]);
  } catch (error) {
    console.error('Failed to publish SYLLABUS_GENERATED event', error);
  }

  res.status(201).json(successResponse(
    { ...syllabus, content: syllabusContent },
    'Syllabus generated successfully'
  ));
});

export const getSyllabus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { topicId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const syllabus = await prisma.syllabus.findUnique({
    where: { topicId },
  });

  if (!syllabus) {
    throw new NotFoundError('Syllabus not found');
  }

  const content = JSON.parse(syllabus.content);
  
  // Calculate completion percentage
  const sections = content.sections || [];
  const completedCount = sections.filter((s: any) => s.completed).length;
  const completionPercentage = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

  res.status(200).json(successResponse(
    { ...syllabus, content, completionPercentage },
    'Syllabus retrieved successfully'
  ));
});

export const updateProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { sectionIndex, completed } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const syllabus = await prisma.syllabus.findUnique({
    where: { id },
  });

  if (!syllabus) {
    throw new NotFoundError('Syllabus not found');
  }

  const content = JSON.parse(syllabus.content);
  
  if (!content.sections || !content.sections[sectionIndex]) {
    throw new BadRequestError('Invalid section index');
  }

  content.sections[sectionIndex].completed = completed;

  const updatedSyllabus = await prisma.syllabus.update({
    where: { id },
    data: {
      content: JSON.stringify(content),
    },
  });

  // Calculate completion percentage
  const sections = content.sections || [];
  const completedCount = sections.filter((s: any) => s.completed).length;
  const completionPercentage = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

  res.status(200).json(successResponse(
    { id: updatedSyllabus.id, completionPercentage },
    'Progress updated successfully'
  ));
});

export const regenerateSyllabus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const syllabus = await prisma.syllabus.findUnique({
    where: { id },
  });

  if (!syllabus) {
    throw new NotFoundError('Syllabus not found');
  }

  const topic = await prisma.topic.findUnique({
    where: { id: syllabus.topicId },
  });

  if (!topic) {
    throw new NotFoundError('Topic not found');
  }

  // Regenerate syllabus
  const syllabusContent = await contentProcessor.generateSyllabus(topic.name);

  // Update DB
  const updatedSyllabus = await prisma.syllabus.update({
    where: { id },
    data: {
      content: JSON.stringify(syllabusContent),
    },
  });

  res.status(200).json(successResponse(
    { ...updatedSyllabus, content: syllabusContent },
    'Syllabus regenerated successfully'
  ));
});
