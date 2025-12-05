import express from 'express';
import cors from 'cors';
import { errorHandler } from '@shared/index.ts';
import authRoutes from './routes/auth.routes.ts';
import preferencesRoutes from './routes/preferences.routes.ts';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/preferences', preferencesRoutes);

app.use(errorHandler as any);

export default app;
