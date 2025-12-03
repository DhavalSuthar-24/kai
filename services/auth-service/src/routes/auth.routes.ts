import { Router } from 'express';
import { register, login } from '../controllers/auth.controller.ts';
import { validateRequest, registerSchema, loginSchema } from '@shared/index.ts';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);

export default router;
