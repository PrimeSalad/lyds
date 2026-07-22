import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Button, HStack, Input, NativeSelect, Text } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { LuPlus } from 'react-icons/lu';
import { type RootState } from '../../../../redux/store';
import { DataTable, type Action, type Column } from '../../../../shared/tables/DataTable';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { StatusBadge } from '../../../../shared/components/StatusBadge';
import { showToast } from '../../../../shared/toast';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import { categoryApi, type Category } from '../../../categories/infrastructure/category-api';
import {
  youthRecordApi,
  type YouthRecord,
  type YouthRecordStatus,
} from '../../infrastructure/youth-record-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

type SortValue = 'barangay-asc' | 'barangay-desc' | 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const YouthRecordListPage = () => {
  const navigate = useNavigate();
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';
  const [records, setRecords] = useState<YouthRecord[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [barangayId, setBarangayId] = useState('');
  const [sort, setSort] = useState<SortValue>(isAdmin ? 'barangay-asc' : 'newest');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [barangayData, categoryResponse] = await Promise.all([
          isAdmin ? barangayApi.list() : Promise.resolve([]),
          categoryApi.list(),
        ]);
        setBarangays(barangayData.filter((barangay) => barangay.is_active));
        setCategories(categoryResponse.data.filter((category) => category.status === 'PUBLISHED'));
      } catch (error) {
        showToast.error({
          title: 'Filters could not be loaded',
          description: error instanceof Error ? error.message : 'Refresh the page and try again.',
        });
      }
    };
    void loadFilters();
  }, [isAdmin]);

  useEffect(() => {
    const delay = window.setTimeout(async () => {
      setLoading(true);
      const [sortField, sortDir] = sort === 'barangay-asc'
        ? ['barangay_name', 'asc'] as const
        : sort === 'barangay-desc'
          ? ['barangay_name', 'desc'] as const
          : sort === 'oldest'
            ? ['created_at', 'asc'] as const
            : sort === 'name-asc'
              ? ['display_name', 'asc'] as const
              : sort === 'name-desc'
                ? ['display_name', 'desc'] as const
                : ['created_at', 'desc'] as const;
      try {
        const response = await youthRecordApi.list({
          page,
          pageSize: 25,
          search,
          status,
          category_id: categoryId,
          barangay_id: isAdmin ? barangayId : undefined,
          sortField,
          sortDir,
        });
        setRecords(response.data);
        setMeta(response.meta);
      } catch (error) {
        setRecords([]);
        showToast.error({
          title: 'Youth records could not be loaded',
          description: error instanceof Error ? error.message : 'Refresh the page and try again.',
        });
      } finally {
        setLoading(false);
      }
    }, search ? 300 : 0);
    return () => window.clearTimeout(delay);
  }, [search, status, categoryId, barangayId, sort, page, isAdmin]);

  const columns = useMemo(() => {
    const result: Column<YouthRecord>[] = [
      {
        key: 'display_name',
        header: 'Youth',
        render: (row) => (
          <Button variant="ghost" p={0} h="auto" minH="auto" colorPalette="green" fontWeight="650" onClick={() => navigate(`/youth-records/${row.id}`)}>
            {row.display_name}
          </Button>
        ),
      },
      { key: 'age_at_submission', header: 'Age', width: '72px' },
    ];

    if (isAdmin) {
      result.push({
        key: 'barangay_name',
        header: 'Barangay',
        render: (row) => row.barangay_name ?? row.barangay?.name ?? 'Not assigned',
      });
    }

    result.push(
      {
        key: 'status',
        header: 'Status',
        render: (row) => <StatusBadge status={row.status as YouthRecordStatus} />,
      },
      {
        key: 'created_at',
        header: 'Created',
        render: (row) => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(row.created_at)),
      },
    );
    return result;
  }, [isAdmin, navigate]);

  const actions: Action<YouthRecord>[] = [{
    label: 'View',
    onClick: (row) => navigate(`/youth-records/${row.id}`),
  }];

  const resetPage = () => setPage(1);

  return (
    <DashboardLayout>
      <PageHeader
        title="Youth Records"
        description={isAdmin
          ? 'Review and compare youth records by barangay, status, and category.'
          : 'Create drafts, submit records, and monitor returned items.'}
        actions={(
          <Button colorPalette="green" onClick={() => navigate('/youth-records/new')}>
            <LuPlus /> Add Record
          </Button>
        )}
      />

      <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="md" border="1px solid" borderColor="border" mb={4}>
        <HStack gap={3} align="stretch" wrap="wrap">
          <Input
            aria-label="Search youth records"
            placeholder="Search by youth name"
            value={search}
            onChange={(event) => { setSearch(event.target.value); resetPage(); }}
            flex={{ base: '1 1 100%', lg: '1 1 260px' }}
            minH="44px"
          />
          {isAdmin && (
            <NativeSelect.Root flex={{ base: '1 1 100%', sm: '1 1 220px' }} maxW={{ lg: '240px' }}>
              <NativeSelect.Field aria-label="Filter by barangay" value={barangayId} onChange={(event) => { setBarangayId(event.target.value); resetPage(); }} minH="44px">
                <option value="">All 61 Barangays</option>
                {barangays.map((barangay) => <option key={barangay.id} value={barangay.id}>{barangay.name}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          )}
          <NativeSelect.Root flex={{ base: '1 1 100%', sm: '1 1 180px' }} maxW={{ lg: '210px' }}>
            <NativeSelect.Field aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); resetPage(); }} minH="44px">
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="RETURNED">Returned</option>
              <option value="APPROVED">Approved</option>
              <option value="ARCHIVED">Archived</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <NativeSelect.Root flex={{ base: '1 1 100%', sm: '1 1 210px' }} maxW={{ lg: '240px' }}>
            <NativeSelect.Field aria-label="Filter by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); resetPage(); }} minH="44px">
              <option value="">All Categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <NativeSelect.Root flex={{ base: '1 1 100%', sm: '1 1 190px' }} maxW={{ lg: '220px' }}>
            <NativeSelect.Field aria-label="Sort youth records" value={sort} onChange={(event) => { setSort(event.target.value as SortValue); resetPage(); }} minH="44px">
              {isAdmin && <option value="barangay-asc">Barangay A-Z</option>}
              {isAdmin && <option value="barangay-desc">Barangay Z-A</option>}
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Youth Name A-Z</option>
              <option value="name-desc">Youth Name Z-A</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </HStack>
        <Text mt={3} color="text.muted" fontSize="sm" aria-live="polite">
          {loading ? 'Loading youth records...' : `${meta.totalItems.toLocaleString()} record${meta.totalItems === 1 ? '' : 's'} found`}
        </Text>
      </Box>

      <DataTable
        columns={columns}
        data={records}
        actions={actions}
        loading={loading}
        emptyMessage="No youth records match these filters."
        pagination={{
          page: meta.page,
          totalPages: meta.totalPages,
          totalItems: meta.totalItems,
          onPageChange: setPage,
        }}
      />
    </DashboardLayout>
  );
};

export default YouthRecordListPage;
