import { type Request, type Response, type NextFunction } from 'express';
import prisma from '../prisma.ts';
import { asyncHandler, successResponse, BadRequestError, UnauthorizedError } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new BadRequestError('User already exists');
  }

    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Attempting to create user with email:', email);
    
    let user;
    try {
        user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
          },
        });
        console.log('User created in DB:', user.id);
    } catch (dbError) {
        console.error('DB Error:', dbError);
        throw dbError;
    }

    // Publish event
    try {
      await kafkaClient.send('user-events', [{
          type: 'USER_CREATED',
          data: {
              id: user.id,
              email: user.email,
              name: user.name,
              createdAt: user.createdAt
          }
      }]);
    } catch (error) {
      // Log error but don't fail the request if Kafka is down
      console.error('Failed to publish USER_CREATED event', error);
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json(successResponse({ id: user.id, email: user.email, name: user.name, token }, 'User registered successfully'));
});

export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new BadRequestError('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new BadRequestError('Invalid credentials');
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

  res.status(200).json(successResponse({ user: { id: user.id, email: user.email, name: user.name }, token }, 'Login successful'));
});
