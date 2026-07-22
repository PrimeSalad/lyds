import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button, Badge, Text } from '@chakra-ui/react';
import { DataTable, type Column, type Action } from '../../../../shared/tables/DataTable';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { StatusBadge } from '../../../../shared/components/StatusBadge';
import { showToast } from '../../../../shared/toast';
import { accountApi, type ProfileWithAssignment } from '../../infrastructure/account-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const AccountListPage = () => {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<ProfileWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    try {
      const data = await accountApi.list();
      setAccounts(data);
    } catch {
      showToast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const columns: Column<ProfileWithAssignment>[] = [
    { key: 'full_name', header: 'Name', sortable: true },
    { key: 'role', header: 'Role', render: (row) => <Badge colorPalette={row.role === 'ADMIN' ? 'blue' : 'green'}>{row.role}</Badge> },
    { key: 'barangay_name', header: 'Barangay', render: (row) => row.barangay_name ?? <Text color="text.muted">-</Text> },
    {
      key: 'account_status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.account_status} />,
    },
    { key: 'contact_number', header: 'Contact', render: (row) => row.contact_number ?? '-' },
  ];

  const actions: Action<ProfileWithAssignment>[] = [
    {
      label: 'Edit',
      onClick: (row) => navigate(`/accounts/${row.id}/edit`),
    },
    {
      label: 'Deactivate',
      onClick: async (row) => {
        try {
          await accountApi.deactivate(row.id);
          showToast.success('Account deactivated');
          loadAccounts();
        } catch {
          showToast.error('Failed to deactivate');
        }
      },
      variant: 'danger',
      confirm: {
        title: (row) => `Deactivate ${row.full_name}?`,
        description: 'This account will immediately lose access to the system. It can be reactivated later.',
        confirmLabel: 'Deactivate',
        variant: 'danger',
      },
      show: (row) => row.account_status === 'ACTIVE',
    },
    {
      label: 'Activate',
      onClick: async (row) => {
        try {
          await accountApi.activate(row.id);
          showToast.success('Account activated');
          loadAccounts();
        } catch {
          showToast.error('Failed to activate');
        }
      },
      confirm: {
        title: (row) => `Activate ${row.full_name}?`,
        description: 'This account will regain access using its existing credentials and barangay assignment.',
        confirmLabel: 'Activate',
      },
      show: (row) => row.account_status === 'INACTIVE',
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="SK Accounts"
        description="Manage official accounts, assignments, and account status."
        actions={(
          <Button colorPalette="green" onClick={() => navigate('/accounts/new')}>
            Add Account
          </Button>
        )}
      />

      <DataTable
        columns={columns}
        data={accounts}
        actions={actions}
        loading={loading}
        searchPlaceholder="Search accounts..."
        searchKey="full_name"
        emptyMessage="No accounts found."
      />
    </DashboardLayout>
  );
};

export default AccountListPage;
