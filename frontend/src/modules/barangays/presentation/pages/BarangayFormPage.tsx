import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Button, Card, Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react';
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

      <Grid
        maxW="1040px"
        templateColumns={{ base: '1fr', lg: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)' }}
        gap={6}
        alignItems="start"
      >
        <Card.Root as="form" onSubmit={handleSubmit} borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={{ base: 5, md: 7 }}>
            <VStack gap={5} align="stretch">
              <Box>
                <Heading as="h2" fontSize="lg" fontWeight="600">
                  {isEditing ? 'Barangay details' : 'Create a barangay'}
                </Heading>
                <Text color="text.secondary" fontSize="sm" mt={2}>
                  Use the official barangay name and location used in youth records.
                </Text>
              </Box>
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

              <HStack gap={3} pt={2} wrap="wrap">
                <Button type="submit" colorPalette="green" loading={loading}>
                  {isEditing ? 'Update Barangay' : 'Create Barangay'}
                </Button>
                <Button variant="outline" onClick={() => navigate('/barangays')}>
                  Cancel
                </Button>
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={{ base: 5, md: 6 }}>
            <VStack align="stretch" gap={4}>
              <Box>
                <Heading as="h3" fontSize="md" fontWeight="600">Directory rules</Heading>
                <Text color="text.secondary" fontSize="sm" mt={2}>
                  Barangays stay visible after deactivation so historical records and coverage remain complete.
                </Text>
              </Box>
              <Box p={4} bg="surface.muted" borderWidth="1px" borderColor="border" borderRadius="md">
                <Text fontFamily="heading" fontWeight="600" fontSize="sm">Automatic code</Text>
                <Text color="text.secondary" fontSize="sm" mt={1}>
                  New codes follow the BOAC-BARANGAY-NAME format when no custom code is supplied.
                </Text>
              </Box>
              <Box p={4} bg="surface.muted" borderWidth="1px" borderColor="border" borderRadius="md">
                <Text fontFamily="heading" fontWeight="600" fontSize="sm">Safe status changes</Text>
                <Text color="text.secondary" fontSize="sm" mt={1}>
                  Use Activate or Deactivate from the directory instead of removing a barangay.
                </Text>
              </Box>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Grid>
    </DashboardLayout>
  );
};

export default BarangayFormPage;
