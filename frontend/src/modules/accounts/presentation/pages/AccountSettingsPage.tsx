import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, Field, Grid, Heading, HStack, IconButton, Input, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import { LuEye, LuEyeOff, LuKeyRound, LuSave } from 'react-icons/lu';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { TextField } from '../../../../shared/forms/FormFields';
import { showToast } from '../../../../shared/toast';
import { authApi } from '../../../auth/infrastructure/auth-api';
import { loadProfile } from '../../../auth/application/auth-store';
import { useAppDispatch, useAppSelector } from '../../../../redux/hooks';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateStrongPassword,
} from '../../../auth/domain/password-policy';

const AccountSettingsPage = () => {
  const dispatch = useAppDispatch();
  const mustChangePassword = useAppSelector((state) => state.auth.profile?.mustChangePassword ?? false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    authApi.getAccountSettings()
      .then(({ profile, email: accountEmail }) => {
        setEmail(accountEmail);
        setFullName(profile.full_name);
        setContactNumber(profile.contact_number ?? '');
        setPositionTitle(profile.position_title ?? '');
        setRole(profile.role === 'ADMIN' ? 'Administrator' : 'SK Official');
      })
      .catch((error) => showToast.error({
        title: 'Could not load account settings',
        description: error instanceof Error ? error.message : 'Refresh the page and try again.',
      }))
      .finally(() => setLoading(false));
  }, []);

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) return;
    setProfileSaving(true);
    try {
      await authApi.updateAccountSettings({
        full_name: fullName.trim(),
        contact_number: contactNumber.trim() || undefined,
        position_title: positionTitle.trim() || undefined,
      });
      showToast.success('Profile details updated');
    } catch (error) {
      showToast.error({
        title: 'Profile was not updated',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    const strongPasswordError = validateStrongPassword(newPassword);
    if (strongPasswordError) {
      setPasswordError(strongPasswordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await authApi.updatePassword(currentPassword, newPassword);
      await authApi.confirmPasswordChanged();
      await dispatch(loadProfile()).unwrap();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast.success('Password updated');
    } catch (error) {
      showToast.error({
        title: 'Password was not updated',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Card.Root maxW="720px" mx="auto" borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body py={14}>
            <VStack gap={3} color="text.secondary" role="status">
              <Spinner color="primary.600" />
              <Text fontSize="sm">Loading account settings...</Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Account Settings"
        description="Update your profile details and password."
      />

      {mustChangePassword && (
        <Alert.Root status="warning" maxW="980px" mb={6} borderRadius="md" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Replace your temporary password</Alert.Title>
            <Alert.Description>
              You cannot use the rest of the system until you set a strong private password below.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} maxW="980px" mb={6}>
        {[
          { label: 'Account email', value: email || '—' },
          { label: 'Role', value: role || '—' },
          { label: 'Contact', value: contactNumber || 'No contact number' },
        ].map((item) => (
          <Card.Root key={item.label} borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={5}>
              <Text fontSize="sm" color="text.muted">{item.label}</Text>
              <Text fontWeight="700" mt={1} overflowWrap="anywhere">{item.value}</Text>
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>

      <Grid maxW="980px" templateColumns={{ base: '1fr', xl: 'minmax(0, 1.1fr) minmax(340px, 0.9fr)' }} gap={6} alignItems="start">
        <Card.Root as="form" onSubmit={handleProfileSubmit} borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={{ base: 5, md: 7 }}>
            <Heading as="h2" fontSize="lg" fontWeight="600">Profile</Heading>
            <Text color="text.secondary" fontSize="sm" mt={1} mb={6}>Keep your account information current.</Text>
            <VStack align="stretch" gap={5}>
              <TextField label="Email address" value={email} onChange={() => {}} readOnly />
              <TextField label="Account role" value={role} onChange={() => {}} readOnly />
              <TextField label="Full name" value={fullName} onChange={setFullName} required autoComplete="name" />
              <TextField label="Position or title" value={positionTitle} onChange={setPositionTitle} placeholder="SK Chairperson" />
              <TextField label="Contact number" type="tel" value={contactNumber} onChange={setContactNumber} autoComplete="tel" placeholder="09XXXXXXXXX" />
              <Button type="submit" alignSelf="flex-start" colorPalette="green" loading={profileSaving} disabled={!fullName.trim()}>
                <LuSave />
                Save Profile
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>

        <Card.Root as="form" onSubmit={handlePasswordSubmit} borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={{ base: 5, md: 7 }}>
            <HStack gap={3}>
              <LuKeyRound aria-hidden="true" />
              <Heading as="h2" fontSize="lg" fontWeight="600">Password</Heading>
            </HStack>
            <Text color="text.secondary" fontSize="sm" mt={2} mb={6}>
              Use 12–72 characters with upper- and lowercase letters, a number, and one of !@#$%^&amp;*.
            </Text>
            <VStack align="stretch" gap={5}>
              <Field.Root invalid={!!passwordError} width="full">
                <Field.Label fontFamily="heading" fontWeight="500">Current password</Field.Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setPasswordError(null);
                  }}
                  autoComplete="current-password"
                  minH="44px"
                  borderColor="border.strong"
                />
              </Field.Root>
              <Field.Root invalid={!!passwordError} width="full">
                <Field.Label fontFamily="heading" fontWeight="500">New password</Field.Label>
                <Box position="relative" width="full">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setPasswordError(null);
                    }}
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength={PASSWORD_MAX_LENGTH}
                    minH="44px"
                    width="full"
                    pr="48px"
                    borderColor="border.strong"
                  />
                  <IconButton
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    variant="ghost"
                    size="sm"
                    position="absolute"
                    right={1}
                    top="50%"
                    transform="translateY(-50%)"
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <LuEyeOff /> : <LuEye />}
                  </IconButton>
                </Box>
              </Field.Root>
              <Field.Root invalid={!!passwordError}>
                <Field.Label fontFamily="heading" fontWeight="500">Confirm new password</Field.Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setPasswordError(null);
                  }}
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN_LENGTH}
                  maxLength={PASSWORD_MAX_LENGTH}
                  minH="44px"
                  borderColor="border.strong"
                />
                {passwordError && <Field.ErrorText>{passwordError}</Field.ErrorText>}
              </Field.Root>
              <Button type="submit" alignSelf="flex-start" colorPalette="green" variant="outline" loading={passwordSaving} disabled={!currentPassword || !newPassword || !confirmPassword}>
                <LuKeyRound />
                Update Password
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Grid>
    </DashboardLayout>
  );
};

export default AccountSettingsPage;
