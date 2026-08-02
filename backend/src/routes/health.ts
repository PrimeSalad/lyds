import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const deploymentCommit = process.env.RENDER_GIT_COMMIT;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ...(deploymentCommit ? { deploymentCommit } : {}),
  });
});

healthRouter.get('/ready', async (_req, res) => {
  try {
    // Simple check that Supabase connection works
    const { error } = await import('../config/supabase').then((m) =>
      m.supabaseAdmin.from('profiles').select('id').limit(1),
    );

    if (error) {
      res.status(503).json({ status: 'not ready', error: 'Database connection failed' });
      return;
    }

    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not ready', error: 'Database connection failed' });
  }
});
