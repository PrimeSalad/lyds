import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Badge, Box, Button, Card, Flex, Grid, HStack, NativeSelect, SimpleGrid, Skeleton, Text, VStack } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { LuArrowRight, LuCheck, LuClipboardCheck, LuClock3, LuMapPin } from 'react-icons/lu';
import { type RootState } from '../../../../redux/store';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { Pagination } from '../../../../shared/components/Pagination';
import { showToast } from '../../../../shared/toast';
import { categoryApi } from '../../../categories/infrastructure/category-api';
import { reportApi, type DashboardAnalytics } from '../../../reports/infrastructure/report-api';
import { youthRecordApi, type YouthRecord } from '../../infrastructure/youth-record-api';

type QueueBarangay = DashboardAnalytics['barangayCoverage'][number];

const formatSubmittedAt = (value?: string | null) => {
  if (!value) return 'Submission date unavailable';
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const ReviewQueuePage = () => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'ADMIN';
  const [filingYears, setFilingYears] = useState<number[]>([]);
  const [filingYear, setFilingYear] = useState('');
  const [filtersReady, setFiltersReady] = useState(false);
  const [barangays, setBarangays] = useState<QueueBarangay[]>([]);
  const [selectedBarangayId, setSelectedBarangayId] = useState('');
  const [records, setRecords] = useState<YouthRecord[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, totalItems: 0, totalPages: 1 });
  const [pendingRecord, setPendingRecord] = useState<YouthRecord | null>(null);
  const [bulkApprovalOpen, setBulkApprovalOpen] = useState(false);

  useEffect(() => {
    if (profile && !isAdmin) navigate('/', { replace: true });
  }, [isAdmin, navigate, profile]);

  useEffect(() => {
    if (!isAdmin) return;
    categoryApi.list()
      .then((response) => {
        const years = [...new Set(response.data
          .filter((category) => category.record_type === 'YOUTH_PROFILE')
          .map((category) => category.filing_year)
          .filter((year): year is number => Number.isInteger(year)))]
          .sort((left, right) => right - left);
        setFilingYears(years);
        if (years.length > 0) {
          const currentYear = new Date().getFullYear();
          setFilingYear(String(years.includes(currentYear) ? currentYear : years[0]));
        }
      })
      .catch(() => showToast.error('Filing years could not be loaded'))
      .finally(() => setFiltersReady(true));
  }, [isAdmin]);

  const loadOverview = useCallback(async () => {
    if (!isAdmin || !filtersReady) return;
    setOverviewLoading(true);
    try {
      const response = await reportApi.getDashboard({
        filingYear: filingYear ? Number(filingYear) : undefined,
      });
      const waitingBarangays = response.data.barangayCoverage
        .filter((barangay) => barangay.pendingReview > 0)
        .sort((left, right) => right.pendingReview - left.pendingReview || left.barangayName.localeCompare(right.barangayName));
      setBarangays(waitingBarangays);
      setSelectedBarangayId((current) => (
        waitingBarangays.some((barangay) => barangay.barangayId === current)
          ? current
          : waitingBarangays[0]?.barangayId ?? ''
      ));
    } catch (error) {
      setBarangays([]);
      showToast.error({
        title: 'Review queue could not be loaded',
        description: error instanceof Error ? error.message : 'Refresh the page and try again.',
      });
    } finally {
      setOverviewLoading(false);
    }
  }, [filingYear, filtersReady, isAdmin]);

  useEffect(() => {
    setPage(1);
    void loadOverview();
  }, [loadOverview]);

  const loadRecords = useCallback(async () => {
    if (!selectedBarangayId) {
      setRecords([]);
      setMeta({ page: 1, pageSize: 10, totalItems: 0, totalPages: 1 });
      return;
    }
    setRecordsLoading(true);
    try {
      const response = await youthRecordApi.list({
        page,
        pageSize: 10,
        status: 'SUBMITTED',
        barangay_id: selectedBarangayId,
        filing_year: filingYear ? Number(filingYear) : undefined,
        sortField: 'created_at',
        sortDir: 'asc',
      });
      setRecords(response.data);
      setMeta(response.meta);
    } catch (error) {
      setRecords([]);
      showToast.error({
        title: 'Submitted records could not be loaded',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setRecordsLoading(false);
    }
  }, [filingYear, page, selectedBarangayId]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const selectedBarangay = useMemo(
    () => barangays.find((barangay) => barangay.barangayId === selectedBarangayId) ?? null,
    [barangays, selectedBarangayId],
  );
  const totalPending = useMemo(
    () => barangays.reduce((total, barangay) => total + barangay.pendingReview, 0),
    [barangays],
  );

  const approveRecord = async () => {
    if (!pendingRecord) return;
    await youthRecordApi.approve(pendingRecord.id);
    showToast.success(`${pendingRecord.display_name} approved`);
    setPendingRecord(null);
    if (records.length === 1 && page > 1) setPage((current) => current - 1);
    else await loadRecords();
    await loadOverview();
  };

  const approveBarangay = async () => {
    if (!selectedBarangay) return;
    const response = await youthRecordApi.approveSubmittedByBarangay({
      barangay_id: selectedBarangay.barangayId,
      filing_year: filingYear ? Number(filingYear) : undefined,
    });
    showToast.success({
      title: 'Barangay submissions approved',
      description: `${response.data.approved_count.toLocaleString()} submitted record${response.data.approved_count === 1 ? '' : 's'} approved for ${selectedBarangay.barangayName}.`,
    });
    setBulkApprovalOpen(false);
    setPage(1);
    await loadOverview();
    await loadRecords();
  };

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <PageHeader
        title="Review Queue"
        description="Review SK submissions grouped by barangay, then approve records individually or complete one barangay at a time."
        actions={(
          <NativeSelect.Root width={{ base: 'full', sm: '180px' }} disabled={!filtersReady || overviewLoading}>
            <NativeSelect.Field
              aria-label="Filter review queue by filing year"
              value={filingYear}
              onChange={(event) => setFilingYear(event.target.value)}
            >
              <option value="">All years</option>
              {filingYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        )}
      />

      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4} mb={6}>
        {[
          { label: 'Pending submissions', value: totalPending, icon: LuClock3, color: 'orange' },
          { label: 'Barangays waiting', value: barangays.length, icon: LuMapPin, color: 'blue' },
          { label: 'Filing year', value: filingYear || 'All', icon: LuClipboardCheck, color: 'green' },
        ].map((item) => (
          <Card.Root key={item.label} borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={5}>
              <Flex justify="space-between" gap={3}>
                <Box>
                  <Text fontSize="sm" color="text.muted">{item.label}</Text>
                  <Text mt={1} fontFamily="heading" fontSize="2xl" fontWeight="700" color={`${item.color}.700`}>
                    {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                  </Text>
                </Box>
                <Flex boxSize="40px" align="center" justify="center" bg={`${item.color}.50`} color={`${item.color}.700`} borderRadius="md">
                  <item.icon size={20} aria-hidden="true" />
                </Flex>
              </Flex>
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>

      <Grid templateColumns={{ base: '1fr', lg: '320px minmax(0, 1fr)' }} gap={5} alignItems="start">
        <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" overflow="hidden">
          <Card.Header px={5} py={4} borderBottomWidth="1px" borderColor="border">
            <Text fontFamily="heading" fontWeight="600">Barangays waiting</Text>
            <Text mt={1} fontSize="sm" color="text.muted">Choose a barangay to open its submitted records.</Text>
          </Card.Header>
          <Card.Body p={2}>
            {overviewLoading ? (
              <VStack align="stretch" gap={2} p={2}>{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} height="64px" borderRadius="md" />)}</VStack>
            ) : barangays.length === 0 ? (
              <Box p={6} textAlign="center">
                <Flex mx="auto" boxSize="44px" align="center" justify="center" bg="success.light" color="success" borderRadius="full">
                  <LuCheck size={22} aria-hidden="true" />
                </Flex>
                <Text mt={3} fontFamily="heading" fontWeight="600">Queue is clear</Text>
                <Text mt={1} fontSize="sm" color="text.muted">No submitted records are waiting for this filing year.</Text>
              </Box>
            ) : (
              <VStack align="stretch" gap={1} maxH="560px" overflowY="auto">
                {barangays.map((barangay) => {
                  const selected = barangay.barangayId === selectedBarangayId;
                  return (
                    <Button
                      key={barangay.barangayId}
                      variant="ghost"
                      minH="64px"
                      height="auto"
                      px={3}
                      py={2.5}
                      justifyContent="space-between"
                      bg={selected ? 'primary.50' : 'transparent'}
                      color={selected ? 'primary.800' : 'text.primary'}
                      borderLeftWidth="3px"
                      borderLeftColor={selected ? 'primary.600' : 'transparent'}
                      onClick={() => { setSelectedBarangayId(barangay.barangayId); setPage(1); }}
                    >
                      <Box textAlign="left" minW={0}>
                        <Text fontWeight="600" truncate>{barangay.barangayName}</Text>
                        <Text mt={1} fontSize="xs" color="text.muted">{barangay.isActive ? 'Active barangay' : 'Inactive barangay'}</Text>
                      </Box>
                      <Badge colorPalette="orange" variant="subtle" flexShrink={0}>{barangay.pendingReview}</Badge>
                    </Button>
                  );
                })}
              </VStack>
            )}
          </Card.Body>
        </Card.Root>

        <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" overflow="hidden" minH="420px">
          <Card.Header px={{ base: 4, md: 5 }} py={4} borderBottomWidth="1px" borderColor="border">
            <Flex justify="space-between" align={{ base: 'stretch', sm: 'center' }} gap={4} direction={{ base: 'column', sm: 'row' }}>
              <Box>
                <Text fontFamily="heading" fontWeight="600">{selectedBarangay?.barangayName ?? 'Submitted records'}</Text>
                <Text mt={1} fontSize="sm" color="text.muted">
                  {selectedBarangay ? `${selectedBarangay.pendingReview.toLocaleString()} awaiting review` : 'Select a barangay from the queue.'}
                </Text>
              </Box>
              {selectedBarangay && (
                <Button colorPalette="green" onClick={() => setBulkApprovalOpen(true)}>
                  <LuCheck /> Approve Barangay
                </Button>
              )}
            </Flex>
          </Card.Header>
          <Card.Body p={{ base: 3, md: 5 }}>
            {recordsLoading ? (
              <VStack align="stretch" gap={3}>{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} height="78px" borderRadius="md" />)}</VStack>
            ) : records.length === 0 ? (
              <Box py={10} textAlign="center">
                <Text fontFamily="heading" fontWeight="600">No submitted records</Text>
                <Text mt={1} color="text.muted" fontSize="sm">Choose another barangay or filing year.</Text>
              </Box>
            ) : (
              <VStack align="stretch" gap={3}>
                {records.map((record) => (
                  <Flex
                    key={record.id}
                    p={4}
                    gap={4}
                    align={{ base: 'stretch', md: 'center' }}
                    justify="space-between"
                    direction={{ base: 'column', md: 'row' }}
                    borderWidth="1px"
                    borderColor="border"
                    borderRadius="lg"
                    bg="surface"
                    _hover={{ borderColor: 'primary.300', bg: 'primary.50' }}
                    transition="background-color 0.15s ease, border-color 0.15s ease"
                  >
                    <Box minW={0}>
                      <HStack gap={2} wrap="wrap">
                        <Text fontFamily="heading" fontWeight="600" truncate>{record.display_name}</Text>
                        <Badge colorPalette="orange" variant="subtle">Submitted</Badge>
                      </HStack>
                      <Text mt={1} fontSize="sm" color="text.secondary">
                        {record.category_name ?? 'Youth Profile'}{record.category_filing_year ? ` · ${record.category_filing_year}` : ''}
                      </Text>
                      <Text mt={1} fontSize="xs" color="text.muted">Submitted {formatSubmittedAt(record.submitted_at)}</Text>
                    </Box>
                    <HStack gap={2} flexShrink={0}>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/youth-records/${record.id}`)}>
                        Review <LuArrowRight />
                      </Button>
                      <Button colorPalette="green" size="sm" onClick={() => setPendingRecord(record)}>
                        <LuCheck /> Approve
                      </Button>
                    </HStack>
                  </Flex>
                ))}
              </VStack>
            )}
            <Box mt={4}>
              <Pagination page={meta.page} totalPages={meta.totalPages} totalItems={meta.totalItems} onPageChange={setPage} />
            </Box>
          </Card.Body>
        </Card.Root>
      </Grid>

      <ConfirmDialog
        open={!!pendingRecord}
        onOpenChange={({ open }) => { if (!open) setPendingRecord(null); }}
        title={`Approve ${pendingRecord?.display_name ?? 'this record'}?`}
        description="This confirms that the submitted youth profile has been reviewed and is ready for official reports."
        confirmLabel="Approve Record"
        onConfirm={approveRecord}
      />

      <ConfirmDialog
        open={bulkApprovalOpen}
        onOpenChange={({ open }) => setBulkApprovalOpen(open)}
        title={`Approve all ${selectedBarangay?.barangayName ?? 'barangay'} submissions?`}
        description={`This will approve all ${selectedBarangay?.pendingReview.toLocaleString() ?? 0} submitted youth records for ${filingYear || 'all filing years'} in this barangay. Review questionable profiles individually before continuing.`}
        confirmLabel="Approve Barangay"
        onConfirm={approveBarangay}
      />
    </DashboardLayout>
  );
};

export default ReviewQueuePage;
