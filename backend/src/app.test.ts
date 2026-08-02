import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  process.env.SUPABASE_URL ??= 'http://127.0.0.1:54321';
  process.env.SUPABASE_SECRET_KEY ??= 'test-service-key';
  const { createApp } = await import('./app');
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe('Express application', () => {
  it('serves health with security headers', async () => {
    const previousDeploymentCommit = process.env.RENDER_GIT_COMMIT;
    process.env.RENDER_GIT_COMMIT = 'test-deployment-commit';

    try {
      const response = await fetch(`${baseUrl}/api/v1/health`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        deploymentCommit: 'test-deployment-commit',
      });
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('referrer-policy')).toContain('strict-origin-when-cross-origin');
      expect(response.headers.get('permissions-policy')).toContain('camera=()');
      expect(response.headers.get('x-powered-by')).toBeNull();
    } finally {
      if (previousDeploymentCommit === undefined) {
        delete process.env.RENDER_GIT_COMMIT;
      } else {
        process.env.RENDER_GIT_COMMIT = previousDeploymentCommit;
      }
    }
  });

  it('rejects protected API access without a bearer token', async () => {
    const response = await fetch(`${baseUrl}/api/v1/accounts`);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header.',
      },
    });
  });

  it('does not expose provider errors from the readiness check', async () => {
    const { supabaseAdmin } = await import('./config/supabase');
    const fromSpy = vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
      select: () => ({
        limit: () => Promise.resolve({ error: { message: 'private database connection detail' } }),
      }),
    } as unknown as ReturnType<typeof supabaseAdmin.from>);

    try {
      const response = await fetch(`${baseUrl}/api/v1/health/ready`);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toEqual({ status: 'not ready', error: 'Database connection failed' });
      expect(JSON.stringify(body)).not.toContain('private database connection detail');
    } finally {
      fromSpy.mockRestore();
    }
  });
});
