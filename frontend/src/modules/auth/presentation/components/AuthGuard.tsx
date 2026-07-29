import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { useAppDispatch } from '../../../../redux/hooks';
import { loadProfile } from '../../application/auth-store';
import { clearProfile, setLoading } from '../../application/auth-store';
import { authApi } from '../../infrastructure/auth-api';
import { Box, Spinner, Text } from '@chakra-ui/react';

export const AuthGuard = () => {
  const { isAuthenticated, loading, profile } = useSelector((state: RootState) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      dispatch(setLoading(true));
      try {
        const mfaStatus = await authApi.getMfaStatus();
        if (!active) return;
        if (mfaStatus === 'signed_out') {
          dispatch(clearProfile());
          navigate('/login', { replace: true });
          return;
        }
        if (mfaStatus !== 'verified') {
          dispatch(clearProfile());
          navigate('/mfa', { replace: true });
          return;
        }
        await dispatch(loadProfile()).unwrap();
      } catch {
        if (!active) return;
        await authApi.signOut('local').catch(() => {});
        dispatch(clearProfile());
        navigate('/login', { replace: true });
      }
    };
    void bootstrap();
    return () => { active = false; };
  }, [dispatch, navigate]);

  useEffect(() => {
    if (isAuthenticated && profile?.mustChangePassword && location.pathname !== '/account-settings') {
      navigate('/account-settings', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate, profile?.mustChangePassword]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const configuredMinutes = Number.parseInt(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MINUTES ?? '', 10);
    const timeoutMs = (Number.isInteger(configuredMinutes) && configuredMinutes > 0 ? configuredMinutes : 30) * 60_000;
    let lastActivity = Date.now();
    let signingOut = false;
    const markActivity = () => { lastActivity = Date.now(); };
    const checkTimeout = () => {
      if (signingOut || Date.now() - lastActivity < timeoutMs) return;
      signingOut = true;
      void authApi.signOut('local').finally(() => {
        dispatch(clearProfile());
        navigate('/login?reason=inactive', { replace: true });
      });
    };

    window.addEventListener('pointerdown', markActivity, { passive: true });
    window.addEventListener('keydown', markActivity);
    document.addEventListener('visibilitychange', checkTimeout);
    const timer = window.setInterval(checkTimeout, 30_000);
    return () => {
      window.removeEventListener('pointerdown', markActivity);
      window.removeEventListener('keydown', markActivity);
      document.removeEventListener('visibilitychange', checkTimeout);
      window.clearInterval(timer);
    };
  }, [dispatch, isAuthenticated, navigate]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minH="100vh">
        <Spinner size="lg" color="primary.500" />
        <Text mt={4} color="text.secondary">Loading...</Text>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Outlet />;
};

export default AuthGuard;
