import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.hoisted(() => vi.fn());

vi.mock('./supabase', () => ({
  supabase: { auth: { getSession } },
}));

import { apiClient } from './api-client';

describe('apiClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('stops an unavailable API from leaving the interface loading forever', async () => {
    const request = apiClient.request('/slow');
    const rejection = expect(request).rejects.toThrow(
      'The records service took too long to respond. Please retry.',
    );

    await vi.advanceTimersByTimeAsync(45_000);

    await rejection;
  });
});
