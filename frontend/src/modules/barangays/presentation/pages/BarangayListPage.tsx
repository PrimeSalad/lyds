import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@chakra-ui/react';
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
