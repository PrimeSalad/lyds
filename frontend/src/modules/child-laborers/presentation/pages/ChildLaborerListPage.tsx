import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import { LuDownload, LuFilePlus2, LuSearch } from 'react-icons/lu';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { type RootState } from '../../../../redux/store';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { StatusBadge } from '../../../../shared/components/StatusBadge';
import { DataTable, type Action, type Column } from '../../../../shared/tables/DataTable';
import { showToast } from '../../../../shared/toast';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import {
  childLaborerApi,
  type ChildLaborerRecord,
  type ChildLaborerSortField,
  type ChildLaborerStatus,
  type ChildLaborerSummary,
} from '../../infrastructure/child-laborer-api';

const currentYear = new Date().getFullYear();
const filingYears = Array.from({ length: currentYear - 1999 }, (_, index) => currentYear + 1 - index);

const statusOptions: Array<{ value: ChildLaborerStatus; label: string }> = [
  { value: 'IDENTIFIED', label: 'Identified' },
  { value: 'VALIDATED', label: 'Validated' },
  { value: 'REFERRED', label: 'Referred' },
  { value: 'MONITORED', label: 'Monitored' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const dateLabel = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1].slice(2)}` : value;
};

const valueOrDash = (value?: string | null) => value || '—';
const genderLabel = (value: ChildLaborerRecord['gender']) => (
  value === 'NOT_SPECIFIED' ? 'Not specified' : value.charAt(0) + value.slice(1).toLowerCase()
);

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

const ChildLaborerListPage = () => {
  const navigate = useNavigate();
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';
  const [records, setRecords] = useState<ChildLaborerRecord[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [summary, setSummary] = useState<ChildLaborerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filingYear, setFilingYear] = useState(currentYear);
  const [barangayId, setBarangayId] = useState('');
  const [status, setStatus] = useState<ChildLaborerStatus | ''>('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });
  const [sort, setSort] = useState<{ key: ChildLaborerSortField; direction: 'asc' | 'desc' }>({
    key: 'child_name',
    direction: 'asc',
  });

  const loadRecords = async () => {
    setLoading(true);
    try {
      const result = await childLaborerApi.list({
        filingYear,
        barangayId: isAdmin ? barangayId || undefined : undefined,
        status: status || undefined,
        search: deferredSearch || undefined,
        page,
        pageSize: 25,
        sortField: sort.key,
        sortDir: sort.direction,
      });
      setRecords(result.data);
      setMeta(result.meta);
    } catch (error) {
      showToast.error({
        title: 'Could not load child laborer records',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, [filingYear, barangayId, status, deferredSearch, page, sort.key, sort.direction, isAdmin]);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const result = await childLaborerApi.summary({
          filingYear,
          barangayId: isAdmin ? barangayId || undefined : undefined,
        });
        setSummary(result.data);
      } catch {
        setSummary(null);
      }
    };
    void loadSummary();
  }, [filingYear, barangayId, isAdmin, records]);

  useEffect(() => {
    if (!isAdmin) return;
    void barangayApi.list()
      .then(setBarangays)
      .catch(() => showToast.error('Could not load barangays'));
  }, [isAdmin]);

  const resetPage = () => setPage(1);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(true);
    try {
      const blob = await childLaborerApi.export({
        format,
        filingYear,
        barangayId: isAdmin ? barangayId || undefined : undefined,
        status: status || undefined,
        search: deferredSearch || undefined,
      });
      downloadBlob(blob, `Child Laborers ${filingYear}.${format}`);
      showToast.success({ title: 'Export ready', description: `The ${filingYear} child laborer list was downloaded.` });
    } catch (error) {
      showToast.error({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo<Column<ChildLaborerRecord>[]>(() => [
    { key: 'row_number', header: 'No.', width: '70px', align: 'center' },
    { key: 'barangay_name', header: 'Barangay', sortable: true, width: '160px' },
    { key: 'child_name', header: 'Surname', sortable: true, width: '150px', render: (record) => record.last_name },
    { key: 'first_name', header: 'First Name', width: '150px' },
    { key: 'middle_name', header: 'Middle Name', width: '150px', render: (record) => valueOrDash(record.middle_name) },
    { key: 'age', header: 'Age', width: '75px', align: 'center' },
    { key: 'gender', header: 'Gender', sortable: true, width: '115px', render: (record) => genderLabel(record.gender) },
    { key: 'birth_date', header: 'Date of Birth', sortable: true, width: '130px', render: (record) => dateLabel(record.birth_date) },
    { key: 'attending_school', header: 'Attending School', width: '140px', align: 'center', render: (record) => record.attending_school ? 'Yes' : 'No' },
    { key: 'highest_grade_completed', header: 'Highest Grade Completed', width: '210px', render: (record) => valueOrDash(record.highest_grade_completed) },
    { key: 'nature_of_work', header: 'Nature of Work', width: '210px' },
    { key: 'father_name', header: 'Father', width: '190px', render: (record) => valueOrDash(record.father_name) },
    { key: 'mother_name', header: 'Mother', width: '190px', render: (record) => valueOrDash(record.mother_name) },
    { key: 'guardian_name', header: 'Guardian', width: '190px', render: (record) => valueOrDash(record.guardian_name) },
    { key: 'parent_guardian_occupation', header: 'Parent/Guardian Occupation', width: '230px', render: (record) => valueOrDash(record.parent_guardian_occupation) },
    { key: 'record_status', header: 'Status', sortable: true, width: '140px', render: (record) => <StatusBadge status={record.record_status} /> },
    { key: 'remarks', header: 'Remarks', width: '260px', render: (record) => valueOrDash(record.remarks) },
  ], []);

  const actions = useMemo<Action<ChildLaborerRecord>[]>(() => [
    {
      label: 'Edit',
      onClick: (record) => navigate(`/child-laborers/${record.id}/edit`),
      show: (record) => record.record_status !== 'ARCHIVED',
    },
    {
      label: 'Archive',
      variant: 'danger',
      show: (record) => record.record_status !== 'ARCHIVED',
      confirm: {
        title: (record) => `Archive ${record.child_name}?`,
        description: 'The record will leave active reports but remain available under the Archived filter.',
        confirmLabel: 'Archive Record',
        variant: 'danger',
      },
      onClick: async (record) => {
        await childLaborerApi.archive(record.id);
        showToast.success('Record archived');
        await loadRecords();
      },
    },
    {
      label: 'Restore',
      show: (record) => record.record_status === 'ARCHIVED',
      confirm: {
        title: (record) => `Restore ${record.child_name}?`,
        description: 'The record will return to Identified status and active yearly reports.',
        confirmLabel: 'Restore Record',
      },
      onClick: async (record) => {
        await childLaborerApi.restore(record.id);
        showToast.success('Record restored');
        await loadRecords();
      },
    },
  ], [navigate, filingYear, barangayId, status, deferredSearch, page, sort.key, sort.direction, isAdmin]);

  const filters = (
    <HStack gap={3} wrap="wrap" flex="1" width="full">
      <Box position="relative" width={{ base: 'full', lg: '280px' }}>
        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="text.muted" pointerEvents="none">
          <LuSearch aria-hidden="true" />
        </Box>
        <Input
          aria-label="Search child laborer records"
          placeholder="Search name or nature of work"
          value={search}
          onChange={(event) => { setSearch(event.target.value); resetPage(); }}
          pl={10}
          minH="44px"
        />
      </Box>
      <NativeSelect.Root width={{ base: 'full', sm: '150px' }}>
        <NativeSelect.Field
          aria-label="Filing year"
          value={filingYear}
          minH="44px"
          onChange={(event) => { setFilingYear(Number(event.target.value)); resetPage(); }}
        >
          {filingYears.map((year) => <option key={year} value={year}>{year}</option>)}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      {isAdmin && (
        <NativeSelect.Root width={{ base: 'full', sm: '190px' }}>
          <NativeSelect.Field
            aria-label="Barangay"
            value={barangayId}
            minH="44px"
            onChange={(event) => { setBarangayId(event.target.value); resetPage(); }}
          >
            <option value="">All Barangays</option>
            {barangays.map((barangay) => <option key={barangay.id} value={barangay.id}>{barangay.name}</option>)}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      )}
      <NativeSelect.Root width={{ base: 'full', sm: '175px' }}>
        <NativeSelect.Field
          aria-label="Record status"
          value={status}
          minH="44px"
          onChange={(event) => { setStatus(event.target.value as ChildLaborerStatus | ''); resetPage(); }}
        >
          <option value="">Active & closed</option>
          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </HStack>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Child Laborer Records"
        description="Maintain the protected yearly consolidation, case status, birthdays, education, work, and parent or guardian details."
        actions={(
          <HStack gap={2} wrap="wrap">
            <Button minH="44px" variant="outline" onClick={() => void handleExport('csv')} loading={exporting}>CSV</Button>
            <Button minH="44px" variant="outline" onClick={() => void handleExport('xlsx')} loading={exporting}>
              <LuDownload aria-hidden="true" /> Export Excel
            </Button>
            <Button minH="44px" colorPalette="green" onClick={() => navigate('/child-laborers/new')}>
              <LuFilePlus2 aria-hidden="true" /> Add Record
            </Button>
          </HStack>
        )}
      />

      <SimpleGrid columns={{ base: 2, lg: 5 }} gap={3} mb={6}>
        {[
          { label: `${filingYear} records`, value: summary?.total_records ?? 0 },
          { label: 'Attending school', value: summary?.attending_school ?? 0 },
          { label: 'Not attending', value: summary?.not_attending_school ?? 0 },
          { label: 'Active cases', value: summary?.active_cases ?? 0 },
          { label: 'Closed', value: summary?.closed_cases ?? 0 },
        ].map((item) => (
          <Card.Root key={item.label} borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={{ base: 3, md: 4 }}>
              <Text fontSize="xs" color="text.muted">{item.label}</Text>
              <Text fontSize="2xl" fontWeight="700" mt={1}>{item.value.toLocaleString()}</Text>
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>

      {!isAdmin && (
        <Box mb={4} p={4} bg="primary.50" borderRadius="lg" borderWidth="1px" borderColor="primary.100">
          <Text fontSize="sm" color="primary.800">Records and exports are automatically limited to your assigned barangay.</Text>
        </Box>
      )}

      <DataTable
        columns={columns}
        data={records}
        actions={actions}
        loading={loading}
        filters={filters}
        variant="excel"
        emptyMessage={`No child laborer records found for ${filingYear}.`}
        pagination={{ page: meta.page, totalPages: meta.totalPages, totalItems: meta.totalItems, onPageChange: setPage }}
        sorting={{
          key: sort.key,
          direction: sort.direction,
          onChange: (key, direction) => {
            setSort({ key: key as ChildLaborerSortField, direction });
            setPage(1);
          },
        }}
      />
    </DashboardLayout>
  );
};

export default ChildLaborerListPage;
