import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Button, HStack, VStack } from '@chakra-ui/react';
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

      <Box as="form" onSubmit={handleSubmit} maxW="640px" bg="white" border="1px solid" borderColor="border" borderRadius="lg" p={{ base: 4, md: 6 }}>
        <VStack gap={4} align="stretch">
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
          {role === 'SK_OFFICIAL' && (
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
          )}
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

          <HStack gap={3} mt={4}>
            <Button type="submit" colorPalette="green" loading={loading}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/accounts')}>
              Cancel
            </Button>
          </HStack>
        </VStack>
      </Box>
    </DashboardLayout>
  );
};

export default AccountFormPage;
