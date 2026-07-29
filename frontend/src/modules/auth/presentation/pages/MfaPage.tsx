import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Box, Button, Card, Field, Flex, Heading, HStack, Image, Input, Spinner, Text, VStack } from '@chakra-ui/react';
import { LuCopy, LuKeyRound, LuLogOut, LuShieldCheck, LuSmartphone } from 'react-icons/lu';
import { authApi, type MfaEnrollment } from '../../infrastructure/auth-api';
import { loadProfile } from '../../application/auth-store';
import { useAppDispatch } from '../../../../redux/hooks';

type Screen = 'loading' | 'setup_intro' | 'setup_code' | 'challenge';

const normalizeCode = (value: string) => value.replace(/\D/g, '').slice(0, 6);

const MfaPage = () => {
  const [screen, setScreen] = useState<Screen>('loading');
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;
    authApi.getMfaStatus()
      .then(async (status) => {
        if (!active) return;
        if (status === 'signed_out') {
          navigate('/login', { replace: true });
        } else if (status === 'verified') {
          const profile = await dispatch(loadProfile()).unwrap();
          navigate(profile.mustChangePassword ? '/account-settings' : '/', { replace: true });
        } else {
          setScreen(status === 'challenge_required' ? 'challenge' : 'setup_intro');
        }
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Two-factor authentication could not be loaded.');
        setScreen('setup_intro');
      });
    return () => { active = false; };
  }, [dispatch, navigate]);

  const finishSignIn = async () => {
    const profile = await dispatch(loadProfile()).unwrap();
    navigate(profile.mustChangePassword ? '/account-settings' : '/', { replace: true });
  };

  const startEnrollment = async () => {
    setWorking(true);
    setError(null);
    try {
      const nextEnrollment = await authApi.beginMfaEnrollment();
      setEnrollment(nextEnrollment);
      setScreen('setup_code');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authenticator setup could not be started.');
    } finally {
      setWorking(false);
    }
  };

  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length !== 6) {
      setError('Enter the complete 6-digit code from your authenticator app.');
      return;
    }
    setWorking(true);
    setError(null);
    try {
      if (screen === 'setup_code') {
        if (!enrollment) throw new Error('Authenticator setup expired. Start setup again.');
        await authApi.verifyMfaEnrollment(enrollment.factorId, code);
      } else {
        await authApi.verifyMfaChallenge(code);
      }
      await finishSignIn();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The verification code was not accepted.');
      setCode('');
    } finally {
      setWorking(false);
    }
  };

  const signOut = async () => {
    await authApi.signOut('local').catch(() => {});
    navigate('/login', { replace: true });
  };

  const copySecret = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
    } catch {
      setError('The setup key could not be copied. Select and copy it manually.');
    }
  };

  return (
    <Box minH="100dvh" bg="page.bg" borderTop="4px solid" borderColor="primary.700">
      <Flex as="header" bg="white" borderBottomWidth="1px" borderColor="border" minH={{ base: '68px', md: '84px' }} px={{ base: 4, md: 8 }} align="center">
        <HStack width="full" maxW="1040px" mx="auto" gap={3}>
          <Image src="/brand/lydo-logo.png" alt="Boac LYDS logo" width={{ base: '48px', md: '64px' }} />
          <Box>
            <Text fontFamily="heading" fontWeight="600">Boac Youth Information System</Text>
            <Text color="text.muted" fontSize="xs">Secure account verification</Text>
          </Box>
        </HStack>
      </Flex>

      <Flex as="main" minH="calc(100dvh - 88px)" align="center" justify="center" px={4} py={8}>
        <Card.Root width="full" maxW="560px" borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={{ base: 5, md: 8 }}>
            {screen === 'loading' ? (
              <VStack py={12} gap={4} role="status">
                <Spinner color="primary.600" />
                <Text color="text.secondary">Checking account security...</Text>
              </VStack>
            ) : (
              <VStack align="stretch" gap={6}>
                <HStack gap={3} align="flex-start">
                  <Box color="primary.700" pt={1}><LuShieldCheck size={26} aria-hidden="true" /></Box>
                  <Box>
                    <Heading as="h1" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="650">
                      {screen === 'challenge' ? 'Two-factor verification' : 'Protect your account'}
                    </Heading>
                    <Text color="text.secondary" mt={2} lineHeight="1.6">
                      {screen === 'challenge'
                        ? 'Enter the current code from your authenticator app to finish signing in.'
                        : 'Authenticator-app verification is required before this account can access youth information.'}
                    </Text>
                  </Box>
                </HStack>

                {screen === 'setup_intro' && (
                  <VStack align="stretch" gap={4}>
                    <Box p={4} bg="surface.muted" borderWidth="1px" borderColor="border" borderRadius="md">
                      <HStack align="flex-start" gap={3}>
                        <LuSmartphone size={22} aria-hidden="true" />
                        <Text color="text.secondary" lineHeight="1.6">
                          Install Google Authenticator, Microsoft Authenticator, Authy, or another TOTP-compatible app before continuing.
                        </Text>
                      </HStack>
                    </Box>
                    <Button colorPalette="green" minH="48px" onClick={startEnrollment} loading={working}>
                      <LuKeyRound /> Set up authenticator
                    </Button>
                  </VStack>
                )}

                {screen === 'setup_code' && enrollment && (
                  <VStack as="form" onSubmit={submitCode} align="stretch" gap={5}>
                    <VStack align="stretch" gap={3}>
                      <Text fontWeight="600">1. Scan this QR code</Text>
                      <Box alignSelf="center" p={3} bg="white" borderWidth="1px" borderColor="border.strong" borderRadius="md">
                        <Image src={enrollment.qrCode} alt="QR code for authenticator app setup" width="220px" height="220px" />
                      </Box>
                      <Text color="text.secondary" fontSize="sm">Cannot scan it? Enter this setup key manually:</Text>
                      <HStack align="stretch" gap={2}>
                        <Box flex="1" p={3} bg="surface.muted" borderRadius="md" fontFamily="mono" overflowWrap="anywhere">
                          {enrollment.secret}
                        </Box>
                        <Button type="button" variant="outline" minH="44px" onClick={copySecret} aria-label="Copy authenticator setup key">
                          <LuCopy /> Copy
                        </Button>
                      </HStack>
                      <Text aria-live="polite" color="primary.700" fontSize="sm" minH="20px">{copied ? 'Setup key copied.' : ''}</Text>
                    </VStack>
                    <Box as="hr" borderColor="border" />
                    <Field.Root required invalid={!!error}>
                      <Field.Label fontWeight="600">2. Enter the 6-digit code</Field.Label>
                      <Input
                        value={code}
                        onChange={(event) => { setCode(normalizeCode(event.target.value)); setError(null); }}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]*"
                        maxLength={6}
                        minH="52px"
                        fontSize="xl"
                        letterSpacing="0.32em"
                        textAlign="center"
                        aria-describedby="mfa-code-help"
                      />
                      <Field.HelperText id="mfa-code-help">Codes change every 30 seconds.</Field.HelperText>
                    </Field.Root>
                    <Button type="submit" colorPalette="green" minH="48px" loading={working} disabled={code.length !== 6}>
                      Verify and continue
                    </Button>
                  </VStack>
                )}

                {screen === 'challenge' && (
                  <VStack as="form" onSubmit={submitCode} align="stretch" gap={5}>
                    <Field.Root required invalid={!!error}>
                      <Field.Label fontWeight="600">Authenticator code</Field.Label>
                      <Input
                        autoFocus
                        value={code}
                        onChange={(event) => { setCode(normalizeCode(event.target.value)); setError(null); }}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]*"
                        maxLength={6}
                        minH="54px"
                        fontSize="xl"
                        letterSpacing="0.32em"
                        textAlign="center"
                      />
                    </Field.Root>
                    <Button type="submit" colorPalette="green" minH="48px" loading={working} disabled={code.length !== 6}>
                      Verify and sign in
                    </Button>
                  </VStack>
                )}

                {error && (
                  <Alert.Root status="error" role="alert" borderRadius="md">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Verification failed</Alert.Title>
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}

                <Button variant="ghost" alignSelf="flex-start" minH="44px" onClick={signOut}>
                  <LuLogOut /> Sign out
                </Button>
              </VStack>
            )}
          </Card.Body>
        </Card.Root>
      </Flex>
    </Box>
  );
};

export default MfaPage;
