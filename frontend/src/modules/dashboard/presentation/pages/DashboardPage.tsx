import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Box, Button, Card, Field, Flex, Grid, HStack, Icon, NativeSelect, SimpleGrid, Skeleton, Text, VStack } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import type { IconType } from 'react-icons';
import {
  LuArrowRight,
  LuCalendarDays,
  LuCircleCheckBig,
  LuClock3,
  LuFileCheck2,
  LuMapPin,
  LuRefreshCw,
  LuTriangleAlert,
  LuUsersRound,
} from 'react-icons/lu';
import { type RootState } from '../../../../redux/store';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { AnnouncementFeed } from '../../../announcements/presentation/components/AnnouncementFeed';
import { SkipLink } from '../../../../ui/components/skip-link';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { reportApi, type DashboardAnalytics } from '../../../reports/infrastructure/report-api';
import { categoryApi } from '../../../categories/infrastructure/category-api';

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    if (!navigationOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavigationOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigationOpen]);

  return (
    <Box display="flex" minH="100dvh" bg="page.bg">
      <SkipLink />
      {navigationOpen && (
        <Box
          as="button"
          aria-label="Close navigation"
          position="fixed"
          inset={0}
          bg="blackAlpha.600"
          backdropFilter="blur(2px)"
          zIndex={20}
          display={{ base: 'block', lg: 'none' }}
          onClick={() => setNavigationOpen(false)}
        />
      )}
      <Sidebar isOpen={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <Box flex={1} ml={{ base: 0, lg: '256px' }} minW={0}>
        <TopBar onOpenNavigation={() => setNavigationOpen(true)} />
        <Box
          as="main"
          id="main-content"
          tabIndex={-1}
          px={{ base: 4, md: 6, xl: 8 }}
          py={{ base: 5, md: 7 }}
          maxW="1480px"
          mx="auto"
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

const formatNumber = (value: number) => value.toLocaleString('en-PH');
const formatDateTime = (value: string) => new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(value));

const statusColors: Record<string, string> = {
  DRAFT: '#94A3B8',
  SUBMITTED: '#D97706',
  APPROVED: '#15803D',
  RETURNED: '#B91C1C',
  ARCHIVED: '#64748B',
};

const statusPalettes: Record<string, string> = {
  DRAFT: 'gray',
  SUBMITTED: 'orange',
  APPROVED: 'green',
  RETURNED: 'red',
  ARCHIVED: 'gray',
};

type MetricCardProps = {
  label: string;
  value: number;
  helper: string;
  icon: IconType;
  loading: boolean;
  tone?: 'default' | 'warning' | 'success';
};

const MetricCard = ({ label, value, helper, icon, loading, tone = 'default' }: MetricCardProps) => {
  const colors = tone === 'warning'
    ? { bg: 'warning.light', color: 'warning' }
    : tone === 'success'
      ? { bg: 'success.light', color: 'success' }
      : { bg: 'primary.50', color: 'primary.700' };

  return (
    <Card.Root borderColor="border" borderRadius="md" boxShadow="panel" minH="148px">
      <Card.Body p={{ base: 4, md: 5 }}>
        <Flex justify="space-between" gap={3} align="flex-start">
          <Box minW={0}>
            <Text fontSize="sm" color="text.secondary" fontWeight="600">{label}</Text>
            <Skeleton loading={loading} mt={2} width={loading ? '72px' : 'auto'} minW={loading ? '72px' : 0}>
              <Text fontSize={{ base: '1.5rem', md: '1.75rem' }} whiteSpace="nowrap" lineHeight="1.1" fontWeight="750" fontFamily="heading" fontVariantNumeric="tabular-nums">
                {formatNumber(value)}
              </Text>
            </Skeleton>
          </Box>
          <Flex width="40px" height="40px" flexShrink={0} align="center" justify="center" borderRadius="md" bg={colors.bg} color={colors.color}>
            <Icon as={icon} boxSize="20px" aria-hidden="true" />
          </Flex>
        </Flex>
        <Text mt={3} fontSize="xs" color="text.muted">{helper}</Text>
      </Card.Body>
    </Card.Root>
  );
};

const SectionHeading = ({ title, description }: { title: string; description: string }) => (
  <Box>
    <Text fontFamily="heading" fontWeight="650" color="text.primary">{title}</Text>
    <Text mt={1} fontSize="sm" color="text.muted">{description}</Text>
  </Box>
);

const StatusPanel = ({ data }: { data: DashboardAnalytics }) => (
  <Card.Root borderColor="border" borderRadius="md" height="full">
    <Card.Header pb={2}>
      <SectionHeading title="Record pipeline" description="Current distribution across the review workflow." />
    </Card.Header>
    <Card.Body pt={3}>
      <VStack align="stretch" gap={4}>
        {data.statusDistribution.map((item) => (
          <Box key={item.status}>
            <Flex justify="space-between" gap={3} mb={1.5}>
              <HStack gap={2}>
                <Box width="8px" height="8px" borderRadius="full" bg={statusColors[item.status]} />
                <Text fontSize="sm" color="text.secondary">{item.label}</Text>
              </HStack>
              <Text fontSize="sm" fontWeight="700" fontVariantNumeric="tabular-nums">
                {formatNumber(item.count)} <Text as="span" color="text.muted" fontWeight="400">({item.percentage.toFixed(1)}%)</Text>
              </Text>
            </Flex>
            <Box height="7px" bg="surface.muted" borderRadius="full" overflow="hidden">
              <Box
                height="full"
                width={`${item.count > 0 ? Math.max(item.percentage, 1.5) : 0}%`}
                bg={statusColors[item.status]}
                borderRadius="full"
                transition="width 300ms ease"
              />
            </Box>
          </Box>
        ))}
      </VStack>
    </Card.Body>
  </Card.Root>
);

const TrendPanel = ({ data }: { data: DashboardAnalytics }) => {
  const maximum = Math.max(1, ...data.monthlyTrend.flatMap((month) => [month.created, month.submitted, month.approved]));
  const barHeight = (value: number) => `${Math.max(value === 0 ? 0 : 8, (value / maximum) * 136)}px`;

  return (
    <Card.Root borderColor="border" borderRadius="md" height="full">
      <Card.Header pb={2}>
        <Flex justify="space-between" gap={4} align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
          <SectionHeading title="Six-month activity" description="Created, submitted, and approved records by month." />
          <HStack gap={3} wrap="wrap" fontSize="xs" color="text.secondary">
            <HStack gap={1.5}><Box w="8px" h="8px" bg="#2563EB" borderRadius="xs" />Created</HStack>
            <HStack gap={1.5}><Box w="8px" h="8px" bg="#D97706" borderRadius="xs" />Submitted</HStack>
            <HStack gap={1.5}><Box w="8px" h="8px" bg="#15803D" borderRadius="xs" />Approved</HStack>
          </HStack>
        </Flex>
      </Card.Header>
      <Card.Body pt={2} overflowX="auto">
        <Flex minW="320px" height="190px" align="flex-end" gap={{ base: 1, md: 3 }} borderBottom="1px solid" borderColor="border" pb={2}>
          {data.monthlyTrend.map((month) => (
            <VStack
              key={month.month}
              flex="1"
              minW="42px"
              height="full"
              justify="flex-end"
              gap={2}
              aria-label={`${month.label}: ${month.created} created, ${month.submitted} submitted, ${month.approved} approved`}
            >
              <HStack align="flex-end" justify="center" gap="3px" height="145px" width="full">
                <Box width={{ base: '7px', md: '10px' }} height={barHeight(month.created)} bg="#2563EB" borderRadius="2px 2px 0 0" />
                <Box width={{ base: '7px', md: '10px' }} height={barHeight(month.submitted)} bg="#D97706" borderRadius="2px 2px 0 0" />
                <Box width={{ base: '7px', md: '10px' }} height={barHeight(month.approved)} bg="#15803D" borderRadius="2px 2px 0 0" />
              </HStack>
              <Text fontSize="xs" color="text.muted" fontWeight="600">{month.label}</Text>
            </VStack>
          ))}
        </Flex>
      </Card.Body>
    </Card.Root>
  );
};

const DataQualityPanel = ({ data, onOpenRecords }: { data: DashboardAnalytics; onOpenRecords: () => void }) => {
  const qualityItems = [
    { label: 'Incomplete core profiles', value: data.dataQuality.incompleteCore },
    { label: 'No contact information', value: data.dataQuality.missingContact },
    { label: 'Potential duplicate groups', value: data.dataQuality.duplicateCandidates },
    { label: 'Drafts inactive for 30+ days', value: data.dataQuality.staleDrafts },
  ];
  return (
    <Card.Root borderColor="border" borderRadius="md" height="full">
      <Card.Header pb={2}>
        <SectionHeading title="Data quality" description="Items that need cleanup before reporting." />
      </Card.Header>
      <Card.Body pt={3}>
        <Flex align="baseline" justify="space-between" mb={2}>
          <Text fontSize="sm" color="text.secondary">Core profile completion</Text>
          <Text fontFamily="heading" fontSize="lg" fontWeight="700">{data.dataQuality.completionRate.toFixed(1)}%</Text>
        </Flex>
        <Box height="8px" bg="surface.muted" borderRadius="full" overflow="hidden" mb={5}>
          <Box height="full" width={`${data.dataQuality.completionRate}%`} bg="primary.600" borderRadius="full" />
        </Box>
        <VStack align="stretch" gap={0}>
          {qualityItems.map((item) => (
            <Flex key={item.label} justify="space-between" gap={4} py={2.5} borderTop="1px solid" borderColor="border">
              <Text fontSize="sm" color="text.secondary">{item.label}</Text>
              <Text fontSize="sm" fontWeight="700" fontVariantNumeric="tabular-nums">{formatNumber(item.value)}</Text>
            </Flex>
          ))}
        </VStack>
        <Button mt={3} variant="ghost" size="sm" onClick={onOpenRecords} px={0} color="primary.700">
          Review youth records <LuArrowRight />
        </Button>
      </Card.Body>
    </Card.Root>
  );
};

type BarangayPanelProps = {
  data: DashboardAnalytics;
  filingYears: number[];
  selectedYear: string;
  appliedYear: string;
  loading: boolean;
  error: string | null;
  onYearChange: (year: string) => void;
  onOpenReports: () => void;
};

const BarangayPanel = ({
  data,
  filingYears,
  selectedYear,
  appliedYear,
  loading,
  error,
  onYearChange,
  onOpenReports,
}: BarangayPanelProps) => (
  <Card.Root borderColor="border" borderRadius="lg" height="full" overflow="hidden" boxShadow="panel">
    <Card.Header p={{ base: 4, md: 5 }} borderBottomWidth="1px" borderColor="border">
      <Flex justify="space-between" gap={5} align={{ base: 'stretch', md: 'flex-end' }} direction={{ base: 'column', md: 'row' }}>
        <HStack gap={3} align="flex-start">
          <Flex
            boxSize="40px"
            flexShrink={0}
            align="center"
            justify="center"
            borderRadius="md"
            bg="primary.50"
            color="primary.700"
          >
            <LuMapPin size={20} aria-hidden="true" />
          </Flex>
          <Box>
            <Text fontFamily="heading" fontWeight="650" color="text.primary">Barangay coverage</Text>
            <Text mt={1} fontSize="sm" color="text.muted">
              Compare registered youth across every barangay by filing year.
            </Text>
          </Box>
        </HStack>
        <Field.Root width={{ base: 'full', md: '168px' }} flexShrink={0}>
          <Field.Label htmlFor="coverage-filing-year" fontFamily="heading" fontSize="xs" fontWeight="500" color="text.secondary">
            <LuCalendarDays aria-hidden="true" /> Filing year
          </Field.Label>
          <NativeSelect.Root width="full">
            <NativeSelect.Field
              id="coverage-filing-year"
              aria-label="Filter barangay coverage by filing year"
              minH="44px"
              value={selectedYear}
              onChange={(event) => onYearChange(event.target.value)}
            >
              <option value="">All years</option>
              {filingYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
      </Flex>
      {loading && <Text mt={3} fontSize="sm" color="text.muted" role="status">Updating coverage…</Text>}
      {error && (
        <Box mt={3} px={3} py={2.5} bg="danger.light" borderWidth="1px" borderColor="red.200" borderRadius="md">
          <Text fontSize="sm" color="danger" role="alert">{error}</Text>
        </Box>
      )}
    </Card.Header>
    <Card.Body p={0} aria-busy={loading}>
      <Box p={{ base: 4, md: 5 }} bg="surface.muted" borderBottomWidth="1px" borderColor="border">
        <Flex justify="space-between" align="flex-start" gap={4}>
          <Box>
            <Text fontSize="xs" color="text.muted">Covered barangays</Text>
            <HStack mt={1} gap={2} align="baseline">
              <Text fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} lineHeight="1" fontWeight="700" fontVariantNumeric="tabular-nums">
                {formatNumber(data.coverage.barangaysWithRecords)}
              </Text>
              <Text color="text.secondary" fontSize="sm">of {formatNumber(data.coverage.totalBarangays)}</Text>
            </HStack>
          </Box>
          <VStack align="flex-end" gap={1}>
            <Text fontFamily="heading" fontSize="xl" fontWeight="700" color={data.coverage.percentage === 100 ? 'success' : 'warning'} fontVariantNumeric="tabular-nums">
              {data.coverage.percentage.toFixed(1)}%
            </Text>
            <Badge colorPalette="gray" variant="subtle">{appliedYear || 'All years'}</Badge>
          </VStack>
        </Flex>
        <Box mt={4} height="8px" bg="border" borderRadius="full" overflow="hidden">
          <Box
            height="full"
            width={`${data.coverage.percentage}%`}
            bg={data.coverage.percentage === 100 ? 'primary.600' : 'orange.500'}
            borderRadius="full"
            transition="width 250ms ease"
          />
        </Box>
        <Text mt={2} fontSize="xs" color="text.muted">
          {data.coverage.totalBarangays - data.coverage.barangaysWithRecords === 0
            ? 'Every barangay has youth records for this view.'
            : `${formatNumber(data.coverage.totalBarangays - data.coverage.barangaysWithRecords)} barangays have no youth records for this view.`}
        </Text>
      </Box>

      <Grid
        display={{ base: 'none', md: 'grid' }}
        templateColumns="minmax(0, 1fr) 110px 84px"
        gap={3}
        px={5}
        py={3}
        borderBottomWidth="1px"
        borderColor="border"
        bg="surface"
      >
        <Text fontFamily="heading" fontSize="xs" fontWeight="600" color="text.muted">Barangay</Text>
        <Text fontFamily="heading" fontSize="xs" fontWeight="600" color="text.muted" textAlign="right">Pending</Text>
        <Text fontFamily="heading" fontSize="xs" fontWeight="600" color="text.muted" textAlign="right">Records</Text>
      </Grid>

      {data.barangayCoverage.length === 0 ? (
        <Box p={8} textAlign="center">
          <Text fontFamily="heading" fontWeight="600">No barangays available</Text>
          <Text mt={1} fontSize="sm" color="text.muted">Try another filing year.</Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={0} maxH="420px" overflowY="auto">
          {data.barangayCoverage.map((barangay) => (
            <Grid
              key={barangay.barangayId}
              templateColumns={{ base: 'minmax(0, 1fr) auto', md: 'minmax(0, 1fr) 110px 84px' }}
              gap={3}
              alignItems="center"
              px={{ base: 4, md: 5 }}
              py={3.5}
              borderBottomWidth="1px"
              borderColor="border"
              _hover={{ bg: 'primary.50' }}
              transition="background-color 0.15s ease"
            >
              <Box minW={0}>
                <HStack gap={2}>
                  <Box boxSize="7px" borderRadius="full" bg={barangay.isActive ? 'green.500' : 'gray.400'} flexShrink={0} />
                  <Text fontSize="sm" fontWeight="600" truncate>{barangay.barangayName}</Text>
                </HStack>
                <Text pl="15px" mt={1} fontSize="xs" color="text.muted">
                  {barangay.isActive ? 'Active' : 'Inactive'}
                  <Text as="span" display={{ base: 'inline', md: 'none' }}> · {formatNumber(barangay.pendingReview)} pending review</Text>
                </Text>
              </Box>
              <Text display={{ base: 'none', md: 'block' }} textAlign="right" fontSize="sm" color={barangay.pendingReview > 0 ? 'warning' : 'text.muted'} fontVariantNumeric="tabular-nums">
                {formatNumber(barangay.pendingReview)}
              </Text>
              <Text fontFamily="heading" textAlign="right" fontSize="sm" fontWeight="700" fontVariantNumeric="tabular-nums">
                {formatNumber(barangay.totalRecords)}
              </Text>
            </Grid>
          ))}
        </VStack>
      )}
    </Card.Body>
    <Card.Footer px={{ base: 4, md: 5 }} py={3.5} borderTopWidth="1px" borderColor="border" justifyContent="space-between" gap={3} flexWrap="wrap">
      <Text fontSize="xs" color="text.muted">Showing {data.barangayCoverage.length} barangays</Text>
      <Button variant="ghost" size="sm" onClick={onOpenReports} color="primary.700">
        Open full reports <LuArrowRight />
      </Button>
    </Card.Footer>
  </Card.Root>
);

const RecentRecordsPanel = ({ data, onOpenRecord }: { data: DashboardAnalytics; onOpenRecord: (id: string) => void }) => (
  <Card.Root borderColor="border" borderRadius="md" height="full">
    <Card.Header pb={2}>
      <SectionHeading title="Recent record activity" description="Most recently updated youth profiles." />
    </Card.Header>
    <Card.Body pt={3}>
      {data.recentRecords.length === 0 ? (
        <Text color="text.muted" fontSize="sm">No record activity yet.</Text>
      ) : (
        <VStack align="stretch" gap={0}>
          {data.recentRecords.map((record) => (
            <Flex
              as="button"
              key={record.id}
              width="full"
              textAlign="left"
              align="center"
              gap={3}
              py={2.5}
              borderTop="1px solid"
              borderColor="border"
              onClick={() => onOpenRecord(record.id)}
              _hover={{ bg: 'surface.muted' }}
              _focusVisible={{ outline: '2px solid', outlineColor: 'primary.600', outlineOffset: '2px' }}
            >
              <Box minW={0} flex={1}>
                <Text fontSize="sm" fontWeight="600" truncate>{record.displayName}</Text>
                <Text fontSize="xs" color="text.muted" truncate>{record.barangayName} · {formatDateTime(record.updatedAt)}</Text>
              </Box>
              <Badge colorPalette={statusPalettes[record.status]} variant="subtle" flexShrink={0}>
                {record.status === 'SUBMITTED' ? 'PENDING' : record.status}
              </Badge>
            </Flex>
          ))}
        </VStack>
      )}
    </Card.Body>
  </Card.Root>
);

const DashboardSkeleton = () => (
  <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap={4}>
    {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height="148px" borderRadius="md" />)}
  </SimpleGrid>
);

export const DashboardPage = () => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'ADMIN';
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverageAnalytics, setCoverageAnalytics] = useState<DashboardAnalytics | null>(null);
  const [coverageYears, setCoverageYears] = useState<number[]>([]);
  const [coverageYear, setCoverageYear] = useState('');
  const [appliedCoverageYear, setAppliedCoverageYear] = useState('');
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);
  const coverageRequestId = useRef(0);

  const loadAnalytics = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await reportApi.getDashboard();
      setAnalytics(response.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Dashboard analytics could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!isAdmin) return;
    categoryApi.list()
      .then((response) => {
        const years = [...new Set(response.data
          .filter((category) => category.record_type === 'YOUTH_PROFILE')
          .map((category) => category.filing_year)
          .filter((year): year is number => Number.isInteger(year)))]
          .sort((left, right) => right - left);
        setCoverageYears(years);
        if (years.length > 0) {
          const currentYear = new Date().getFullYear();
          setCoverageYear(String(years.includes(currentYear) ? currentYear : years[0]));
        }
      })
      .catch(() => {
        setCoverageYears([]);
      });
  }, [isAdmin]);

  const loadCoverage = useCallback(async (filingYear: string) => {
    const requestId = ++coverageRequestId.current;
    if (!filingYear) {
      setCoverageAnalytics(null);
      setAppliedCoverageYear('');
      setCoverageError(null);
      setCoverageLoading(false);
      return;
    }
    setCoverageLoading(true);
    setCoverageError(null);
    try {
      const response = await reportApi.getDashboard({ filingYear: Number(filingYear) });
      if (requestId === coverageRequestId.current) {
        setCoverageAnalytics(response.data);
        setAppliedCoverageYear(filingYear);
      }
    } catch (requestError) {
      if (requestId === coverageRequestId.current) {
        setCoverageError(requestError instanceof Error ? requestError.message : 'Coverage could not be updated.');
      }
    } finally {
      if (requestId === coverageRequestId.current) setCoverageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadCoverage(coverageYear);
  }, [coverageYear, isAdmin, loadCoverage]);

  const summary = analytics?.summary;
  const coverageData = coverageAnalytics ?? analytics;

  const refreshDashboard = async () => {
    await Promise.all([
      loadAnalytics(true),
      isAdmin && coverageYear ? loadCoverage(coverageYear) : Promise.resolve(),
    ]);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={isAdmin ? 'Admin Dashboard' : 'Dashboard'}
        description={isAdmin
          ? 'Live youth registry, review workload, coverage, and data quality across Boac.'
          : 'Live record activity and review status for your assigned barangay.'}
        actions={(
          <Button variant="outline" onClick={() => void refreshDashboard()} disabled={refreshing || coverageLoading}>
            <LuRefreshCw />
            {refreshing ? 'Refreshing' : 'Refresh data'}
          </Button>
        )}
      />

      {error && (
        <Flex role="alert" mb={5} p={4} border="1px solid" borderColor="danger" bg="danger.light" borderRadius="md" gap={3} align="flex-start">
          <Icon as={LuTriangleAlert} color="danger" boxSize="20px" mt="1px" flexShrink={0} />
          <Box flex={1}>
            <Text fontWeight="700" color="danger">Analytics unavailable</Text>
            <Text mt={1} fontSize="sm" color="text.secondary">{error}</Text>
          </Box>
          <Button size="sm" variant="outline" colorPalette="red" onClick={() => void loadAnalytics()}>Retry</Button>
        </Flex>
      )}

      {loading && !analytics ? (
        <DashboardSkeleton />
      ) : analytics ? (
        <>
          <SimpleGrid columns={{ base: 1, sm: 2, xl: isAdmin ? 5 : 4 }} gap={4}>
            <MetricCard label="Youth records" value={summary?.totalRecords ?? 0} helper={`${summary?.thisMonth ?? 0} added this month`} icon={LuUsersRound} loading={loading} />
            <MetricCard label="Pending review" value={summary?.submitted ?? 0} helper="Submitted and awaiting action" icon={LuClock3} loading={loading} tone="warning" />
            <MetricCard label="Approved" value={summary?.approved ?? 0} helper="Completed review workflow" icon={LuCircleCheckBig} loading={loading} tone="success" />
            <MetricCard label="Active drafts" value={summary?.draft ?? 0} helper={`${summary?.returned ?? 0} returned for revision`} icon={LuFileCheck2} loading={loading} />
            {isAdmin && coverageData && (
              <MetricCard
                label="Barangay coverage"
                value={coverageData.coverage.barangaysWithRecords}
                helper={`of ${coverageData.coverage.totalBarangays} barangays${appliedCoverageYear ? ` · ${appliedCoverageYear}` : ' · all years'}`}
                icon={LuMapPin}
                loading={loading || coverageLoading}
              />
            )}
          </SimpleGrid>

          <Grid templateColumns={{ base: '1fr', xl: 'minmax(0, 1.45fr) minmax(320px, 0.75fr)' }} gap={5} mt={5} alignItems="stretch">
            <StatusPanel data={analytics} />
            <DataQualityPanel data={analytics} onOpenRecords={() => navigate('/youth-records')} />
          </Grid>

          <Box mt={5}>
            <TrendPanel data={analytics} />
          </Box>

          <Grid templateColumns={{ base: '1fr', lg: isAdmin ? 'minmax(0, 1.15fr) minmax(320px, 0.85fr)' : '1fr' }} gap={5} mt={5} alignItems="start">
            {isAdmin && coverageData && (
              <BarangayPanel
                data={coverageData}
                filingYears={coverageYears}
                selectedYear={coverageYear}
                appliedYear={appliedCoverageYear}
                loading={coverageLoading}
                error={coverageError}
                onYearChange={setCoverageYear}
                onOpenReports={() => navigate('/reports')}
              />
            )}
            <VStack align="stretch" gap={5}>
              <RecentRecordsPanel data={analytics} onOpenRecord={(id) => navigate(`/youth-records/${id}`)} />
              <AnnouncementFeed />
            </VStack>
          </Grid>

          <Text mt={4} textAlign="right" color="text.muted" fontSize="xs">
            Updated {formatDateTime(analytics.generatedAt)}
          </Text>
        </>
      ) : null}
    </DashboardLayout>
  );
};

export default DashboardPage;
