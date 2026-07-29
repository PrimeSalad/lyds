import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Badge, Box, Button, Card, Flex, Grid, HStack, Input, NativeSelect, SimpleGrid, Skeleton, Text, VStack } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { LuArrowRight, LuCheck, LuCircleAlert, LuClipboardCheck, LuClock3, LuMapPin, LuRefreshCw, LuSearch } from 'react-icons/lu';
import { type RootState } from '../../../../redux/store';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { Pagination } from '../../../../shared/components/Pagination';
import { showToast } from '../../../../shared/toast';
import { categoryApi } from '../../../categories/infrastructure/category-api';
import { reportApi, type DashboardAnalytics } from '../../../reports/infrastructure/report-api';
import { youthRecordApi, type YouthRecord } from '../../infrastructure/youth-record-api';
import { filterReviewBarangays, formatReviewSubmittedAt, getReviewPageRange } from '../review-queue-utils';

type QueueBarangay = DashboardAnalytics['barangayCoverage'][number];

const ReviewQueuePage = () => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'ADMIN';
  const [filingYears, setFilingYears] = useState<number[]>([]);
  const [filingYear, setFilingYear] = useState('');
  const [filtersReady, setFiltersReady] = useState(false);
  const [barangays, setBarangays] = useState<QueueBarangay[]>([]);
  const [barangaySearch, setBarangaySearch] = useState('');
  const [selectedBarangayId, setSelectedBarangayId] = useState('');
  const [records, setRecords] = useState<YouthRecord[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, totalItems: 0, totalPages: 1 });
  const [pendingRecord, setPendingRecord] = useState<YouthRecord | null>(null);
  const [bulkApprovalOpen, setBulkApprovalOpen] = useState(false);
  const overviewRequestId = useRef(0);
  const recordsRequestId = useRef(0);

  useEffect(() => {
    if (profile && !isAdmin) navigate('/', { replace: true });
  }, [isAdmin, navigate, profile]);

  useEffect(() => {
    if (!isAdmin) return;
    categoryApi.list('YOUTH_PROFILE')
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
    const requestId = ++overviewRequestId.current;
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const response = await reportApi.getDashboard({
        filingYear: filingYear ? Number(filingYear) : undefined,
      });
      const waitingBarangays = response.data.barangayCoverage
        .filter((barangay) => barangay.pendingReview > 0)
        .sort((left, right) => right.pendingReview - left.pendingReview || left.barangayName.localeCompare(right.barangayName));
      if (requestId !== overviewRequestId.current) return;
      setBarangays(waitingBarangays);
      setSelectedBarangayId((current) => (
        waitingBarangays.some((barangay) => barangay.barangayId === current)
          ? current
          : waitingBarangays[0]?.barangayId ?? ''
      ));
    } catch (error) {
      if (requestId !== overviewRequestId.current) return;
      setBarangays([]);
      const message = error instanceof Error ? error.message : 'Refresh the page and try again.';
      setOverviewError(message);
      showToast.error({
        title: 'Review queue could not be loaded',
        description: message,
      });
    } finally {
      if (requestId === overviewRequestId.current) setOverviewLoading(false);
    }
  }, [filingYear, filtersReady, isAdmin]);

  useEffect(() => {
    setPage(1);
    void loadOverview();
  }, [loadOverview]);

  const loadRecords = useCallback(async () => {
    const requestId = ++recordsRequestId.current;
    if (!selectedBarangayId) {
      setRecords([]);
      setRecordsError(null);
      setMeta({ page: 1, pageSize: 10, totalItems: 0, totalPages: 1 });
      return;
    }
    setRecordsLoading(true);
    setRecordsError(null);
    setRecords([]);
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
      if (requestId !== recordsRequestId.current) return;
      setRecords(response.data);
      setMeta(response.meta);
    } catch (error) {
      if (requestId !== recordsRequestId.current) return;
      setRecords([]);
      const message = error instanceof Error ? error.message : 'Please try again.';
      setRecordsError(message);
      showToast.error({
        title: 'Submitted records could not be loaded',
        description: message,
      });
    } finally {
      if (requestId === recordsRequestId.current) setRecordsLoading(false);
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
  const filteredBarangays = useMemo(
    () => filterReviewBarangays(barangays, barangaySearch),
    [barangaySearch, barangays],
  );
  const visibleRange = useMemo(
    () => getReviewPageRange(meta.page, meta.pageSize, meta.totalItems),
    [meta],
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
  };

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <PageHeader
        title="Review Queue"
        description="Work through submitted youth profiles by barangay, verify details, and approve only review-ready records."
        actions={(
          <Box as="label" display="block" width={{ base: 'full', sm: '190px' }}>
            <Text fontSize="xs" fontWeight="600" color="text.muted" mb={1}>Filing year</Text>
            <NativeSelect.Root width="full" disabled={!filtersReady || overviewLoading}>
              <NativeSelect.Field
                value={filingYear}
                minH="44px"
                borderColor="border.strong"
                onChange={(event) => {
                  setFilingYear(event.target.value);
                  setSelectedBarangayId('');
                  setBarangaySearch('');
                  setPage(1);
                }}
              >
                <option value="">All years</option>
                {filingYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>
        )}
      />

      <SimpleGrid columns={{ base: 2, sm: 3 }} gap={3} mb={5} aria-label="Review queue summary">
        {[
          { label: 'Pending submissions', value: totalPending, icon: LuClock3, color: 'orange' },
          { label: 'Barangays waiting', value: barangays.length, icon: LuMapPin, color: 'blue' },
          { label: 'Filing year', value: filingYear || 'All', icon: LuClipboardCheck, color: 'green' },
        ].map((item, index) => (
          <Card.Root
            key={item.label}
            gridColumn={{ base: index === 2 ? '1 / -1' : 'auto', sm: 'auto' }}
            borderColor="border"
            borderRadius="lg"
            boxShadow="panel"
          >
            <Card.Body p={{ base: 4, md: 5 }}>
              <Flex justify="space-between" gap={3}>
                <Box>
                  <Text fontSize="sm" color="text.muted">{item.label}</Text>
                  {overviewLoading ? (
                    <Skeleton mt={2} height="28px" width="72px" borderRadius="sm" />
                  ) : (
                    <Text mt={1} fontFamily="heading" fontSize="2xl" fontWeight="700" color={`${item.color}.700`}>
                      {overviewError && index < 2
                        ? '—'
                        : typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                    </Text>
                  )}
                </Box>
                <Flex boxSize="40px" align="center" justify="center" bg={`${item.color}.50`} color={`${item.color}.700`} borderRadius="md">
                  <item.icon size={20} aria-hidden="true" />
                </Flex>
              </Flex>
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>

      {overviewError && (
        <Card.Root mb={5} borderColor="danger" borderRadius="lg" bg="danger.light" role="alert">
          <Card.Body p={4}>
            <Flex direction={{ base: 'column', sm: 'row' }} align={{ base: 'stretch', sm: 'center' }} justify="space-between" gap={3}>
              <HStack align="flex-start" gap={3}>
                <Box color="danger" pt={0.5}><LuCircleAlert aria-hidden="true" /></Box>
                <Box>
                  <Text fontWeight="700">The review queue did not load</Text>
                  <Text mt={1} fontSize="sm" color="text.secondary">{overviewError}</Text>
                </Box>
              </HStack>
              <Button variant="outline" colorPalette="red" minH="44px" onClick={() => void loadOverview()}>
                <LuRefreshCw /> Retry
              </Button>
            </Flex>
          </Card.Body>
        </Card.Root>
      )}

      {!overviewError && !overviewLoading && barangays.length > 0 && (
        <Card.Root display={{ base: 'flex', lg: 'none' }} mb={4} borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={4}>
            <Box as="label" display="block">
              <Text fontFamily="heading" fontWeight="600">Barangay worklist</Text>
              <Text mt={1} mb={3} fontSize="sm" color="text.muted">Choose a barangay to review its pending submissions.</Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={selectedBarangayId}
                  minH="48px"
                  borderColor="border.strong"
                  onChange={(event) => {
                    setSelectedBarangayId(event.target.value);
                    setPage(1);
                  }}
                >
                  {barangays.map((barangay) => (
                    <option key={barangay.barangayId} value={barangay.barangayId}>
                      {barangay.barangayName} — {barangay.pendingReview} pending
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>
          </Card.Body>
        </Card.Root>
      )}

      <Grid templateColumns={{ base: '1fr', lg: '300px minmax(0, 1fr)' }} gap={5} alignItems="start">
        <Card.Root display={{ base: 'none', lg: 'flex' }} borderColor="border" borderRadius="lg" boxShadow="panel" overflow="hidden" position="sticky" top={4}>
          <Card.Header px={5} py={4} borderBottomWidth="1px" borderColor="border">
            <HStack justify="space-between" gap={3}>
              <Box>
                <Text fontFamily="heading" fontWeight="600">Barangay worklist</Text>
                <Text mt={1} fontSize="sm" color="text.muted">Highest pending count first.</Text>
              </Box>
              {!overviewLoading && <Badge colorPalette="orange" variant="subtle">{barangays.length}</Badge>}
            </HStack>
            {!overviewLoading && barangays.length > 0 && (
              <Box position="relative" mt={4}>
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="text.muted" pointerEvents="none">
                  <LuSearch aria-hidden="true" />
                </Box>
                <Input
                  aria-label="Search barangays in review queue"
                  value={barangaySearch}
                  onChange={(event) => setBarangaySearch(event.target.value)}
                  placeholder="Search barangay"
                  minH="44px"
                  pl={10}
                  borderColor="border.strong"
                />
              </Box>
            )}
          </Card.Header>
          <Card.Body p={2}>
            {overviewLoading ? (
              <VStack align="stretch" gap={2} p={2}>{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} height="64px" borderRadius="md" />)}</VStack>
            ) : overviewError ? (
              <Box p={5} textAlign="center"><Text fontSize="sm" color="text.muted">Retry the queue above.</Text></Box>
            ) : barangays.length === 0 ? (
              <Box p={6} textAlign="center">
                <Flex mx="auto" boxSize="44px" align="center" justify="center" bg="success.light" color="success" borderRadius="full">
                  <LuCheck size={22} aria-hidden="true" />
                </Flex>
                <Text mt={3} fontFamily="heading" fontWeight="600">Queue is clear</Text>
                <Text mt={1} fontSize="sm" color="text.muted">No submitted records are waiting for this filing year.</Text>
              </Box>
            ) : filteredBarangays.length === 0 ? (
              <Box p={6} textAlign="center">
                <Text fontFamily="heading" fontWeight="600">No matching barangay</Text>
                <Text mt={1} fontSize="sm" color="text.muted">Try a different search.</Text>
              </Box>
            ) : (
              <VStack align="stretch" gap={1} maxH="calc(100dvh - 330px)" minH="240px" overflowY="auto">
                {filteredBarangays.map((barangay) => {
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
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => { setSelectedBarangayId(barangay.barangayId); setPage(1); }}
                    >
                      <Box textAlign="left" minW={0}>
                        <Text fontWeight="600" truncate>{barangay.barangayName}</Text>
                        <Text mt={1} fontSize="xs" color="text.muted">{barangay.isActive ? 'Active barangay' : 'Inactive barangay'}</Text>
                      </Box>
                      <Badge colorPalette="orange" variant="subtle" flexShrink={0}>{barangay.pendingReview} pending</Badge>
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
                <HStack gap={2} wrap="wrap">
                  <Text fontFamily="heading" fontSize="lg" fontWeight="650">{selectedBarangay?.barangayName ?? 'Submitted records'}</Text>
                  {selectedBarangay && <Badge colorPalette="orange" variant="subtle">Needs review</Badge>}
                </HStack>
                <Text mt={1} fontSize="sm" color="text.muted">
                  {selectedBarangay
                    ? `${selectedBarangay.pendingReview.toLocaleString()} awaiting review · showing oldest submissions first`
                    : 'Select a barangay from the queue.'}
                </Text>
              </Box>
              {selectedBarangay && (
                <Button colorPalette="green" minH="44px" onClick={() => setBulkApprovalOpen(true)} disabled={recordsLoading || selectedBarangay.pendingReview === 0}>
                  <LuCheck /> Approve all {selectedBarangay.pendingReview.toLocaleString()}
                </Button>
              )}
            </Flex>
          </Card.Header>
          <Card.Body p={{ base: 3, md: 5 }}>
            {overviewError ? (
              <Box py={12} px={4} textAlign="center">
                <Flex mx="auto" boxSize="48px" align="center" justify="center" bg="danger.light" color="danger" borderRadius="full">
                  <LuCircleAlert size={22} aria-hidden="true" />
                </Flex>
                <Text mt={3} fontFamily="heading" fontWeight="600">Queue unavailable</Text>
                <Text mt={1} color="text.muted" fontSize="sm">Use the retry action above to load the worklist.</Text>
              </Box>
            ) : recordsLoading ? (
              <VStack align="stretch" gap={3} aria-label="Loading submitted records">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} height="112px" borderRadius="md" />)}</VStack>
            ) : recordsError ? (
              <Box py={10} px={4} textAlign="center" role="alert">
                <Flex mx="auto" boxSize="44px" align="center" justify="center" bg="danger.light" color="danger" borderRadius="full">
                  <LuCircleAlert size={22} aria-hidden="true" />
                </Flex>
                <Text mt={3} fontFamily="heading" fontWeight="600">Records did not load</Text>
                <Text mt={1} color="text.muted" fontSize="sm">{recordsError}</Text>
                <Button mt={4} variant="outline" minH="44px" onClick={() => void loadRecords()}><LuRefreshCw /> Retry records</Button>
              </Box>
            ) : !overviewLoading && barangays.length === 0 ? (
              <Box py={12} px={4} textAlign="center">
                <Flex mx="auto" boxSize="48px" align="center" justify="center" bg="success.light" color="success" borderRadius="full">
                  <LuCheck size={22} aria-hidden="true" />
                </Flex>
                <Text mt={3} fontFamily="heading" fontWeight="600">Review queue is clear</Text>
                <Text mt={1} color="text.muted" fontSize="sm">No submitted records are waiting for {filingYear || 'the selected years'}.</Text>
              </Box>
            ) : !selectedBarangay ? (
              <Box py={12} px={4} textAlign="center">
                <Flex mx="auto" boxSize="48px" align="center" justify="center" bg="primary.50" color="primary.700" borderRadius="full">
                  <LuMapPin size={22} aria-hidden="true" />
                </Flex>
                <Text mt={3} fontFamily="heading" fontWeight="600">Choose a barangay</Text>
                <Text mt={1} color="text.muted" fontSize="sm">Select one from the worklist to start reviewing.</Text>
              </Box>
            ) : records.length === 0 ? (
              <Box py={10} textAlign="center">
                <Flex mx="auto" boxSize="44px" align="center" justify="center" bg="success.light" color="success" borderRadius="full">
                  <LuCheck size={22} aria-hidden="true" />
                </Flex>
                <Text mt={3} fontFamily="heading" fontWeight="600">Barangay queue completed</Text>
                <Text mt={1} color="text.muted" fontSize="sm">Choose another barangay or filing year.</Text>
              </Box>
            ) : (
              <VStack align="stretch" gap={3}>
                <Flex justify="space-between" gap={3} wrap="wrap" px={1}>
                  <Text fontSize="sm" color="text.muted">
                    Showing {visibleRange.start}–{visibleRange.end} of {meta.totalItems.toLocaleString()}
                  </Text>
                  <Text fontSize="sm" color="text.muted">Review details before approving.</Text>
                </Flex>
                {records.map((record) => (
                  <Flex
                    key={record.id}
                    p={4}
                    gap={4}
                    align={{ base: 'stretch', md: 'center' }}
                    justify="space-between"
                    direction={{ base: 'column', md: 'row' }}
                    borderWidth="1px"
                    borderColor="border.strong"
                    borderLeftWidth="4px"
                    borderLeftColor="orange.400"
                    borderRadius="lg"
                    bg="surface"
                    _hover={{ borderColor: 'primary.300', bg: 'primary.50' }}
                    transition="background-color 0.15s ease, border-color 0.15s ease"
                  >
                    <Box minW={0}>
                      <HStack gap={2} wrap="wrap">
                        <Text fontFamily="heading" fontWeight="650" overflowWrap="anywhere">{record.display_name}</Text>
                        <Badge colorPalette="orange" variant="subtle">Submitted</Badge>
                      </HStack>
                      <Text mt={1} fontSize="sm" color="text.secondary">
                        {record.category_name ?? 'Youth Profile'}{record.category_filing_year ? ` · ${record.category_filing_year}` : ''}
                      </Text>
                      <HStack mt={2} gap={2} wrap="wrap" color="text.muted" fontSize="xs">
                        <LuClock3 aria-hidden="true" />
                        <Text>Submitted {formatReviewSubmittedAt(record.submitted_at)}</Text>
                      </HStack>
                      <HStack mt={3} gap={2} wrap="wrap">
                        {record.age_at_submission !== null && <Badge variant="outline">Age {record.age_at_submission}</Badge>}
                        {record.sex_label && <Badge variant="outline">{record.sex_label}</Badge>}
                        {record.contact_number && <Badge variant="outline">{record.contact_number}</Badge>}
                      </HStack>
                    </Box>
                    <Flex gap={2} flexShrink={0} direction={{ base: 'column', sm: 'row' }} align="stretch">
                      <Button variant="outline" minH="44px" onClick={() => navigate(`/youth-records/${record.id}`)}>
                        Review profile <LuArrowRight />
                      </Button>
                      <Button colorPalette="green" minH="44px" onClick={() => setPendingRecord(record)}>
                        <LuCheck /> Approve
                      </Button>
                    </Flex>
                  </Flex>
                ))}
              </VStack>
            )}
            {!recordsLoading && !recordsError && meta.totalItems > 0 && (
              <Box mt={5} pt={4} borderTopWidth="1px" borderColor="border">
                <Pagination page={meta.page} totalPages={meta.totalPages} totalItems={meta.totalItems} onPageChange={setPage} />
              </Box>
            )}
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
