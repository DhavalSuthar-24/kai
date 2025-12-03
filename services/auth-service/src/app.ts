import express from 'express';
import cors from 'cors';
import { errorHandler } from '@shared/index.ts';
import authRoutes from './routes/auth.routes.ts';
import preferencesRoutes from './routes/preferences.routes.ts';
import goalsRoutes from './routes/goals.routes.ts';
import focusModesRoutes from './routes/focus-modes.routes.ts';
import friendsRoutes from './routes/friends.routes.ts';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/preferences', preferencesRoutes);
app.use('/goals', goalsRoutes);
app.use('/focus-modes', focusModesRoutes);
app.use('/friends', friendsRoutes);

app.use(errorHandler as any);

export default app;
