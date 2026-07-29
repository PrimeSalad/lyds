/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_FLAGS?: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SESSION_IDLE_TIMEOUT_MINUTES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
