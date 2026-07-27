import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Button, Card, Grid, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { TextField, SelectField } from '../../../../shared/forms/FormFields';
import { showToast } from '../../../../shared/toast';
import { accountApi } from '../../infrastructure/account-api';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

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
    setLoading(true);

    try {
      if (isEditing) {
        await accountApi.update(accountId!, {
          full_name: fullName,
          contact_number: contactNumber || undefined,
          position_title: positionTitle || undefined,
        });
        showToast.success('Account updated');
      } else {
        await accountApi.create({
          email,
          full_name: fullName,
          role,
          barangay_id: role === 'SK_OFFICIAL' ? barangayId : undefined,
          contact_number: contactNumber || undefined,
          position_title: positionTitle || undefined,
        });
        showToast.success('Account created. Invitation sent.');
      }
      navigate('/accounts');
    } catch {
      showToast.error('Failed to save account');
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
            </VStack>
          </Card.Body>
        </Card.Root>
      </Grid>
    </DashboardLayout>
  );
};

export default AccountFormPage;
