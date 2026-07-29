import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Button, Dialog, Field, HStack, IconButton, Input, NativeSelect, Portal, Text, VStack } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { LuDownload, LuFileSpreadsheet, LuPlus, LuX } from 'react-icons/lu';
import { type RootState } from '../../../../redux/store';
import { DataTable, type Action, type Column } from '../../../../shared/tables/DataTable';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { showToast } from '../../../../shared/toast';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import {
  availableCategoryYears,
  categoriesForRegistry,
  categoriesForYear,
  preferredCategoryYear,
} from '../../../categories/domain/category-scope';
import { categoryApi, type Category } from '../../../categories/infrastructure/category-api';
import {
  youthRecordApi,
  type YouthRecord,
} from '../../infrastructure/youth-record-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

type SortValue = 'barangay-asc' | 'barangay-desc' | 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const formatBirthDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
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
  const [categoryOptionsReady, setCategoryOptionsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [barangayId, setBarangayId] = useState('');
  const [filingYear, setFilingYear] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportYear, setExportYear] = useState('');
  const [exporting, setExporting] = useState(false);
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [sort, setSort] = useState<SortValue>(isAdmin ? 'barangay-asc' : 'newest');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });

  const uniqueYears = useMemo(() => {
    return availableCategoryYears(categories);
  }, [categories]);
  const yearCategories = useMemo(
    () => categoriesForYear(categories, filingYear ? Number(filingYear) : null),
    [categories, filingYear],
  );

  const exportYears = useMemo(() => uniqueYears.map((year) => ({
    year,
    recordCount: categories
      .filter((category) => category.filing_year === year)
      .reduce((total, category) => total + (category.record_count ?? 0), 0),
  })), [categories, uniqueYears]);

  useEffect(() => {
    if (exportYears.length === 0) {
      setExportYear('');
      return;
    }
    if (!exportYears.some(({ year }) => String(year) === exportYear)) {
      setExportYear(String(exportYears[0].year));
    }
  }, [exportYear, exportYears]);

  useEffect(() => {
    if (categoryId && !yearCategories.some((category) => category.id === categoryId)) setCategoryId('');
  }, [categoryId, yearCategories]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [barangayData, categoryResponse] = await Promise.all([
          isAdmin ? barangayApi.list() : Promise.resolve([]),
          categoryApi.list('YOUTH_PROFILE'),
        ]);
        setBarangays(barangayData.filter((barangay) => barangay.is_active));
        const youthCategories = categoriesForRegistry(categoryResponse.data, 'YOUTH_PROFILE')
          .filter((category) => category.status === 'PUBLISHED');
        setCategories(youthCategories);
        const preferredYear = preferredCategoryYear(youthCategories);
        setFilingYear(preferredYear === null ? '' : String(preferredYear));
      } catch (error) {
        setCategories([]);
        setFilingYear('');
        showToast.error({
          title: 'Filters could not be loaded',
          description: error instanceof Error ? error.message : 'Refresh the page and try again.',
        });
      } finally {
        setCategoryOptionsReady(true);
      }
    };
    void loadFilters();
  }, [isAdmin]);

  useEffect(() => {
    if (!categoryOptionsReady) return;
    if (!filingYear) {
      setRecords([]);
      setMeta({ page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });
      setLoading(false);
      return;
    }
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
  }, [search, status, categoryId, barangayId, filingYear, sort, page, isAdmin, categoryOptionsReady]);

  const columns = useMemo(() => {
    const result: Column<YouthRecord>[] = [
      {
        key: 'row_number',
        header: 'No.',
        width: '60px',
        render: (row) => row.row_number ?? '—',
      },
    ];

    if (isAdmin) {
      result.push(
        {
          key: 'region',
          header: 'Region',
          width: '130px',
          render: () => 'MIMAROPA',
        },
        {
          key: 'province_name',
          header: 'Province',
          width: '130px',
          render: (row) => row.province_name ?? row.barangay?.province ?? '—',
        },
        {
          key: 'municipality_name',
          header: 'City/Municipality',
          width: '140px',
          render: (row) => row.municipality_name ?? row.barangay?.municipality ?? '—',
        },
        {
          key: 'barangay_name',
          header: 'Barangay',
          width: '140px',
          render: (row) => row.barangay_name ?? row.barangay?.name ?? '—',
        },
      );
    }

    result.push(
      {
        key: 'display_name',
        header: 'Name',
        width: '260px',
        render: (row) => (
          <Button variant="ghost" p={0} h="auto" minH="auto" colorPalette="green" fontWeight="600" fontSize="sm" onClick={() => navigate(`/youth-records/${row.id}`)}>
            {row.display_name}
          </Button>
        ),
      },
      { key: 'age_at_submission', header: 'Age', width: '60px' },
      {
        key: 'birth_date',
        header: 'Birthday',
        width: '120px',
        render: (row) => formatBirthDate(row.birth_date),
      },
      {
        key: 'sex_label',
        header: 'Sex',
        width: '100px',
        render: (row) => row.sex_label ?? '—',
      },
      {
        key: 'civil_status_label',
        header: 'Civil Status',
        width: '110px',
        render: (row) => row.civil_status_label ?? '—',
      },
      {
        key: 'youth_classification_label',
        header: 'Classification',
        width: '170px',
        render: (row) => row.youth_classification_label ?? '—',
      },
      {
        key: 'youth_age_group_label',
        header: 'Age Group',
        width: '110px',
        render: (row) => row.youth_age_group_label ?? '—',
      },
      {
        key: 'email',
        header: 'Email',
        width: '240px',
        render: (row) => row.email ?? '—',
      },
      {
        key: 'contact_number',
        header: 'Contact',
        width: '130px',
        render: (row) => row.contact_number ?? '—',
      },
      {
        key: 'educational_attainment_label',
        header: 'Education',
        width: '200px',
        render: (row) => row.educational_attainment_label ?? '—',
      },
      {
        key: 'work_status_label',
        header: 'Work Status',
        width: '150px',
        render: (row) => row.work_status_label ?? '—',
      },
      {
        key: 'is_registered_voter',
        header: 'Voter?',
        width: '70px',
        render: (row) => boolLabel(row.is_registered_voter ?? null),
      },
      {
        key: 'voted_last_election',
        header: 'Election',
        width: '80px',
        render: (row) => boolLabel(row.voted_last_election ?? null),
      },
      {
        key: 'attended_kk_assembly',
        header: 'KK Assembly',
        width: '100px',
        render: (row) => row.attended_kk_assembly === true
          ? `${row.kk_assembly_count ?? 0}x`
          : boolLabel(row.attended_kk_assembly),
      },
    );

    return result;
  }, [isAdmin, navigate]);

  const actions: Action<YouthRecord>[] = [{
    label: 'View',
    onClick: (row) => navigate(`/youth-records/${row.id}`),
  }];

  const resetPage = () => setPage(1);

  const openExportDialog = () => {
    const preferredYear = filingYear && uniqueYears.includes(Number(filingYear))
      ? filingYear
      : String(uniqueYears[0] ?? '');
    setExportYear(preferredYear);
    setExportDialogOpen(true);
  };

  const handleExport = async () => {
    const selectedYear = Number(exportYear);
    if (!Number.isInteger(selectedYear)) return;

    setExporting(true);
    try {
      const blob = await youthRecordApi.exportFilingYear(selectedYear);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `KK Youth Profile ${selectedYear}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      setExportDialogOpen(false);
      showToast.success({
        title: 'Excel export downloaded',
        description: `KK Youth Profile ${selectedYear}.xlsx contains the complete ${selectedYear} dataset available to your account.`,
      });
    } catch (error) {
      showToast.error({
        title: 'Excel export failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleApproveDrafts = async () => {
    try {
      const response = await youthRecordApi.approveDrafts();
      showToast.success({
        title: 'Drafts approved',
        description: `${response.data.approved_count.toLocaleString()} draft record${response.data.approved_count === 1 ? '' : 's'} were approved.`,
      });
      setBulkApproveOpen(false);

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
      const refreshed = await youthRecordApi.list({
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
      setRecords(refreshed.data);
      setMeta(refreshed.meta);
    } catch (error) {
      showToast.error({
        title: 'Draft approval failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
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
          <HStack gap={2} wrap="wrap">
            {isAdmin && (
              <Button variant="outline" colorPalette="orange" onClick={() => setBulkApproveOpen(true)}>
                Approve Drafts
              </Button>
            )}
            <Button variant="outline" colorPalette="green" onClick={openExportDialog} disabled={exportYears.length === 0}>
              <LuDownload aria-hidden="true" /> Export Excel
            </Button>
            <Button colorPalette="green" onClick={() => navigate('/youth-records/new')}>
              <LuPlus aria-hidden="true" /> Add Record
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
          <NativeSelect.Root flex={{ base: '1 1 100%', sm: '1 1 180px' }} maxW={{ lg: '200px' }} disabled={!categoryOptionsReady || uniqueYears.length === 0}>
            <NativeSelect.Field aria-label="Filter by year" value={filingYear} onChange={(event) => {
              setFilingYear(event.target.value);
              setCategoryId('');
              resetPage();
            }} minH="44px">
              {uniqueYears.length === 0 && <option value="">No Youth Registry years available</option>}
              {uniqueYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <NativeSelect.Root flex={{ base: '1 1 100%', sm: '1 1 210px' }} maxW={{ lg: '240px' }} disabled={!categoryOptionsReady || !filingYear}>
            <NativeSelect.Field aria-label="Filter by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); resetPage(); }} minH="44px">
              <option value="">All Youth Registry Categories</option>
              {yearCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
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
        variant="excel"
        emptyMessage="No youth records match these filters."
        pagination={{
          page: meta.page,
          totalPages: meta.totalPages,
          totalItems: meta.totalItems,
          onPageChange: setPage,
        }}
      />

      <Dialog.Root open={exportDialogOpen} onOpenChange={({ open }) => { if (!exporting) setExportDialogOpen(open); }}>
        <Portal>
          <Dialog.Backdrop bg="rgba(0, 0, 0, 0.58)" backdropFilter="blur(2px)" zIndex={1400} />
          <Dialog.Positioner zIndex={1500} p={{ base: 4, sm: 6 }}>
            <Dialog.Content width="full" maxW="480px" maxH="calc(100dvh - 32px)" overflowY="auto" bg="white" color="text.primary" borderRadius="md" borderWidth="1px" borderColor="border.strong" boxShadow="0 24px 64px rgba(0, 0, 0, 0.24)">
              <Dialog.Header>
                <HStack gap={3} pr={10} align="center">
                  <Box display="grid" placeItems="center" boxSize="44px" flexShrink={0} borderRadius="md" bg="primary.50" color="primary.700">
                    <LuFileSpreadsheet size={22} aria-hidden="true" />
                  </Box>
                  <Box>
                    <Dialog.Title fontFamily="heading" fontWeight="650">Export Youth Records</Dialog.Title>
                    <Text color="text.muted" fontSize="sm" mt={1}>Download one complete filing year.</Text>
                  </Box>
                </HStack>
              </Dialog.Header>
              <Dialog.Body>
                <VStack align="stretch" gap={4}>
                  <Field.Root>
                    <Field.Label htmlFor="export-filing-year" fontWeight="600" fontSize="sm">
                      Filing year
                    </Field.Label>
                    <NativeSelect.Root width="full" disabled={exporting}>
                      <NativeSelect.Field
                        id="export-filing-year"
                        value={exportYear}
                        onChange={(event) => setExportYear(event.target.value)}
                        minH="44px"
                      >
                        {exportYears.map(({ year, recordCount }) => (
                          <option key={year} value={year}>
                            {`KK Youth Profile ${year} — ${recordCount.toLocaleString()} record${recordCount === 1 ? '' : 's'}`}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>
                  <Box p={4} bg="surface.muted" borderWidth="1px" borderColor="border" borderRadius="md">
                    <Text fontWeight="700" fontSize="sm">Official KK youth profile layout</Text>
                    <Text color="text.secondary" fontSize="sm" lineHeight="1.6" mt={1}>
                      Includes all non-deleted records for the selected year, grouped by barangay with formatted headers, birthdays, and print-ready columns. Barangay access is enforced automatically.
                    </Text>
                  </Box>
                  <Text color="text.muted" fontSize="sm">
                    Filename: <Text as="span" fontWeight="700" color="text.secondary">KK Youth Profile {exportYear || 'Year'}.xlsx</Text>
                  </Text>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer flexDirection={{ base: 'column-reverse', sm: 'row' }} gap={3}>
                <Button width={{ base: 'full', sm: 'auto' }} variant="outline" onClick={() => setExportDialogOpen(false)} disabled={exporting}>
                  Cancel
                </Button>
                <Button width={{ base: 'full', sm: 'auto' }} colorPalette="green" onClick={handleExport} loading={exporting} disabled={!exportYear}>
                  <LuDownload aria-hidden="true" /> Download Excel
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <IconButton aria-label="Close export dialog" variant="ghost" minW="44px" minH="44px" position="absolute" top={2} right={2} disabled={exporting}>
                  <LuX aria-hidden="true" />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={bulkApproveOpen}
        onOpenChange={({ open }) => { if (!open) setBulkApproveOpen(false); }}
        title="Approve all draft records?"
        description="This will mark every draft youth record as approved, including records that never went through the regular review step."
        confirmLabel="Approve Drafts"
        variant="default"
        onConfirm={handleApproveDrafts}
      />

    </DashboardLayout>
  );
};

export default YouthRecordListPage;
