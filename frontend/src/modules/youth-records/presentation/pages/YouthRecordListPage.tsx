import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Button, HStack, Box, NativeSelect, Input, Spinner, Text } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { DataTable, type Column, type Action } from '../../../../shared/tables/DataTable';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { StatusBadge } from '../../../../shared/components/StatusBadge';
import { showToast } from '../../../../shared/toast';
import { youthRecordApi, type YouthRecord, type YouthRecordStatus } from '../../infrastructure/youth-record-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const YouthRecordListPage = () => {
  const navigate = useNavigate();
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';

  const [records, setRecords] = useState<YouthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [barangayId, setBarangayId] = useState<string>('');

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await youthRecordApi.list({
        search,
        status,
        category_id: category,
        barangay_id: isAdmin ? barangayId : undefined,
      });
      setRecords(res.data);
    } catch {
      showToast.error('Failed to load youth records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadRecords();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, status, category, barangayId]);

  const columns = useMemo(() => {
    const cols: Column<YouthRecord>[] = [
      {
        key: 'display_name',
        header: 'Name',
        sortable: true,
        render: (row) => (
          <Button variant="ghost" p={0} h="auto" colorPalette="green" onClick={() => navigate(`/youth-records/${row.id}`)}>
            {row.display_name}
          </Button>
        )
      },
      { key: 'age_at_submission', header: 'Age', sortable: true },
    ];

    if (isAdmin) {
      cols.push({ key: 'barangay_id', header: 'Barangay', sortable: true });
    }

    cols.push({
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status as YouthRecordStatus} />,
    });

    cols.push({
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    });

    return cols;
  }, [isAdmin, navigate]);

  const actions: Action<YouthRecord>[] = [
    {
      label: 'View',
      onClick: (row) => navigate(`/youth-records/${row.id}`),
    }
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Youth Records"
        description={isAdmin ? 'Review, filter, and manage records across barangays.' : 'Create drafts, submit records, and monitor returned items.'}
        actions={(
          <Button colorPalette="green" onClick={() => navigate('/youth-records/new')}>
            Add Record
          </Button>
        )}
      />

      <Box bg="white" p={4} borderRadius="lg" border="1px solid" borderColor="border" mb={4}>
        <HStack gap={3} align="stretch" wrap="wrap">
          <Input 
            placeholder="Search records..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            maxW={{ base: 'full', md: '300px' }}
          />
          <NativeSelect.Root maxW={{ base: 'full', md: '200px' }}>
            <NativeSelect.Field value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="RETURNED">Returned</option>
              <option value="APPROVED">Approved</option>
              <option value="ARCHIVED">Archived</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <NativeSelect.Root maxW={{ base: 'full', md: '220px' }}>
            <NativeSelect.Field value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              <option value="katipunan">Katipunan ng Kabataan</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          {isAdmin && (
            <NativeSelect.Root maxW={{ base: 'full', md: '200px' }}>
              <NativeSelect.Field value={barangayId} onChange={(e) => setBarangayId(e.target.value)}>
                <option value="">All Barangays</option>
                <option value="brgy1">Barangay 1</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          )}
          <Text ml={{ base: 0, md: 'auto' }} color="text.muted" fontSize="sm" alignSelf="center">
            Showing {records.length} records
          </Text>
        </HStack>
      </Box>

      {loading ? (
        <Box py={8} textAlign="center">
          <Spinner size="lg" color="primary.600" />
        </Box>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          actions={actions}
          loading={false}
          emptyMessage="No youth records found."
        />
      )}
    </DashboardLayout>
  );
};

export default YouthRecordListPage;
