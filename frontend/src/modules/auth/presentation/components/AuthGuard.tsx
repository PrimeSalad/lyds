import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { useAppDispatch } from '../../../../redux/hooks';
import { loadProfile } from '../../application/auth-store';
import { Box, Spinner, Text } from '@chakra-ui/react';

export const AuthGuard = () => {
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(loadProfile());
  }, [dispatch]);

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
