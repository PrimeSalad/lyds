import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Field, Grid, Heading, HStack, Input, NativeSelect, Text } from '@chakra-ui/react';
import { LuDownload, LuSearch } from 'react-icons/lu';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { StatusBadge } from '../../../../shared/components/StatusBadge';
import { DataTable, type Column } from '../../../../shared/tables/DataTable';
import { showToast } from '../../../../shared/toast';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import { categoryApi, type Category } from '../../../categories/infrastructure/category-api';
import {
  availableCategoryYears,
  categoriesForRegistry,
  preferredCategoryYear,
} from '../../../categories/domain/category-scope';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import {
  childLaborerApi,
  type ChildLaborerRecord,
  type ChildLaborerSortField,
  type ChildLaborerStatus,
  type ChildLaborerSummary,
} from '../../infrastructure/child-laborer-api';
import { ChildLaborerAnalytics } from './ChildLaborerAnalytics';

type ChildLaborerReportsViewProps = {
  onShowYouthRecords: () => void;
};

const statuses: Array<{ value: ChildLaborerStatus; label: string }> = [
  { value: 'IDENTIFIED', label: 'Identified' },
  { value: 'VALIDATED', label: 'Validated' },
  { value: 'REFERRED', label: 'Referred' },
  { value: 'MONITORED', label: 'Monitored' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const valueOrDash = (value?: string | null) => value || '—';
const birthDateLabel = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1].slice(2)}` : value;
};
const label = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/^./, (first: string) => first.toUpperCase());

const download = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export const ChildLaborerReportsView = ({ onShowYouthRecords }: ChildLaborerReportsViewProps) => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';
  const [records, setRecords] = useState<ChildLaborerRecord[]>([]);
  const [summary, setSummary] = useState<ChildLaborerSummary | null>(null);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [year, setYear] = useState<number | null>(null);
  const [barangayId, setBarangayId] = useState('');
  const [status, setStatus] = useState<ChildLaborerStatus | ''>('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsRevision, setAnalyticsRevision] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });
  const [sort, setSort] = useState<{ key: ChildLaborerSortField; direction: 'asc' | 'desc' }>({
    key: 'barangay_name',
    direction: 'asc',
  });
  const childLaborerCategories = useMemo(
    () => categoriesForRegistry(categories, 'CHILD_LABORER'),
    [categories],
  );
  const years = useMemo(() => availableCategoryYears(childLaborerCategories), [childLaborerCategories]);

  useEffect(() => {
    if (year === null) {
      setRecords([]);
      setMeta({ page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });
      setRecordsLoading(false);
      return;
    }
    let active = true;
    const loadRecords = async () => {
      setRecordsLoading(true);
      try {
        const listResult = await childLaborerApi.list({
          filingYear: year,
          barangayId: isAdmin ? barangayId || undefined : undefined,
          status: status || undefined,
          search: deferredSearch || undefined,
          page,
          pageSize: 25,
          sortField: sort.key,
          sortDir: sort.direction,
        });
        if (!active) return;
        setRecords(listResult.data);
        setMeta(listResult.meta);
      } catch (error) {
        if (!active) return;
        showToast.error({
          title: 'Could not load detailed records',
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      } finally {
        if (active) setRecordsLoading(false);
      }
    };
    void loadRecords();
    return () => { active = false; };
  }, [year, barangayId, status, deferredSearch, page, sort.key, sort.direction, isAdmin]);

  useEffect(() => {
    if (year === null) {
      setSummary(null);
      setAnalyticsLoading(false);
      return;
    }
    let active = true;
    const loadAnalytics = async () => {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const result = await childLaborerApi.summary({
          filingYear: year,
          barangayId: isAdmin ? barangayId || undefined : undefined,
          status: status || undefined,
          search: deferredSearch || undefined,
        });
        if (active) setSummary(result.data);
      } catch (error) {
        if (!active) return;
        setSummary(null);
        setAnalyticsError(error instanceof Error ? error.message : 'Please try again.');
      } finally {
        if (active) setAnalyticsLoading(false);
      }
    };
    void loadAnalytics();
    return () => { active = false; };
  }, [year, barangayId, status, deferredSearch, isAdmin, analyticsRevision]);

  useEffect(() => {
    let active = true;
    const loadFilters = async () => {
      setCategoriesLoading(true);
      try {
        const [categoryResponse, barangayResponse] = await Promise.all([
          categoryApi.list('CHILD_LABORER'),
          isAdmin ? barangayApi.list() : Promise.resolve([]),
        ]);
        if (!active) return;
        const scopedCategories = categoriesForRegistry(categoryResponse.data, 'CHILD_LABORER');
        setCategories(scopedCategories);
        setBarangays(barangayResponse);
        setYear((current) => (
          current !== null && availableCategoryYears(scopedCategories).includes(current)
            ? current
            : preferredCategoryYear(scopedCategories)
        ));
      } catch (error) {
        if (!active) return;
        showToast.error({
          title: 'Could not load child laborer report years',
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      } finally {
        if (active) setCategoriesLoading(false);
      }
    };
    void loadFilters();
    return () => { active = false; };
  }, [isAdmin]);

  const columns = useMemo<Column<ChildLaborerRecord>[]>(() => [
    { key: 'row_number', header: 'No.', width: '70px', align: 'center' },
    { key: 'barangay_name', header: 'Barangay', sortable: true, width: '160px' },
    { key: 'child_name', header: 'Surname', sortable: true, width: '145px', render: (record) => record.last_name },
    { key: 'first_name', header: 'First Name', width: '145px' },
    { key: 'middle_name', header: 'Middle Name', width: '145px', render: (record) => valueOrDash(record.middle_name) },
    { key: 'age', header: 'Age', width: '70px', align: 'center' },
    { key: 'gender', header: 'Gender', sortable: true, width: '120px', render: (record) => label(record.gender) },
    { key: 'birth_date', header: 'Date of Birth', sortable: true, width: '130px', render: (record) => birthDateLabel(record.birth_date) },
    { key: 'attending_school', header: 'Attending School', width: '145px', align: 'center', render: (record) => record.attending_school ? 'Yes' : 'No' },
    { key: 'highest_grade_completed', header: 'Highest Grade Completed', width: '205px', render: (record) => valueOrDash(record.highest_grade_completed) },
    { key: 'nature_of_work', header: 'Nature of Work', width: '210px' },
    { key: 'father_name', header: 'Father', width: '190px', render: (record) => valueOrDash(record.father_name) },
    { key: 'mother_name', header: 'Mother', width: '190px', render: (record) => valueOrDash(record.mother_name) },
    { key: 'guardian_name', header: 'Guardian', width: '190px', render: (record) => valueOrDash(record.guardian_name) },
    { key: 'parent_guardian_occupation', header: 'Parent/Guardian Occupation', width: '230px', render: (record) => valueOrDash(record.parent_guardian_occupation) },
    { key: 'record_status', header: 'Status', sortable: true, width: '140px', render: (record) => <StatusBadge status={record.record_status} /> },
    { key: 'remarks', header: 'Remarks', width: '260px', render: (record) => valueOrDash(record.remarks) },
  ], []);

  const exportRecords = async (format: 'csv' | 'xlsx') => {
    if (year === null) {
      showToast.error('Select a child laborer filing year before exporting');
      return;
    }
    setExporting(true);
    try {
      const blob = await childLaborerApi.export({
        format,
        filingYear: year,
        barangayId: isAdmin ? barangayId || undefined : undefined,
        status: status || undefined,
        search: deferredSearch || undefined,
      });
      download(blob, `Child Laborers ${year}.${format}`);
      showToast.success('Child laborer report downloaded');
    } catch (error) {
      showToast.error({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setExporting(false);
    }
  };

  const selectedBarangayName = barangays.find((barangay) => barangay.id === barangayId)?.name;
  const scopeLabel = isAdmin
    ? selectedBarangayName ?? 'All barangays'
    : 'Assigned barangay';

  return (
    <DashboardLayout>
      <PageHeader
        title="Child Laborer Analytics"
        description="Review one child laborer filing year at a time. Every metric, demographic chart, detailed row, and export follows the selected annual dataset."
        actions={(
          <HStack gap={3} wrap="wrap">
            <NativeSelect.Root width={{ base: 'full', md: '220px' }}>
              <NativeSelect.Field
                aria-label="Report dataset"
                value="CHILD_LABORERS"
                minH="44px"
                onChange={(event) => { if (event.target.value === 'KK_YOUTH') onShowYouthRecords(); }}
              >
                <option value="KK_YOUTH">KK Youth Records</option>
                <option value="CHILD_LABORERS">Child Laborer Records</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Button minH="44px" variant="outline" onClick={() => void exportRecords('csv')} loading={exporting} disabled={year === null}>Export CSV</Button>
            <Button minH="44px" colorPalette="green" onClick={() => void exportRecords('xlsx')} loading={exporting} disabled={year === null}>
              <LuDownload aria-hidden="true" /> Export XLSX
            </Button>
          </HStack>
        )}
      />

      <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" mb={5}>
        <Card.Header px={{ base: 4, md: 5 }} pt={{ base: 4, md: 5 }} pb={2}>
          <Heading as="h2" size="sm" fontFamily="heading" fontWeight="650">Report controls</Heading>
          <Text mt={1} fontSize="sm" color="text.muted">Filing year is required. Every chart, metric, and table row updates to match these filters.</Text>
        </Card.Header>
        <Card.Body px={{ base: 4, md: 5 }} pt={3} pb={{ base: 4, md: 5 }}>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: isAdmin ? 'minmax(260px, 1.5fr) repeat(3, minmax(160px, 0.7fr))' : 'minmax(260px, 1.5fr) repeat(2, minmax(160px, 0.7fr))' }} gap={4}>
            <Field.Root>
              <Field.Label fontSize="sm" color="text.secondary">Search records</Field.Label>
              <Box position="relative">
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="text.muted" pointerEvents="none">
                  <LuSearch aria-hidden="true" />
                </Box>
                <Input
                  aria-label="Search child laborer report"
                  placeholder="Name or nature of work"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                  pl={10}
                  minH="44px"
                />
              </Box>
            </Field.Root>
            <Field.Root>
              <Field.Label fontSize="sm" color="text.secondary">Filing year</Field.Label>
              <NativeSelect.Root width="full" disabled={categoriesLoading || years.length === 0}>
                <NativeSelect.Field aria-label="Filing year" minH="44px" value={year ?? ''} onChange={(event) => { setYear(Number(event.target.value)); setPage(1); }}>
                  {years.length === 0 && <option value="">No filing years available</option>}
                  {years.map((item) => <option key={item} value={item}>{item}</option>)}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Field.HelperText>Only actual Child Laborer annual categories are listed.</Field.HelperText>
            </Field.Root>
            {isAdmin && (
              <Field.Root>
                <Field.Label fontSize="sm" color="text.secondary">Barangay scope</Field.Label>
                <NativeSelect.Root width="full">
                  <NativeSelect.Field aria-label="Barangay" minH="44px" value={barangayId} onChange={(event) => { setBarangayId(event.target.value); setPage(1); }}>
                    <option value="">All Barangays</option>
                    {barangays.map((barangay) => <option key={barangay.id} value={barangay.id}>{barangay.name}</option>)}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            )}
            <Field.Root>
              <Field.Label fontSize="sm" color="text.secondary">Case status</Field.Label>
              <NativeSelect.Root width="full">
                <NativeSelect.Field aria-label="Record status" minH="44px" value={status} onChange={(event) => { setStatus(event.target.value as ChildLaborerStatus | ''); setPage(1); }}>
                  <option value="">Active & closed</option>
                  {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          </Grid>
        </Card.Body>
      </Card.Root>

      {year === null ? (
        <Card.Root borderColor="border" borderRadius="lg">
          <Card.Body p={{ base: 5, md: 7 }} textAlign="center">
            <Heading size="sm">No Child Laborer filing year is available</Heading>
            <Text mt={2} color="text.muted">Create an annual Child Laborer category before generating reports.</Text>
          </Card.Body>
        </Card.Root>
      ) : (
        <ChildLaborerAnalytics
          summary={summary}
          year={year}
          scopeLabel={scopeLabel}
          loading={analyticsLoading}
          error={analyticsError}
          onRetry={() => setAnalyticsRevision((revision) => revision + 1)}
        />
      )}

      <Box mt={{ base: 8, md: 10 }} mb={4}>
        <Heading as="h2" size="md" fontFamily="heading" fontWeight="650">Detailed child laborer registry</Heading>
        <Text mt={1} fontSize="sm" color="text.muted">Audit the individual records behind every summary and chart above.</Text>
      </Box>

      <DataTable
        columns={columns}
        data={records}
        loading={recordsLoading}
        variant="excel"
        emptyMessage={year === null ? 'No Child Laborer filing year is available.' : `No child laborer records found for ${year}.`}
        pagination={{ page: meta.page, totalPages: meta.totalPages, totalItems: meta.totalItems, onPageChange: setPage }}
        sorting={{
          key: sort.key,
          direction: sort.direction,
          onChange: (key, direction) => { setSort({ key: key as ChildLaborerSortField, direction }); setPage(1); },
        }}
      />
    </DashboardLayout>
  );
};
