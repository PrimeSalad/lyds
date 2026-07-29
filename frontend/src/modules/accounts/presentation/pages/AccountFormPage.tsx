import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Button, Card, Field, Grid, Heading, HStack, IconButton, Input, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { TextField, SelectField } from '../../../../shared/forms/FormFields';
import { showToast } from '../../../../shared/toast';
import { accountApi } from '../../infrastructure/account-api';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateStrongPassword,
} from '../../../auth/domain/password-policy';

const AccountFormPage = () => {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const isEditing = !!accountId;

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SK_OFFICIAL'>('SK_OFFICIAL');
  const [barangayId, setBarangayId] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  useEffect(() => {
    barangayApi.list().then(setBarangays).catch(() => {});
  }, []);

  useEffect(() => {
    if (accountId) {
      accountApi
        .getById(accountId)
        .then((a) => {
          setEmail(a.id);
          setFullName(a.full_name);
          setRole(a.role);
          setContactNumber(a.contact_number ?? '');
          setPositionTitle(a.position_title ?? '');
        })
        .catch(() => {
          showToast.error('Failed to load account');
          navigate('/accounts');
        })
        .finally(() => setFetching(false));
    }
  }, [accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    const strongPasswordError = temporaryPassword ? validateStrongPassword(temporaryPassword) : null;
    if (strongPasswordError) {
      setPasswordError(strongPasswordError.replace('Password', 'Temporary password'));
      return;
    }
    if (!isEditing && !temporaryPassword) {
      setPasswordError('Set a temporary password for the new account.');
      return;
    }
    if (temporaryPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setLoading(true);

    try {
      if (isEditing) {
        await accountApi.update(accountId!, {
          full_name: fullName,
          contact_number: contactNumber || undefined,
          position_title: positionTitle || undefined,
          temporary_password: temporaryPassword || undefined,
        });
        showToast.success(temporaryPassword ? 'Account and temporary password updated' : 'Account updated');
      } else {
        await accountApi.create({
          email,
          temporary_password: temporaryPassword,
          full_name: fullName,
          role,
          barangay_id: role === 'SK_OFFICIAL' ? barangayId : undefined,
          contact_number: contactNumber || undefined,
          position_title: positionTitle || undefined,
        });
        showToast.success('Account created');
      }
      navigate('/accounts');
    } catch (error) {
      showToast.error({
        title: 'Failed to save account',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return null;

  return (
    <DashboardLayout>
      <PageHeader
        title={isEditing ? 'Edit Account' : 'Add Account'}
        description="Create official access and keep profile details current."
      />

      <Grid maxW="1120px" templateColumns={{ base: '1fr', xl: 'minmax(0, 1.15fr) minmax(300px, 0.85fr)' }} gap={6} alignItems="start">
        <Card.Root as="form" onSubmit={handleSubmit} borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={{ base: 4, md: 6 }}>
            <VStack gap={6} align="stretch">
              <Box>
                <Heading as="h2" fontSize="lg" fontWeight="600">
                  {isEditing ? 'Update account details' : 'Create a new account'}
                </Heading>
                <Text color="text.secondary" fontSize="sm" mt={2}>
                  Use clear identity, role, and assignment details so access stays easy to audit.
                </Text>
              </Box>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
                {!isEditing && (
                  <TextField
                    label="Email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    required
                    placeholder="user@example.com"
                  />
                )}
                <TextField
                  label="Full Name"
                  name="full_name"
                  value={fullName}
                  onChange={setFullName}
                  required
                  placeholder="Juan Dela Cruz"
                />
              </SimpleGrid>

              <Box>
                <Heading as="h3" fontSize="md" fontWeight="600">
                  {isEditing ? 'Reset temporary password' : 'Temporary password'}
                </Heading>
                <Text color="text.secondary" fontSize="sm" mt={1} mb={4}>
                  {isEditing
                    ? 'Leave both fields blank to keep the current password.'
                    : 'Share this password securely. The account holder should change it after signing in.'}
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
                  <Field.Root invalid={!!passwordError} required={!isEditing}>
                    <Field.Label fontWeight="600" color="text.primary">
                      {isEditing ? 'New temporary password' : 'Temporary password'}
                    </Field.Label>
                    <Box position="relative">
                      <Input
                        name="temporary_password"
                        type={showPassword ? 'text' : 'password'}
                        value={temporaryPassword}
                        onChange={(event) => {
                          setTemporaryPassword(event.target.value);
                          setPasswordError(null);
                        }}
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN_LENGTH}
                        maxLength={PASSWORD_MAX_LENGTH}
                        minH="44px"
                        pr="52px"
                        borderColor="border.strong"
                      />
                      <IconButton
                        type="button"
                        aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                        variant="ghost"
                        position="absolute"
                        right={0}
                        top="50%"
                        transform="translateY(-50%)"
                        minW="44px"
                        minH="44px"
                        onClick={() => setShowPassword((visible) => !visible)}
                      >
                        {showPassword ? <LuEyeOff /> : <LuEye />}
                      </IconButton>
                    </Box>
                    {!passwordError && (
                      <Field.HelperText>
                        Use 12–72 characters with upper- and lowercase letters, a number, and one of !@#$%^&amp;*.
                      </Field.HelperText>
                    )}
                  </Field.Root>
                  <Field.Root invalid={!!passwordError} required={!isEditing}>
                    <Field.Label fontWeight="600" color="text.primary">Confirm temporary password</Field.Label>
                    <Input
                      name="confirm_temporary_password"
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
                </SimpleGrid>
              </Box>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
                <SelectField
                  label="Role"
                  name="role"
                  value={role}
                  onChange={(v) => setRole(v as 'ADMIN' | 'SK_OFFICIAL')}
                  options={[
                    { value: 'SK_OFFICIAL', label: 'SK Official' },
                    { value: 'ADMIN', label: 'Administrator' },
                  ]}
                  disabled={isEditing}
                />
                {role === 'SK_OFFICIAL' ? (
                  <SelectField
                    label="Barangay"
                    name="barangay_id"
                    value={barangayId}
                    onChange={setBarangayId}
                    options={barangays.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                    placeholder="Select barangay"
                    required
                    disabled={isEditing}
                  />
                ) : (
                  <Box p={4} borderWidth="1px" borderColor="border" borderRadius="md" bg="surface.muted">
                    <Text fontFamily="heading" fontSize="sm" fontWeight="500" mb={1}>Barangay</Text>
                    <Text color="text.secondary" fontSize="sm">
                      Administrators do not need a barangay assignment.
                    </Text>
                  </Box>
                )}
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
                <TextField
                  label="Contact Number"
                  name="contact_number"
                  value={contactNumber}
                  onChange={setContactNumber}
                  placeholder="09XXXXXXXXX"
                />
                <TextField
                  label="Position/Title"
                  name="position_title"
                  value={positionTitle}
                  onChange={setPositionTitle}
                  placeholder="SK Chairperson"
                />
              </SimpleGrid>

              <HStack gap={3} pt={2} wrap="wrap">
                <Button type="submit" colorPalette="green" loading={loading}>
                  {isEditing ? 'Update Account' : 'Create Account'}
                </Button>
                <Button variant="outline" onClick={() => navigate('/accounts')}>
                  Cancel
                </Button>
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={{ base: 4, md: 6 }}>
            <VStack align="stretch" gap={4}>
              <Box>
                <Heading as="h3" fontSize="md" fontWeight="600">Account rules</Heading>
                <Text color="text.secondary" fontSize="sm" mt={2}>
                  Keep this profile aligned with the active barangay assignment and the real-world office holder.
                </Text>
              </Box>
              <Box p={4} borderRadius="md" bg="surface.muted" borderWidth="1px" borderColor="border">
                <Text fontWeight="600">Recommended fields</Text>
                <Text color="text.secondary" fontSize="sm" mt={1}>
                  Full name, role, barangay, contact number, and position title should match the current assignment record.
                </Text>
              </Box>
              <Box p={4} borderRadius="md" bg="surface.muted" borderWidth="1px" borderColor="border">
                <Text fontWeight="600">Editing limits</Text>
                <Text color="text.secondary" fontSize="sm" mt={1}>
                  Role and barangay assignment stay locked after creation to protect account integrity.
                </Text>
              </Box>
              <Box p={4} borderRadius="md" bg="surface.muted" borderWidth="1px" borderColor="border">
                <Text fontWeight="600">Password handoff</Text>
                <Text color="text.secondary" fontSize="sm" mt={1}>
                  Share temporary passwords privately. Account holders can replace them from Account Settings after signing in.
                </Text>
              </Box>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Grid>
    </DashboardLayout>
  );
};

export default AccountFormPage;
