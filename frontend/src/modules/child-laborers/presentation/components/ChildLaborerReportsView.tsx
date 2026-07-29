import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, HStack, Input, NativeSelect, SimpleGrid, Text } from '@chakra-ui/react';
import { LuDownload, LuSearch } from 'react-icons/lu';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { StatusBadge } from '../../../../shared/components/StatusBadge';
import { DataTable, type Column } from '../../../../shared/tables/DataTable';
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

type ChildLaborerReportsViewProps = {
  onShowYouthRecords: () => void;
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1999 }, (_, index) => currentYear + 1 - index);
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
  const [year, setYear] = useState(currentYear);
  const [barangayId, setBarangayId] = useState('');
  const [status, setStatus] = useState<ChildLaborerStatus | ''>('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });
  const [sort, setSort] = useState<{ key: ChildLaborerSortField; direction: 'asc' | 'desc' }>({
    key: 'barangay_name',
    direction: 'asc',
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [listResult, summaryResult] = await Promise.all([
          childLaborerApi.list({
            filingYear: year,
            barangayId: isAdmin ? barangayId || undefined : undefined,
            status: status || undefined,
            search: deferredSearch || undefined,
            page,
            pageSize: 25,
            sortField: sort.key,
            sortDir: sort.direction,
          }),
          childLaborerApi.summary({
            filingYear: year,
            barangayId: isAdmin ? barangayId || undefined : undefined,
          }),
        ]);
        setRecords(listResult.data);
        setMeta(listResult.meta);
        setSummary(summaryResult.data);
      } catch (error) {
        showToast.error({
          title: 'Could not load child laborer report',
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [year, barangayId, status, deferredSearch, page, sort.key, sort.direction, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    void barangayApi.list().then(setBarangays).catch(() => showToast.error('Could not load barangays'));
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

  const filters = (
    <HStack gap={3} wrap="wrap" width="full">
      <Box position="relative" width={{ base: 'full', lg: '280px' }}>
        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="text.muted"><LuSearch aria-hidden="true" /></Box>
        <Input
          aria-label="Search child laborer report"
          placeholder="Search name or nature of work"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          pl={10}
          minH="44px"
        />
      </Box>
      <NativeSelect.Root width={{ base: 'full', sm: '150px' }}>
        <NativeSelect.Field aria-label="Filing year" minH="44px" value={year} onChange={(event) => { setYear(Number(event.target.value)); setPage(1); }}>
          {years.map((item) => <option key={item} value={item}>{item}</option>)}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      {isAdmin && (
        <NativeSelect.Root width={{ base: 'full', sm: '190px' }}>
          <NativeSelect.Field aria-label="Barangay" minH="44px" value={barangayId} onChange={(event) => { setBarangayId(event.target.value); setPage(1); }}>
            <option value="">All Barangays</option>
            {barangays.map((barangay) => <option key={barangay.id} value={barangay.id}>{barangay.name}</option>)}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      )}
      <NativeSelect.Root width={{ base: 'full', sm: '175px' }}>
        <NativeSelect.Field aria-label="Record status" minH="44px" value={status} onChange={(event) => { setStatus(event.target.value as ChildLaborerStatus | ''); setPage(1); }}>
          <option value="">Active & closed</option>
          {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </HStack>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Reports"
        description="Review and export the yearly child laborer consolidation within your authorized scope."
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
            <Button minH="44px" variant="outline" onClick={() => void exportRecords('csv')} loading={exporting}>Export CSV</Button>
            <Button minH="44px" colorPalette="green" onClick={() => void exportRecords('xlsx')} loading={exporting}>
              <LuDownload aria-hidden="true" /> Export XLSX
            </Button>
          </HStack>
        )}
      />

      <SimpleGrid columns={{ base: 2, lg: 5 }} gap={3} mb={6}>
        {[
          { label: `${year} records`, value: summary?.total_records ?? 0 },
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

      <DataTable
        columns={columns}
        data={records}
        loading={loading}
        filters={filters}
        variant="excel"
        emptyMessage={`No child laborer records found for ${year}.`}
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
