import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 45_000;
const REQUEST_TIMEOUT_MESSAGE = 'The records service took too long to respond. Please retry.';

const abortError = (reason?: unknown) => (
  reason instanceof Error ? reason : new DOMException('The request was canceled.', 'AbortError')
);

export const apiClient = {
  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    const sourceSignal = options?.signal;
    const abortFromSource = () => controller.abort(sourceSignal?.reason);

    if (sourceSignal?.aborted) {
      throw abortError(sourceSignal.reason);
    }
    sourceSignal?.addEventListener('abort', abortFromSource, { once: true });

    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const canceled = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        reject(timedOut ? new Error(REQUEST_TIMEOUT_MESSAGE) : abortError(sourceSignal?.reason));
      }, { once: true });
    });

    const execute = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options?.headers,
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Request failed' })) as {
          message?: string;
          error?: { message?: string } | string;
          errors?: Array<{ message?: string }>;
        };
        const nestedMessage = typeof error.error === 'string' ? error.error : error.error?.message;
        const message = error.message || nestedMessage || error.errors?.[0]?.message;
        throw new Error(message || `Request failed with status ${res.status}`);
      }

      if (res.status === 204) return undefined as T;
      const contentType = res.headers.get('content-type') ?? '';
      if (
        contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
        contentType.includes('text/csv') ||
        contentType.includes('application/octet-stream')
      ) {
        return await res.blob() as T;
      }
      return res.json() as Promise<T>;
    };

    try {
      return await Promise.race([execute(), canceled]);
    } finally {
      window.clearTimeout(timeoutId);
      sourceSignal?.removeEventListener('abort', abortFromSource);
    }
  },
};
