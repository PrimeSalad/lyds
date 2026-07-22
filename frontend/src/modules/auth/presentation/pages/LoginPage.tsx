import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Box, Button, Container, Field, Image, Input, Stack, Text, Heading, IconButton } from '@chakra-ui/react';
import { LuEye, LuEyeOff, LuLogIn } from 'react-icons/lu';
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
    <Box minH="100dvh" display="flex" alignItems="center" justifyContent="center" bg="page.bg" px={4} py={8}>
      <Container maxW="md" w="full" p={0}>
        <Stack gap={6}>
          <Box textAlign="center">
            <Image src="/brand/lydo-logo.png" alt="Boac LYDS logo" mx="auto" h={{ base: '76px', md: '88px' }} objectFit="contain" mb={4} />
            <Heading as="h1" fontSize={{ base: '1.5rem', md: '1.75rem' }} color="primary.800" fontWeight="750">
              Boac Youth Information System
            </Heading>
            <Text color="text.secondary" mt={2}>Authorized account access</Text>
          </Box>

          <Box as="form" onSubmit={handleSubmit} bg="surface" borderWidth="1px" borderColor="border" borderRadius="md" boxShadow="panel" p={{ base: 5, md: 7 }}>
            <Stack gap={5}>
              <Box>
                <Heading as="h2" fontSize="lg" fontWeight="700">Sign in</Heading>
                <Text color="text.secondary" fontSize="sm" mt={1}>Enter your official account credentials.</Text>
              </Box>
              <Field.Root required>
                <Field.Label fontWeight="600">Email address</Field.Label>
                <Input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  minH="48px"
                  borderColor="border.strong"
                />
              </Field.Root>

              <Field.Root required>
                <Field.Label fontWeight="600">Password</Field.Label>
                <Box position="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    pr="48px"
                    minH="48px"
                    borderColor="border.strong"
                  />
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    position="absolute"
                    right="2px"
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
                <Alert.Root status="error" borderRadius="md" role="alert">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Sign in failed</Alert.Title>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              <Button
                type="submit"
                colorPalette="green"
                size="lg"
                loading={loading}
                w="full"
                minH="48px"
              >
                <LuLogIn />
                Sign In
              </Button>
            </Stack>
          </Box>
          <Text textAlign="center" color="text.muted" fontSize="xs">
            Local Youth Development Office, Municipality of Boac
          </Text>
        </Stack>
      </Container>
    </Box>
  );
};

export default LoginPage;
