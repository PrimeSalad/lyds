import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Badge, Box, Button, Card, SimpleGrid, Text } from '@chakra-ui/react';
import { DataTable, type Column, type Action } from '../../../../shared/tables/DataTable';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { StatusBadge } from '../../../../shared/components/StatusBadge';
import { showToast } from '../../../../shared/toast';
import { accountApi, type ProfileWithAssignment } from '../../infrastructure/account-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import { useAppSelector } from '../../../../redux/hooks';

const AccountListPage = () => {
  const navigate = useNavigate();
  const currentProfileId = useAppSelector((state) => state.auth.profile?.profileId);

  const [accounts, setAccounts] = useState<ProfileWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const summary = useMemo(() => accounts.reduce((acc, account) => {
    acc.total += 1;
    if (account.account_status === 'ACTIVE') acc.active += 1;
    if (account.account_status === 'INACTIVE') acc.inactive += 1;
    if (account.role === 'ADMIN') acc.admin += 1;
    return acc;
  }, {
    total: 0,
    active: 0,
    inactive: 0,
    admin: 0,
  }), [accounts]);

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
    { key: 'role', header: 'Role', align: 'center', render: (row) => <Badge colorPalette={row.role === 'ADMIN' ? 'blue' : 'green'}>{row.role}</Badge> },
    { key: 'barangay_name', header: 'Barangay', render: (row) => row.barangay_name ?? <Text color="text.muted">-</Text> },
    {
      key: 'account_status',
      header: 'Status',
      align: 'center',
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
    {
      label: 'Delete',
      onClick: async (row) => {
        await accountApi.delete(row.id);
        showToast.success('Account permanently deleted');
        await loadAccounts();
      },
      variant: 'danger',
      confirm: {
        title: (row) => `Permanently delete ${row.full_name}?`,
        description: 'This permanently removes the login and account profile and cannot be undone. Accounts with linked historical activity must be deactivated instead.',
        confirmLabel: 'Delete permanently',
        variant: 'danger',
      },
      show: (row) => row.id !== currentProfileId,
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

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap={4} mb={6}>
        {[
          { label: 'Total accounts', value: summary.total, tone: 'blue' },
          { label: 'Active', value: summary.active, tone: 'green' },
          { label: 'Inactive', value: summary.inactive, tone: 'orange' },
          { label: 'Administrators', value: summary.admin, tone: 'purple' },
        ].map((item) => (
          <Card.Root key={item.label} borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={5}>
              <Text fontSize="sm" color="text.muted">{item.label}</Text>
              <Text fontSize="2xl" fontWeight="700" color={`${item.tone}.700`} mt={1}>{item.value}</Text>
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>

      <Box mb={3}>
        <Text fontFamily="heading" fontWeight="600">Account directory</Text>
        <Text color="text.muted" fontSize="sm" mt={1}>
          Review barangay assignments, roles, and access status.
        </Text>
      </Box>
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
