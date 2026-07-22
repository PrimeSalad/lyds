import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

healthRouter.get('/ready', async (_req, res) => {
  try {
    // Simple check that Supabase connection works
    const { error } = await import('../config/supabase').then((m) =>
      m.supabaseAdmin.from('profiles').select('id').limit(1),
    );

    if (error) {
      res.status(503).json({ status: 'not ready', error: error.message });
      return;
    }

    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not ready', error: 'Database connection failed' });
  }
});
