import { useState, useEffect } from 'react';
import { Box, Heading, Text, SimpleGrid, Card, Spinner } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { apiClient } from '../../../../infrastructure/api-client';
import { AnnouncementFeed } from '../../../announcements/presentation/components/AnnouncementFeed';
import { SkipLink } from '../../../../ui/components/skip-link';

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

type SummaryData = {
  totalRecords: number;
  draft: number;
  submitted: number;
  approved: number;
  returned: number;
  archived: number;
  thisMonth: number;
  totalBarangays: number;
  totalAccounts: number;
};

const MetricCard = ({ label, value, loading }: { label: string; value: number | string; loading: boolean }) => (
  <Card.Root borderColor="border" borderRadius="md" boxShadow="panel">
    <Card.Body p={5}>
      <Text fontSize="sm" color="text.secondary" fontFamily="body" fontWeight="600">{label}</Text>
      <Text fontSize="2xl" mt={2} fontWeight="750" fontFamily="heading" color="text.primary" fontVariantNumeric="tabular-nums">
        {loading ? <Spinner size="sm" /> : typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
    </Card.Body>
  </Card.Root>
);

export const DashboardPage = () => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await apiClient.request<{ data: SummaryData }>('/reports/summary');
        setSummary(res.data);
      } catch {
        // Silently fail — dashboard still usable without stats
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  return (
    <DashboardLayout>
      <Heading as="h1" fontSize={{ base: '1.5rem', md: '1.75rem' }} mb={2} fontFamily="heading" fontWeight="700">
        {isAdmin ? 'Admin Dashboard' : 'Dashboard'}
      </Heading>
      <Text color="text.secondary" mb={7} fontFamily="body">
        {isAdmin
          ? 'Overview of all barangays and submissions'
          : 'Managing records for your assigned barangay'}
      </Text>

      {isAdmin ? (
        <SimpleGrid columns={{ base: 2, md: 3, xl: 5 }} gap={{ base: 3, md: 4 }}>
          <MetricCard label="Total Records" value={summary?.totalRecords ?? 0} loading={loading} />
          <MetricCard label="Pending Review" value={summary?.submitted ?? 0} loading={loading} />
          <MetricCard label="Drafts" value={summary?.draft ?? 0} loading={loading} />
          <MetricCard label="Approved" value={summary?.approved ?? 0} loading={loading} />
          <MetricCard label="This Month" value={summary?.thisMonth ?? 0} loading={loading} />
        </SimpleGrid>
      ) : (
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={{ base: 3, md: 4 }}>
          <MetricCard label="Total Records" value={summary?.totalRecords ?? 0} loading={loading} />
          <MetricCard label="Drafts" value={summary?.draft ?? 0} loading={loading} />
          <MetricCard label="Returned" value={summary?.returned ?? 0} loading={loading} />
          <MetricCard label="Approved" value={summary?.approved ?? 0} loading={loading} />
        </SimpleGrid>
      )}

      <Box mt={6}>
        <AnnouncementFeed />
      </Box>
    </DashboardLayout>
  );
};

export default DashboardPage;
