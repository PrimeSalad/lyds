import { useCallback, useEffect, useState } from 'react';
import { Badge, Box, Button, Card, Flex, Grid, HStack, Icon, SimpleGrid, Skeleton, Text, VStack } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import type { IconType } from 'react-icons';
import {
  LuArrowRight,
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

const BarangayPanel = ({ data, onOpenReports }: { data: DashboardAnalytics; onOpenReports: () => void }) => (
  <Card.Root borderColor="border" borderRadius="md" height="full">
    <Card.Header pb={2}>
      <Flex justify="space-between" gap={4} align="flex-start">
        <SectionHeading title="Barangay coverage" description={`${data.coverage.barangaysWithRecords} of ${data.coverage.totalBarangays} barangays have youth records.`} />
        <Badge colorPalette={data.coverage.percentage === 100 ? 'green' : 'orange'} variant="subtle" fontVariantNumeric="tabular-nums">
          {data.coverage.percentage.toFixed(1)}%
        </Badge>
      </Flex>
    </Card.Header>
    <Card.Body pt={3}>
      <VStack align="stretch" gap={0}>
        {data.barangayCoverage.slice(0, 8).map((barangay, index) => (
          <Flex key={barangay.barangayId} align="center" gap={3} py={2.5} borderTop="1px solid" borderColor="border">
            <Text width="24px" flexShrink={0} textAlign="center" fontSize="xs" color="text.muted" fontWeight="700">{index + 1}</Text>
            <Box minW={0} flex={1}>
              <Text fontSize="sm" fontWeight="600" truncate>{barangay.barangayName}</Text>
              <Text fontSize="xs" color="text.muted">{barangay.pendingReview} pending review</Text>
            </Box>
            <Text fontFamily="heading" fontSize="sm" fontWeight="700" fontVariantNumeric="tabular-nums">{formatNumber(barangay.totalRecords)}</Text>
          </Flex>
        ))}
      </VStack>
      <Button mt={3} variant="ghost" size="sm" onClick={onOpenReports} px={0} color="primary.700">
        Open full reports <LuArrowRight />
      </Button>
    </Card.Body>
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

  const summary = analytics?.summary;

  return (
    <DashboardLayout>
      <PageHeader
        title={isAdmin ? 'Admin Dashboard' : 'Dashboard'}
        description={isAdmin
          ? 'Live youth registry, review workload, coverage, and data quality across Boac.'
          : 'Live record activity and review status for your assigned barangay.'}
        actions={(
          <Button variant="outline" onClick={() => void loadAnalytics(true)} disabled={refreshing}>
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
            {isAdmin && <MetricCard label="Barangay coverage" value={analytics.coverage.barangaysWithRecords} helper={`of ${analytics.coverage.totalBarangays} active barangays`} icon={LuMapPin} loading={loading} />}
          </SimpleGrid>

          <Grid templateColumns={{ base: '1fr', xl: 'minmax(0, 1.45fr) minmax(320px, 0.75fr)' }} gap={5} mt={5} alignItems="stretch">
            <StatusPanel data={analytics} />
            <DataQualityPanel data={analytics} onOpenRecords={() => navigate('/youth-records')} />
          </Grid>

          <Box mt={5}>
            <TrendPanel data={analytics} />
          </Box>

          <Grid templateColumns={{ base: '1fr', lg: isAdmin ? 'minmax(0, 1.15fr) minmax(320px, 0.85fr)' : '1fr' }} gap={5} mt={5} alignItems="start">
            {isAdmin && <BarangayPanel data={analytics} onOpenReports={() => navigate('/reports')} />}
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
