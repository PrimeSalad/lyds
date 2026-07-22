import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Button, HStack, VStack } from '@chakra-ui/react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { TextField } from '../../../../shared/forms/FormFields';
import { showToast } from '../../../../shared/toast';
import { barangayApi } from '../../infrastructure/barangay-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const BarangayFormPage = () => {
  const navigate = useNavigate();
  const { barangayId } = useParams();
  const isEditing = !!barangayId;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [province, setProvince] = useState('');
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
      if (isEditing) {
        await barangayApi.update(barangayId!, { name, municipality, province });
        showToast.success('Barangay updated');
      } else {
        await barangayApi.create({ code, name, municipality, province });
        showToast.success('Barangay created');
      }
      navigate('/barangays');
    } catch {
      showToast.error('Failed to save barangay');
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
            required
            disabled={isEditing}
            placeholder="e.g. BRG-001"
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
