import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { useAppDispatch } from '../../../../redux/hooks';
import { loadProfile } from '../../application/auth-store';
import { clearProfile, setLoading } from '../../application/auth-store';
import { authApi } from '../../infrastructure/auth-api';
import { Box, Button, Heading, Spinner, Text, VStack } from '@chakra-ui/react';
import { LuRefreshCw } from 'react-icons/lu';

export const AuthGuard = () => {
  const { isAuthenticated, loading, profile } = useSelector((state: RootState) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [slowBootstrap, setSlowBootstrap] = useState(false);

  useEffect(() => {
    let active = true;
    const slowTimer = window.setTimeout(() => {
      if (active) setSlowBootstrap(true);
    }, 4_000);
    const bootstrap = async () => {
      setBootstrapError(null);
      setSlowBootstrap(false);
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
      } catch (error) {
        if (!active) return;
        dispatch(setLoading(false));
        setBootstrapError(error instanceof Error ? error.message : 'The secure records service is unavailable.');
      }
    };
    void bootstrap();
    return () => {
      active = false;
      window.clearTimeout(slowTimer);
    };
  }, [bootstrapAttempt, dispatch, navigate]);

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
    if (!loading && !isAuthenticated && !bootstrapError) {
      navigate('/login', { replace: true });
    }
  }, [bootstrapError, loading, isAuthenticated, navigate]);

  if (bootstrapError) {
    return (
      <Box minH="100dvh" display="grid" placeItems="center" bg="page.bg" px={4}>
        <VStack
          maxW="md"
          width="full"
          gap={4}
          textAlign="center"
          bg="surface"
          borderWidth="1px"
          borderColor="border"
          borderRadius="xl"
          boxShadow="panel"
          p={{ base: 6, md: 8 }}
        >
          <Heading as="h1" size="md">Could not open the records service</Heading>
          <Text color="text.secondary" lineHeight="1.6">
            {bootstrapError} Your session is still safe. Retry once the secure service is ready.
          </Text>
          <Button
            colorPalette="green"
            minH="44px"
            onClick={() => setBootstrapAttempt((attempt) => attempt + 1)}
          >
            <LuRefreshCw aria-hidden="true" /> Retry
          </Button>
        </VStack>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minH="100dvh" px={4}>
        <Spinner size="lg" color="primary.600" />
        <Text mt={4} fontWeight="600" color="text.primary">Opening secure records…</Text>
        {slowBootstrap && (
          <Text mt={2} maxW="md" textAlign="center" fontSize="sm" color="text.secondary" lineHeight="1.6">
            The records service is starting up. The first visit can take a little longer.
          </Text>
        )}
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Outlet />;
};

export default AuthGuard;
