import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Button, Container, Field, Image, Input, Stack, Text, Heading, IconButton } from '@chakra-ui/react';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { authApi } from '../../infrastructure/auth-api';
import { useAppDispatch } from '../../../../redux/hooks';
import { loadProfile } from '../../application/auth-store';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authApi.signIn(email, password);
      await dispatch(loadProfile()).unwrap();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="page.bg">
      <Container maxW="sm" w="full" p={6}>
        <Stack gap={8}>
          <Box textAlign="center">
            <Image src="/brand/lydo-logo.png" alt="LYDO logo" mx="auto" h="92px" objectFit="contain" mb={4} />
            <Heading size="lg" color="primary.700">SK Youth IMS</Heading>
            <Text color="text.secondary" mt={2}>Sign in to your account</Text>
          </Box>

          <Box as="form" onSubmit={handleSubmit}>
            <Stack gap={4}>
              <Field.Root required>
                <Field.Label>Email</Field.Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field.Root>

              <Field.Root required>
                <Field.Label>Password</Field.Label>
                <Box position="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    pr="40px"
                  />
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    position="absolute"
                    right="4px"
                    top="50%"
                    transform="translateY(-50%)"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <LuEyeOff /> : <LuEye />}
                  </IconButton>
                </Box>
              </Field.Root>

              {error && (
                <Text color="danger" fontSize="sm">{error}</Text>
              )}

              <Button
                type="submit"
                colorPalette="green"
                size="lg"
                loading={loading}
                w="full"
              >
                Sign In
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default LoginPage;
