import express from 'express';
import cors from 'cors';
import { errorHandler } from '@shared/index.ts';
import learningRoutes from './routes/learning.routes.ts';
import analyticsRoutes from './routes/analytics.routes.ts';
import screenUsageRoutes from './routes/screen-usage.routes.ts';
import essentialSpaceRoutes from './routes/essential-space.routes.ts';
import memoryRoutes from './routes/memory.routes.ts';
import insightsRoutes from './routes/insights.routes.ts';
import focusTunnelRoutes from './routes/focus-tunnel.routes.ts';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/learning', learningRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/screen-usage', screenUsageRoutes);
app.use('/essential-space', essentialSpaceRoutes);
app.use('/memories', memoryRoutes);
app.use('/insights', insightsRoutes);
app.use('/focus-tunnel', focusTunnelRoutes);

app.use(errorHandler as any);

export default app;
