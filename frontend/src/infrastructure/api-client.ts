import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const apiClient = {
  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
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
    return res.json();
  },
};
