import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi, type UserProfile } from '../infrastructure/auth-api';

interface AuthState {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  profile: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

export const loadProfile = createAsyncThunk('auth/loadProfile', async () => {
  return authApi.getCurrentUser();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearProfile(state) {
      state.profile = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    setLoading(state, action: { payload: boolean }) {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(loadProfile.rejected, (state, action) => {
        state.profile = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load profile';
      });
  },
});

export const { clearProfile, setLoading } = authSlice.actions;
export const authReducer = authSlice.reducer;
