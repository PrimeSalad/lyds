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
  // A 10 MB binary spreadsheet expands by roughly one third when sent as base64.
  app.use(express.json({ limit: '15mb' }));
  app.use(cookieParser());

  app.use('/api/v1', v1Router);
  app.use(globalErrorHandler);

  return app;
};
