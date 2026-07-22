import express from 'express';
import cookieParser from 'cookie-parser';
import { applySecurityHeaders } from './middleware/security-headers';
import { applyCors } from './middleware/cors';
import { globalErrorHandler } from './middleware/error-handler';
import { v1Router } from './routes/v1';

export const createApp = () => {
  const app = express();

  applySecurityHeaders(app);
  applyCors(app);

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  app.use('/api/v1', v1Router);
  app.use(globalErrorHandler);

  return app;
};
