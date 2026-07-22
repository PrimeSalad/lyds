import cors from 'cors';
import type { Application } from 'express';

export const applyCors = (app: Application): void => {
  const origins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? [];

  app.use(
    cors({
      origin: origins.length > 0 ? origins : false,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
};
