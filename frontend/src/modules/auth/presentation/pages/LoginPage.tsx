import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Box, Button, Field, Flex, Grid, Heading, HStack, IconButton, Image, Input, Stack, Text } from '@chakra-ui/react';
import { LuArrowRight, LuEye, LuEyeOff, LuLockKeyhole, LuMail } from 'react-icons/lu';
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
    <Box minH="100dvh" bg="#F5F7F6" borderTop="4px solid" borderColor="primary.700" display="flex" flexDirection="column">
      <Flex as="header" bg="white" borderBottom="1px solid" borderColor="border" minH={{ base: '68px', md: '84px' }} px={{ base: 4, md: 8 }} align="center">
        <Flex width="full" maxW="1280px" mx="auto" align="center">
          <HStack gap={{ base: 3, md: 4 }}>
            <Image src="/brand/lydo-logo.png" alt="Boac LYDS logo" width={{ base: '48px', md: '68px' }} />
            <Box borderLeft="1px solid" borderColor="border.strong" pl={{ base: 3, md: 4 }}>
              <Text fontFamily="heading" fontWeight="600" fontSize={{ base: '13px', md: 'md' }} color="text.primary">
                <Box as="span" display={{ base: 'inline', sm: 'none' }}>Boac Youth IS</Box>
                <Box as="span" display={{ base: 'none', sm: 'inline' }}>Boac Youth Information System</Box>
              </Text>
              <Text display={{ base: 'none', sm: 'block' }} color="text.muted" fontSize="xs" mt={1}>
                Local Youth Development Office
              </Text>
            </Box>
          </HStack>
        </Flex>
      </Flex>

      <Flex as="main" flex="1" align={{ base: 'flex-start', lg: 'center' }} px={{ base: 5, md: 8 }} py={{ base: 7, md: 16 }}>
        <Grid
          width="full"
          maxW="1040px"
          mx="auto"
          templateColumns={{ base: '1fr', lg: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' }}
          gap={{ base: 7, lg: 20 }}
          alignItems="start"
        >
          <Box pt={{ lg: 5 }}>
            <Text fontFamily="heading" fontWeight="600" color="primary.700" fontSize="sm" mb={{ base: 3, md: 4 }}>
              BOAC LYDS
            </Text>
            <Heading as="h1" fontSize={{ base: '1.75rem', md: '2.5rem', lg: '3rem' }} lineHeight="1.18" fontWeight="600" maxW="440px">
              Sign in to your account
            </Heading>
            <Text color="text.secondary" fontSize={{ base: 'md', md: 'lg' }} lineHeight={{ base: '1.55', md: '1.7' }} mt={{ base: 3, md: 5 }} maxW="420px">
              Access the youth information management workspace for the Municipality of Boac.
            </Text>
          </Box>

          <Box borderTop={{ base: '1px solid', lg: 'none' }} borderLeft={{ base: 'none', lg: '1px solid' }} borderColor="border.strong" pt={{ base: 7, lg: 4 }} pl={{ lg: 16 }}>
            <Heading as="h2" fontSize="xl" fontWeight="600">Account details</Heading>
            <Text color="text.secondary" mt={2} mb={{ base: 6, md: 8 }}>Enter your registered email and password.</Text>

            <Box as="form" onSubmit={handleSubmit} width="full">
              <Stack gap={{ base: 4, md: 5 }}>
              <Field.Root required width="full">
                <Field.Label fontFamily="heading" fontWeight="500" fontSize="sm" mb={2}>Email address</Field.Label>
                <Box position="relative" width="full">
                  <Box position="absolute" left={4} top="50%" transform="translateY(-50%)" color="text.muted" zIndex={1} pointerEvents="none">
                    <LuMail size={19} aria-hidden="true" />
                  </Box>
                  <Input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@boac.gov.ph"
                    minH={{ base: '52px', md: '54px' }}
                    width="full"
                    pl={12}
                    borderRadius="6px"
                    borderColor="border.strong"
                    bg="white"
                    _hover={{ borderColor: 'gray.400' }}
                    _focusVisible={{ borderColor: 'primary.600', boxShadow: '0 0 0 1px var(--chakra-colors-primary-600)' }}
                  />
                </Box>
              </Field.Root>

              <Field.Root required width="full">
                <Field.Label fontFamily="heading" fontWeight="500" fontSize="sm" mb={2}>Password</Field.Label>
                <Box position="relative" width="full">
                  <Box position="absolute" left={4} top="50%" transform="translateY(-50%)" color="text.muted" zIndex={1} pointerEvents="none">
                    <LuLockKeyhole size={19} aria-hidden="true" />
                  </Box>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    pl={12}
                    pr="52px"
                    minH={{ base: '52px', md: '54px' }}
                    width="full"
                    borderRadius="6px"
                    borderColor="border.strong"
                    bg="white"
                    _hover={{ borderColor: 'gray.400' }}
                    _focusVisible={{ borderColor: 'primary.600', boxShadow: '0 0 0 1px var(--chakra-colors-primary-600)' }}
                  />
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    position="absolute"
                    right="5px"
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
                <Alert.Root status="error" borderRadius="6px" role="alert">
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
                minH={{ base: '52px', md: '54px' }}
                borderRadius="6px"
                bg="primary.700"
                _hover={{ bg: 'primary.800' }}
                justifyContent="space-between"
                px={5}
                mt={1}
              >
                <Text as="span" fontFamily="heading" fontWeight="600">Sign In</Text>
                <LuArrowRight size={19} />
              </Button>
            </Stack>
          </Box>

            <Text color="text.muted" fontSize="sm" mt={{ base: 5, md: 7 }} lineHeight="1.6">
              Account access is managed by the system administrator.
            </Text>
          </Box>
        </Grid>
      </Flex>

    </Box>
  );
};

export default LoginPage;
