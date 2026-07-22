import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Button, Dialog, HStack, IconButton, Input, NativeSelect, Portal, Text } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { LuCopy, LuPlus, LuX } from 'react-icons/lu';
import { type RootState } from '../../../../redux/store';
import { DataTable, type Action, type Column } from '../../../../shared/tables/DataTable';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { showToast } from '../../../../shared/toast';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import { categoryApi, type Category } from '../../../categories/infrastructure/category-api';
import {
  youthRecordApi,
  type YouthRecord,
} from '../../infrastructure/youth-record-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

type SortValue = 'barangay-asc' | 'barangay-desc' | 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const formatBirthDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

const boolLabel = (val: boolean | null | undefined) => (val === true ? 'Yes' : val === false ? 'No' : '—');

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
  const [filingYear, setFilingYear] = useState('');
  const [sort, setSort] = useState<SortValue>(isAdmin ? 'barangay-asc' : 'newest');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTargetYear, setCopyTargetYear] = useState('');
  const [copying, setCopying] = useState(false);

  const uniqueYears = useMemo(() => {
    const years = categories
      .map((c) => c.filing_year)
      .filter((y): y is number => y != null);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [categories]);

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
          filing_year: filingYear ? Number(filingYear) : undefined,
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
  }, [search, status, categoryId, barangayId, filingYear, sort, page, isAdmin]);

  const columns = useMemo(() => {
    const result: Column<YouthRecord>[] = [
      {
        key: 'row_number',
        header: 'No.',
        width: '40px',
        render: (row) => row.row_number ?? '—',
      },
    ];

    if (isAdmin) {
      result.push(
        {
          key: 'region',
          header: 'Region',
          width: '80px',
          render: () => 'MIMAROPA',
        },
        {
          key: 'province_name',
          header: 'Province',
          width: '80px',
          render: (row) => row.province_name ?? row.barangay?.province ?? '—',
        },
        {
          key: 'municipality_name',
          header: 'City/Municipality',
          width: '80px',
          render: (row) => row.municipality_name ?? row.barangay?.municipality ?? '—',
        },
        {
          key: 'barangay_name',
          header: 'Barangay',
          width: '90px',
          render: (row) => row.barangay_name ?? row.barangay?.name ?? '—',
        },
      );
    }

    result.push(
      {
        key: 'display_name',
        header: 'Name',
        width: '140px',
        render: (row) => (
          <Button variant="ghost" p={0} h="auto" minH="auto" colorPalette="green" fontWeight="600" fontSize="xs" onClick={() => navigate(`/youth-records/${row.id}`)}>
            {row.display_name}
          </Button>
        ),
      },
      { key: 'age_at_submission', header: 'Age', width: '35px' },
      {
        key: 'birth_date',
        header: 'Birthday',
        width: '80px',
        render: (row) => formatBirthDate(row.birth_date),
      },
      {
        key: 'sex_label',
        header: 'Sex',
        width: '60px',
        render: (row) => row.sex_label ?? '—',
      },
      {
        key: 'civil_status_label',
        header: 'Civil Status',
        width: '70px',
        render: (row) => row.civil_status_label ?? '—',
      },
      {
        key: 'youth_classification_label',
        header: 'Classification',
        width: '80px',
        render: (row) => row.youth_classification_label ?? '—',
      },
      {
        key: 'youth_age_group_label',
        header: 'Age Group',
        width: '70px',
        render: (row) => row.youth_age_group_label ?? '—',
      },
      {
        key: 'email',
        header: 'Email',
        width: '130px',
        render: (row) => row.email ?? '—',
      },
      {
        key: 'contact_number',
        header: 'Contact',
        width: '90px',
        render: (row) => row.contact_number ?? '—',
      },
      {
        key: 'educational_attainment_label',
        header: 'Education',
        width: '80px',
        render: (row) => row.educational_attainment_label ?? '—',
      },
      {
        key: 'work_status_label',
        header: 'Work Status',
        width: '70px',
        render: (row) => row.work_status_label ?? '—',
      },
      {
        key: 'is_registered_voter',
        header: 'Voter?',
        width: '45px',
        render: (row) => boolLabel(row.is_registered_voter ?? null),
      },
      {
        key: 'voted_last_election',
        header: 'Election',
        width: '55px',
        render: (row) => boolLabel(row.voted_last_election ?? null),
      },
      {
        key: 'attended_kk_assembly',
        header: 'KK Assembly',
        width: '70px',
        render: (row) => row.attended_kk_assembly ? `${row.kk_assembly_count ?? 0}x` : 'No',
      },
    );

    return result;
  }, [isAdmin, navigate]);

  const actions: Action<YouthRecord>[] = [{
    label: 'View',
    onClick: (row) => navigate(`/youth-records/${row.id}`),
  }];

  const resetPage = () => setPage(1);

  const handleCopy = async () => {
    if (!filingYear || !copyTargetYear) return;
    const sourceCategories = categories.filter((c) => c.filing_year === Number(filingYear));
    const targetCategories = categories.filter((c) => c.filing_year === Number(copyTargetYear));
    if (sourceCategories.length === 0 || targetCategories.length === 0) {
      showToast.error({ title: 'Source or target year has no category' });
      return;
    }
    setCopying(true);
    try {
      let totalCopied = 0;
      for (const sourceCat of sourceCategories) {
        const targetCat = targetCategories.find((c) => c.name === sourceCat.name && c.filing_year === Number(copyTargetYear));
        if (targetCat) {
          const res = await youthRecordApi.copyRecords(sourceCat.id, targetCat.id);
          totalCopied += res.data.copied;
        }
      }
      showToast.success({ title: `${totalCopied} record${totalCopied === 1 ? '' : 's'} copied to ${copyTargetYear}` });
      setCopyDialogOpen(false);
      setCopyTargetYear('');
    } catch (error) {
      showToast.error({ title: 'Copy failed', description: error instanceof Error ? error.message : 'Try again.' });
    } finally {
      setCopying(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Youth Records"
        description={isAdmin
          ? 'Review and compare youth records by barangay, status, and category.'
          : 'Create drafts, submit records, and monitor returned items.'}
        actions={(
          <HStack gap={2}>
            {isAdmin && filingYear && (
              <Button variant="outline" colorPalette="blue" onClick={() => setCopyDialogOpen(true)}>
                <LuCopy /> Copy to Year
              </Button>
            )}
            <Button colorPalette="green" onClick={() => navigate('/youth-records/new')}>
              <LuPlus /> Add Record
            </Button>
          </HStack>
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
          <NativeSelect.Root flex={{ base: '1 1 100%', sm: '1 1 180px' }} maxW={{ lg: '200px' }}>
            <NativeSelect.Field aria-label="Filter by year" value={filingYear} onChange={(event) => { setFilingYear(event.target.value); resetPage(); }} minH="44px">
              <option value="">All Years</option>
              {uniqueYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <NativeSelect.Root flex={{ base: '1 1 100%', sm: '1 1 210px' }} maxW={{ lg: '240px' }}>
            <NativeSelect.Field aria-label="Filter by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); resetPage(); }} minH="44px">
              <option value="">All Categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.filing_year ? ` (${category.filing_year})` : ''}</option>)}
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

      <Dialog.Root open={copyDialogOpen} onOpenChange={(details) => setCopyDialogOpen(details.open)}>
        <Portal>
          <Dialog.Backdrop bg="rgba(0, 0, 0, 0.58)" />
          <Dialog.Positioner>
            <Dialog.Content maxW="440px">
              <Dialog.Header>
                <Dialog.Title>Copy records from {filingYear}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text color="text.secondary" mb={4}>
                  All records from the current year's categories will be copied as DRAFT to the target year's matching categories.
                </Text>
                <NativeSelect.Root>
                  <NativeSelect.Field aria-label="Target year" value={copyTargetYear} onChange={(e) => setCopyTargetYear(e.target.value)} minH="44px">
                    <option value="">Select target year</option>
                    {uniqueYears.filter((y) => y !== Number(filingYear)).map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setCopyDialogOpen(false)} disabled={copying}>Cancel</Button>
                <Button
                  colorPalette="blue"
                  onClick={handleCopy}
                  loading={copying}
                  disabled={!copyTargetYear}
                >
                  Copy to {copyTargetYear || '...'}
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <IconButton aria-label="Close" variant="ghost" size="sm" position="absolute" top={3} right={3}>
                  <LuX />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </DashboardLayout>
  );
};

export default YouthRecordListPage;
