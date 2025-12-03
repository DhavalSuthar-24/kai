import express from 'express';
import cors from 'cors';
import { errorHandler } from '@shared/index.ts';
import contentRoutes from './routes/content.routes.ts';
import screenUsageRoutes from './routes/screen-usage.routes.ts';
import screenshotRoutes from './routes/screenshot.routes.ts';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/content', contentRoutes);
app.use('/screen-usage', screenUsageRoutes);
app.use('/screenshots', screenshotRoutes);

app.use(errorHandler as any);

export default app;
