import { createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { encrypt } from '@/utilities/encryption';
import { DEFAULT_LOCALE, type SupportedLocale } from '@/utilities/i18n';
import { reportError } from '@/utilities/error-reporting';

const SCHEMA_VERSION = '1.0.0';

export const defaultState = {
  schemaVersion: SCHEMA_VERSION,
  score: 0,
  locale: DEFAULT_LOCALE,
  encryptionKey: null as string | null,
  loading: false,
  error: null as string | null,
};

// Infer Type from defaultState
export type PreferencesState = typeof defaultState;

export const serializePreferencesForStorage = async (preferences: PreferencesState): Promise<string | null> => {
  const { encryptionKey } = preferences;
  if (!encryptionKey) {
    return null;
  }

  const encryptedState = await encrypt(JSON.stringify(preferences), encryptionKey);
  if (!encryptedState) {
    reportError('Failed to encrypt preferences state', { context: 'serializePreferencesForStorage' });
    return null;
  }

  return encryptedState;
};

// Encrypted boilerplate persistence is disabled because the current API does
// not expose an encryption key. Keep deterministic defaults until this slice
// is either removed or migrated to an application-owned preference store.
export const initPreferences = createAsyncThunk(
  'preferences/initPreferences',
  async () => defaultState,
);


// Preferences actions that don't require async.
export const preferencesActions = {
  increment: (state: PreferencesState) => {
    state.score += 1;
  },
  decrement: (state: PreferencesState) => {
    state.score -= 1;
  },
  incrementByAmount: (state: PreferencesState, action: PayloadAction<number>) => {
    state.score += action.payload;
  },
  setLocale: (state: PreferencesState, action: PayloadAction<SupportedLocale>) => {
    state.locale = action.payload;
  },
};
