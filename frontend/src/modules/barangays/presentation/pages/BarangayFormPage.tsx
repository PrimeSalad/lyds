import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Button, HStack, VStack } from '@chakra-ui/react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { TextField } from '../../../../shared/forms/FormFields';
import { showToast } from '../../../../shared/toast';
import { barangayApi } from '../../infrastructure/barangay-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const BOAC_MUNICIPALITY = 'Boac';
const MARINDUQUE_PROVINCE = 'Marinduque';

const toBarangayCode = (value: string) =>
  `BOAC-${value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;

const BarangayFormPage = () => {
  const navigate = useNavigate();
  const { barangayId } = useParams();
  const isEditing = !!barangayId;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [municipality, setMunicipality] = useState(BOAC_MUNICIPALITY);
  const [province, setProvince] = useState(MARINDUQUE_PROVINCE);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  useEffect(() => {
    if (barangayId) {
      barangayApi
        .getById(barangayId)
        .then((b) => {
          setCode(b.code);
          setName(b.name);
          setMunicipality(b.municipality);
          setProvince(b.province);
        })
        .catch(() => {
          showToast.error('Failed to load barangay');
          navigate('/barangays');
        })
        .finally(() => setFetching(false));
    }
  }, [barangayId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedName = name.trim();
      const trimmedMunicipality = municipality.trim() || BOAC_MUNICIPALITY;
      const trimmedProvince = province.trim() || MARINDUQUE_PROVINCE;
      const trimmedCode = code.trim() || toBarangayCode(trimmedName);

      if (!trimmedName) {
        throw new Error('Barangay name is required.');
      }

      if (isEditing) {
        await barangayApi.update(barangayId!, {
          name: trimmedName,
          municipality: trimmedMunicipality,
          province: trimmedProvince,
        });
        showToast.success('Barangay updated');
      } else {
        await barangayApi.create({
          code: trimmedCode,
          name: trimmedName,
          municipality: trimmedMunicipality,
          province: trimmedProvince,
        });
        showToast.success('Barangay created');
      }
      navigate('/barangays');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to save barangay');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return null;

  return (
    <DashboardLayout>
      <PageHeader
        title={isEditing ? 'Edit Barangay' : 'Add Barangay'}
        description="Maintain barangay code, location, and administrative labels."
      />

      <Box as="form" onSubmit={handleSubmit} maxW="640px" bg="white" border="1px solid" borderColor="border" borderRadius="lg" p={{ base: 4, md: 6 }}>
        <VStack gap={4} align="stretch">
          <TextField
            label="Code"
            name="code"
            value={code}
            onChange={setCode}
            disabled={isEditing}
            placeholder={name ? toBarangayCode(name) : 'Auto-generated from name'}
          />
          <TextField
            label="Name"
            name="name"
            value={name}
            onChange={setName}
            required
            placeholder="Barangay name"
          />
          <TextField
            label="Municipality"
            name="municipality"
            value={municipality}
            onChange={setMunicipality}
            placeholder="Municipality"
          />
          <TextField
            label="Province"
            name="province"
            value={province}
            onChange={setProvince}
            placeholder="Province"
          />

          <HStack gap={3} mt={4}>
            <Button type="submit" colorPalette="green" loading={loading}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/barangays')}>
              Cancel
            </Button>
          </HStack>
        </VStack>
      </Box>
    </DashboardLayout>
  );
};

export default BarangayFormPage;
