import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Box, Button, Card, SimpleGrid, Text } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { DataTable, type Column, type Action } from '../../../../shared/tables/DataTable';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { StatusBadge } from '../../../../shared/components/StatusBadge';
import { showToast } from '../../../../shared/toast';
import { barangayApi, type Barangay } from '../../infrastructure/barangay-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const BarangayListPage = () => {
  const navigate = useNavigate();
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';

  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(true);

  const summary = useMemo(() => ({
    total: barangays.length,
    active: barangays.filter((barangay) => barangay.is_active).length,
    inactive: barangays.filter((barangay) => !barangay.is_active).length,
  }), [barangays]);

  const loadBarangays = async () => {
    try {
      const data = await barangayApi.list();
      setBarangays(data);
    } catch {
      showToast.error('Failed to load barangays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBarangays();
  }, []);

  const columns: Column<Barangay>[] = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'municipality', header: 'Municipality', sortable: true },
    { key: 'province', header: 'Province', sortable: true },
    {
      key: 'is_active',
      header: 'Status',
      align: 'center',
      render: (row) => (
        <StatusBadge status={row.is_active ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
  ];

  const actions: Action<Barangay>[] = [
    {
      label: 'Edit',
      onClick: (row) => navigate(`/barangays/${row.id}/edit`),
      show: () => isAdmin,
    },
    {
      label: 'Deactivate',
      onClick: async (row) => {
        try {
          await barangayApi.deactivate(row.id);
          showToast.success('Barangay deactivated');
          loadBarangays();
        } catch {
          showToast.error('Failed to deactivate');
        }
      },
      variant: 'danger',
      confirm: {
        title: (row) => `Deactivate ${row.name}?`,
        description: (row) => `${row.name} will no longer be available for new records or account assignments. Existing records will remain unchanged.`,
        confirmLabel: 'Deactivate',
        variant: 'danger',
      },
      show: (row) => isAdmin && row.is_active,
    },
    {
      label: 'Activate',
      onClick: async (row) => {
        try {
          await barangayApi.activate(row.id);
          showToast.success('Barangay activated');
          loadBarangays();
        } catch {
          showToast.error('Failed to activate');
        }
      },
      confirm: {
        title: (row) => `Activate ${row.name}?`,
        description: (row) => `${row.name} will become available for records and account assignments.`,
        confirmLabel: 'Activate',
      },
      show: (row) => isAdmin && !row.is_active,
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Barangays"
        description="Maintain active barangays and administrative metadata."
        actions={isAdmin && (
          <Button colorPalette="green" onClick={() => navigate('/barangays/new')}>
            Add Barangay
          </Button>
        )}
      />

      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4} mb={6}>
        {[
          { label: 'All barangays', value: summary.total, tone: 'blue' },
          { label: 'Active', value: summary.active, tone: 'green' },
          { label: 'Inactive', value: summary.inactive, tone: 'orange' },
        ].map((item) => (
          <Card.Root key={item.label} borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={5}>
              <Text fontSize="sm" color="text.muted">{item.label}</Text>
              <Text fontFamily="heading" fontSize="2xl" fontWeight="700" color={`${item.tone}.700`} mt={1}>
                {item.value}
              </Text>
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>

      <Box mb={3}>
        <Text fontFamily="heading" fontWeight="600">Barangay directory</Text>
        <Text color="text.muted" fontSize="sm" mt={1}>Active and inactive barangays remain visible in this list.</Text>
      </Box>

      <DataTable
        columns={columns}
        data={barangays}
        actions={actions}
        loading={loading}
        searchPlaceholder="Search barangays..."
        searchKey="name"
        emptyMessage="No barangays found."
      />
    </DashboardLayout>
  );
};

export default BarangayListPage;
