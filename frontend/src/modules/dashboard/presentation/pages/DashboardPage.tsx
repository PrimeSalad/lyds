import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Box, Button, Card, Flex, Grid, GridItem, HStack, SimpleGrid, Skeleton, Text, VStack } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router';
import {
  LuArrowRight,
  LuRefreshCw,
  LuTriangleAlert,
} from 'react-icons/lu';
import { type RootState } from '../../../../redux/store';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { AnnouncementFeed } from '../../../announcements/presentation/components/AnnouncementFeed';
import { SkipLink } from '../../../../ui/components/skip-link';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { reportApi, type DashboardAnalytics, type DemographicBreakdown } from '../../../reports/infrastructure/report-api';
import { categoryApi } from '../../../categories/infrastructure/category-api';
import { childLaborerApi, type ChildLaborerSummary } from '../../../child-laborers/infrastructure/child-laborer-api';
import { ChildLaborerAnalytics } from '../../../child-laborers/presentation/components/ChildLaborerAnalytics';
import { DashboardViewSwitcher, type DashboardView } from '../components/DashboardViewSwitcher';
import {
  RegistryBriefList,
  RegistryMetricCard,
  RegistrySectionHeading,
  RegistrySummary,
} from '../../../../shared/components/RegistryDashboardPrimitives';

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
const currentYear = new Date().getFullYear();
const fallbackFilingYears = Array.from({ length: currentYear - 1999 }, (_, index) => currentYear + 1 - index);
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

const YouthRegistrySummary = ({ data, year, scopeLabel }: {
  data: DashboardAnalytics;
  year: number;
  scopeLabel: string;
}) => {
  const total = data.summary.totalRecords;
  const approvalRate = total === 0 ? 0 : (data.summary.approved / total) * 100;
  const summaryText = total === 0
    ? `No youth registry records are filed for ${year} in this scope.`
    : `${formatNumber(total)} youth profile${total === 1 ? '' : 's'} across ${formatNumber(data.coverage.barangaysWithRecords)} barangay${data.coverage.barangaysWithRecords === 1 ? '' : 's'}. ${formatNumber(data.summary.approved)} approved (${approvalRate.toFixed(1)}%) and ${formatNumber(data.summary.submitted)} awaiting review.`;

  return <RegistrySummary year={year} scopeLabel={scopeLabel} summary={summaryText} />;
};

const DemographicPanel = ({ title, description, items }: {
  title: string;
  description: string;
  items: DemographicBreakdown[];
}) => {
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return (
    <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" height="full">
      <Card.Header p={{ base: 4, md: 5 }} pb={2}>
        <RegistrySectionHeading title={title} description={description} />
      </Card.Header>
      <Card.Body px={{ base: 4, md: 5 }} pt={2} pb={{ base: 4, md: 5 }}>
        {items.length === 0 ? (
          <Text py={8} textAlign="center" color="text.muted" fontSize="sm">No categorized records for this filing year.</Text>
        ) : (
          <VStack align="stretch" gap={3}>
            {items.slice(0, 8).map((item) => (
              <Box key={item.label}>
                <Flex justify="space-between" gap={4} mb={1.5}>
                  <Text fontSize="sm" color="text.secondary">{item.label}</Text>
                  <Text fontSize="sm" fontWeight="700" fontVariantNumeric="tabular-nums">
                    {formatNumber(item.count)} <Text as="span" color="text.muted" fontWeight="400">({item.percentage.toFixed(1)}%)</Text>
                  </Text>
                </Flex>
                <Box height="8px" bg="surface.muted" borderRadius="full" overflow="hidden">
                  <Box height="full" width={`${(item.count / maximum) * 100}%`} bg="primary.600" borderRadius="full" />
                </Box>
              </Box>
            ))}
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  );
};

const YouthDecisionBrief = ({ data }: { data: DashboardAnalytics }) => {
  const uncoveredBarangays = Math.max(0, data.coverage.totalBarangays - data.coverage.barangaysWithRecords);
  const items = [
    {
      title: `${formatNumber(data.summary.submitted)} profile${data.summary.submitted === 1 ? '' : 's'} awaiting review`,
      text: 'Prioritize submitted profiles so current-year participation data can move into the approved registry.',
    },
    {
      title: `${data.dataQuality.completionRate.toFixed(1)}% core profile completion`,
      text: `${formatNumber(data.dataQuality.incompleteCore)} profiles still need required demographic or classification details.`,
    },
    {
      title: uncoveredBarangays === 0 ? 'Every barangay is represented' : `${formatNumber(uncoveredBarangays)} barangay${uncoveredBarangays === 1 ? '' : 's'} without records`,
      text: uncoveredBarangays === 0
        ? 'Maintain complete annual submissions while review and cleanup continue.'
        : 'Coordinate annual registration with barangays that do not yet have a profile in this filing year.',
    },
  ];

  return (
    <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" height="full">
      <Card.Header p={{ base: 4, md: 5 }} pb={2}>
        <RegistrySectionHeading title="Decision brief" description="A concise reading of the current youth registry." />
      </Card.Header>
      <Card.Body px={{ base: 4, md: 5 }} pt={2} pb={{ base: 4, md: 5 }}>
        <RegistryBriefList items={items} />
      </Card.Body>
    </Card.Root>
  );
};

const StatusPanel = ({ data }: { data: DashboardAnalytics }) => {
  const hasStatusData = data.statusDistribution.some((item) => item.count > 0);

  return (
    <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" height="full">
      <Card.Header p={{ base: 4, md: 5 }} pb={2}>
        <RegistrySectionHeading title="Record pipeline" description="Current distribution across the review workflow." />
      </Card.Header>
      <Card.Body px={{ base: 4, md: 5 }} pt={3} pb={{ base: 4, md: 5 }}>
        {!hasStatusData ? (
          <Flex minH="180px" align="center" justify="center" textAlign="center">
            <Text maxW="42ch" color="text.muted" fontSize="sm">
              No workflow activity is available for this filing year.
            </Text>
          </Flex>
        ) : (
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
        )}
      </Card.Body>
    </Card.Root>
  );
};

const TrendPanel = ({ data }: { data: DashboardAnalytics }) => {
  const hasActivity = data.monthlyTrend.some((month) => month.created + month.submitted + month.approved > 0);
  const maximum = Math.max(1, ...data.monthlyTrend.flatMap((month) => [month.created, month.submitted, month.approved]));
  const barHeight = (value: number) => `${Math.max(value === 0 ? 0 : 8, (value / maximum) * 136)}px`;

  return (
    <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" height="full">
      <Card.Header p={{ base: 4, md: 5 }} pb={2}>
        <Flex justify="space-between" gap={4} align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
          <RegistrySectionHeading title="Six-month activity" description="Created, submitted, and approved records by month." />
          {hasActivity && (
            <HStack gap={3} wrap="wrap" fontSize="xs" color="text.secondary">
              <HStack gap={1.5}><Box w="8px" h="8px" bg="#2563EB" borderRadius="xs" />Created</HStack>
              <HStack gap={1.5}><Box w="8px" h="8px" bg="#D97706" borderRadius="xs" />Submitted</HStack>
              <HStack gap={1.5}><Box w="8px" h="8px" bg="#15803D" borderRadius="xs" />Approved</HStack>
            </HStack>
          )}
        </Flex>
      </Card.Header>
      <Card.Body px={{ base: 4, md: 5 }} pt={2} pb={{ base: 4, md: 5 }} overflowX="auto">
        {!hasActivity ? (
          <Flex minH="112px" align="center" justify="center" textAlign="center">
            <Text color="text.muted" fontSize="sm">No workflow activity was recorded in the last six months.</Text>
          </Flex>
        ) : (
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
        )}
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
    <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" height="full">
      <Card.Header p={{ base: 4, md: 5 }} pb={2}>
        <RegistrySectionHeading title="Data quality" description="Items that need cleanup before reporting." />
      </Card.Header>
      <Card.Body px={{ base: 4, md: 5 }} pt={3} pb={{ base: 4, md: 5 }}>
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
  filingYear: number;
  onOpenReports: () => void;
};

const BarangayPanel = ({
  data,
  filingYear,
  onOpenReports,
}: BarangayPanelProps) => (
  <Card.Root borderColor="border" borderRadius="lg" height="full" overflow="hidden" boxShadow="panel">
    <Card.Header p={{ base: 4, md: 5 }} borderBottomWidth="1px" borderColor="border">
      <RegistrySectionHeading
        title="Barangay coverage"
        description="Compare registered youth across every barangay by filing year."
      />
    </Card.Header>
    <Card.Body p={0}>
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
            <Badge colorPalette="gray" variant="subtle">{filingYear}</Badge>
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
          <Text fontFamily="heading" fontWeight="600">
            {data.coverage.barangaysWithRecords > 0 ? 'Barangay totals are being consolidated' : 'No barangay records for this year'}
          </Text>
          <Text mt={1} fontSize="sm" color="text.muted">
            {data.coverage.barangaysWithRecords > 0
              ? 'The coverage total is available; detailed barangay rows were not included in the current report response.'
              : 'Choose another filing year or add the first youth record.'}
          </Text>
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
  <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" height="full">
    <Card.Header p={{ base: 4, md: 5 }} pb={2}>
      <RegistrySectionHeading title="Recent record activity" description="Most recently updated youth profiles." />
    </Card.Header>
    <Card.Body px={{ base: 4, md: 5 }} pt={3} pb={{ base: 4, md: 5 }}>
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
  <VStack align="stretch" gap={5} aria-label="Loading youth registry analytics">
    <Skeleton height="108px" borderRadius="lg" />
    <SimpleGrid columns={{ base: 1, sm: 2, xl: 5 }} gap={4}>
      {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} height="148px" borderRadius="lg" />)}
    </SimpleGrid>
    <Grid templateColumns={{ base: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }} gap={5}>
      {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height="320px" borderRadius="lg" />)}
    </Grid>
  </VStack>
);

export const DashboardPage = () => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = profile?.role === 'ADMIN';
  const dashboardView: DashboardView = searchParams.get('view') === 'child-laborers'
    ? 'CHILD_LABORERS'
    : 'YOUTH';
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youthYears, setYouthYears] = useState<number[]>([currentYear]);
  const [youthYear, setYouthYear] = useState(currentYear);
  const childLaborerRequestId = useRef(0);
  const [childLaborerYear, setChildLaborerYear] = useState(currentYear);
  const [childLaborerYears, setChildLaborerYears] = useState<number[]>(fallbackFilingYears);
  const [childLaborerSummary, setChildLaborerSummary] = useState<ChildLaborerSummary | null>(null);
  const [childLaborerLoading, setChildLaborerLoading] = useState(false);
  const [childLaborerRefreshing, setChildLaborerRefreshing] = useState(false);
  const [childLaborerError, setChildLaborerError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await reportApi.getDashboard({ filingYear: youthYear });
      setAnalytics(response.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Dashboard analytics could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [youthYear]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    categoryApi.list()
      .then((response) => {
        const youthCategories = response.data.filter((category) => category.record_type === 'YOUTH_PROFILE');
        const childCategories = response.data.filter((category) => category.record_type === 'CHILD_LABORER');
        const years = [...new Set(youthCategories
          .map((category) => category.filing_year)
          .filter((year): year is number => Number.isInteger(year)))]
          .sort((left, right) => right - left);
        const childYears = [...new Set(childCategories
          .map((category) => category.filing_year)
          .filter((year): year is number => Number.isInteger(year)))]
          .sort((left, right) => right - left);
        if (years.length > 0) {
          setYouthYears(years);
          const preferredYouth = [...youthCategories].sort((left, right) => (
            Number((right.record_count ?? 0) > 0) - Number((left.record_count ?? 0) > 0)
            || right.filing_year - left.filing_year
          ))[0];
          setYouthYear(preferredYouth?.filing_year ?? years[0]);
        }
        if (childYears.length > 0) {
          setChildLaborerYears(childYears);
          const preferredChild = [...childCategories].sort((left, right) => (
            Number((right.record_count ?? 0) > 0) - Number((left.record_count ?? 0) > 0)
            || right.filing_year - left.filing_year
          ))[0];
          setChildLaborerYear(preferredChild?.filing_year ?? childYears[0]);
        }
      })
      .catch(() => {
        setYouthYears([currentYear]);
        setChildLaborerYears(fallbackFilingYears);
      });
  }, []);

  const loadChildLaborerAnalytics = useCallback(async (refresh = false) => {
    const requestId = ++childLaborerRequestId.current;
    if (refresh) setChildLaborerRefreshing(true);
    else {
      setChildLaborerLoading(true);
      setChildLaborerSummary(null);
    }
    setChildLaborerError(null);
    try {
      const response = await childLaborerApi.summary({ filingYear: childLaborerYear });
      if (requestId === childLaborerRequestId.current) setChildLaborerSummary(response.data);
    } catch (requestError) {
      if (requestId === childLaborerRequestId.current) {
        setChildLaborerError(requestError instanceof Error
          ? requestError.message
          : 'Child laborer analytics could not be loaded.');
      }
    } finally {
      if (requestId === childLaborerRequestId.current) {
        setChildLaborerLoading(false);
        setChildLaborerRefreshing(false);
      }
    }
  }, [childLaborerYear]);

  useEffect(() => {
    if (dashboardView !== 'CHILD_LABORERS') return;
    void loadChildLaborerAnalytics();
  }, [dashboardView, loadChildLaborerAnalytics]);

  const summary = analytics?.summary;
  const coverageData = analytics;
  const youthTotal = summary?.totalRecords ?? 0;
  const youthPercentage = (count: number) => `${(youthTotal === 0 ? 0 : (count / youthTotal) * 100).toFixed(1)}%`;

  const refreshDashboard = async () => {
    if (dashboardView === 'CHILD_LABORERS') {
      await loadChildLaborerAnalytics(true);
      return;
    }
    await loadAnalytics(true);
  };

  const changeDashboardView = (view: DashboardView) => {
    const nextParams = new URLSearchParams(searchParams);
    if (view === 'CHILD_LABORERS') nextParams.set('view', 'child-laborers');
    else nextParams.delete('view');
    setSearchParams(nextParams, { replace: true });
  };

  const refreshingCurrentView = dashboardView === 'CHILD_LABORERS'
    ? childLaborerRefreshing || childLaborerLoading
    : refreshing;

  const activeFilingYear = dashboardView === 'CHILD_LABORERS' ? childLaborerYear : youthYear;
  const activeFilingYears = dashboardView === 'CHILD_LABORERS' ? childLaborerYears : youthYears;

  return (
    <DashboardLayout>
      <PageHeader
        title={dashboardView === 'CHILD_LABORERS'
          ? 'Child Laborer Dashboard'
          : 'Youth Registry Dashboard'}
        description={dashboardView === 'CHILD_LABORERS'
          ? 'Current child labor records, validation progress, demographics, education status, and reported work.'
          : isAdmin
            ? 'Live youth registry, review workload, coverage, and data quality across Boac.'
            : 'Live record activity and review status for your assigned barangay.'}
        actions={(
          <Button variant="outline" onClick={() => void refreshDashboard()} disabled={refreshingCurrentView}>
            <LuRefreshCw />
            {refreshingCurrentView ? 'Refreshing' : 'Refresh data'}
          </Button>
        )}
      />

      <DashboardViewSwitcher
        view={dashboardView}
        filingYear={activeFilingYear}
        filingYears={activeFilingYears}
        onViewChange={changeDashboardView}
        onFilingYearChange={dashboardView === 'CHILD_LABORERS' ? setChildLaborerYear : setYouthYear}
        onOpenRecords={() => navigate(dashboardView === 'CHILD_LABORERS' ? '/child-laborers' : '/youth-records')}
      />

      {dashboardView === 'CHILD_LABORERS' ? (
        <ChildLaborerAnalytics
          summary={childLaborerSummary}
          year={childLaborerYear}
          scopeLabel={isAdmin ? 'All barangays' : 'Assigned barangay'}
          loading={childLaborerLoading}
          error={childLaborerError}
          onRetry={() => void loadChildLaborerAnalytics()}
        />
      ) : (
        <>
          {error && (
            <Flex role="alert" mb={5} p={4} border="1px solid" borderColor="danger" bg="danger.light" borderRadius="md" gap={3} align="flex-start">
              <LuTriangleAlert size={20} color="var(--chakra-colors-danger)" style={{ marginTop: '4px', flexShrink: 0 }} aria-hidden="true" />
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
            <VStack align="stretch" gap={5}>
              <YouthRegistrySummary
                data={analytics}
                year={youthYear}
                scopeLabel={isAdmin ? 'All barangays' : 'Assigned barangay'}
              />

              <SimpleGrid data-dashboard-metrics="true" columns={{ base: 1, sm: 2, xl: 5 }} gap={4}>
                <RegistryMetricCard label="Records represented" value={youthTotal} helper={`${summary?.thisMonth ?? 0} added this month`} loading={loading} />
                <RegistryMetricCard label="Approved records" value={youthPercentage(summary?.approved ?? 0)} helper={`${formatNumber(summary?.approved ?? 0)} completed reviews`} loading={loading} />
                <RegistryMetricCard label="Pending review" value={youthPercentage(summary?.submitted ?? 0)} helper={`${formatNumber(summary?.submitted ?? 0)} awaiting action`} loading={loading} />
                <RegistryMetricCard label="Profile completion" value={`${analytics.dataQuality.completionRate.toFixed(1)}%`} helper={`${formatNumber(analytics.dataQuality.incompleteCore)} incomplete profiles`} loading={loading} />
                <RegistryMetricCard label="Barangays represented" value={analytics.coverage.barangaysWithRecords} helper={isAdmin ? `of ${analytics.coverage.totalBarangays} barangays` : 'Assigned barangay scope'} loading={loading} />
              </SimpleGrid>

              <Grid templateColumns={{ base: '1fr', xl: 'repeat(12, minmax(0, 1fr))' }} gap={5} alignItems="stretch">
                <GridItem colSpan={{ base: 1, xl: 7 }}>
                  <StatusPanel data={analytics} />
                </GridItem>
                <GridItem colSpan={{ base: 1, xl: 5 }}>
                  <DataQualityPanel data={analytics} onOpenRecords={() => navigate('/youth-records')} />
                </GridItem>
              </Grid>

              <TrendPanel data={analytics} />

              <Grid templateColumns={{ base: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }} gap={5} alignItems="stretch">
                <DemographicPanel
                  title="Youth age profile"
                  description="Age-group composition for the selected filing year."
                  items={analytics.demographics.ageGroups}
                />
                <DemographicPanel
                  title="Youth classification"
                  description="Registry composition by reported youth classification."
                  items={analytics.demographics.youthClassifications}
                />
              </Grid>

              <Grid templateColumns={{ base: '1fr', xl: 'repeat(12, minmax(0, 1fr))' }} gap={5} alignItems="start">
                {isAdmin && coverageData && (
                  <GridItem colSpan={{ base: 1, xl: 7 }}>
                    <BarangayPanel
                      data={coverageData}
                      filingYear={youthYear}
                      onOpenReports={() => navigate('/reports')}
                    />
                  </GridItem>
                )}
                <GridItem colSpan={{ base: 1, xl: isAdmin ? 5 : 12 }}>
                  <VStack align="stretch" gap={5}>
                    <YouthDecisionBrief data={analytics} />
                    <RecentRecordsPanel data={analytics} onOpenRecord={(id) => navigate(`/youth-records/${id}`)} />
                  </VStack>
                </GridItem>
              </Grid>

              <AnnouncementFeed />

              <Text textAlign="right" color="text.muted" fontSize="xs">
                Updated {formatDateTime(analytics.generatedAt)}
              </Text>
            </VStack>
          ) : null}
        </>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
