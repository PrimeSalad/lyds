import { useState, useEffect } from 'react';
import { Box, Heading, Text, SimpleGrid, Card, Spinner } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { apiClient } from '../../../../infrastructure/api-client';
import { AnnouncementFeed } from '../../../announcements/presentation/components/AnnouncementFeed';

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [navigationOpen, setNavigationOpen] = useState(false);

  return (
    <Box display="flex" minH="100dvh" bg="page.bg">
      {navigationOpen && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.500"
          zIndex={20}
          display={{ base: 'block', lg: 'none' }}
          onClick={() => setNavigationOpen(false)}
        />
      )}
      <Sidebar isOpen={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <Box flex={1} ml={{ base: 0, lg: '256px' }} minW={0}>
        <TopBar onOpenNavigation={() => setNavigationOpen(true)} />
        <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }}>{children}</Box>
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
  <Card.Root borderColor="border" borderRadius="lg">
    <Card.Body p={5}>
      <Text fontSize="sm" color="text.muted" fontFamily="body">{label}</Text>
      <Text fontSize="2xl" fontWeight="700" fontFamily="heading" color="text.primary">
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
      <Heading size="lg" mb={2} fontFamily="heading" fontWeight="600">
        {isAdmin ? 'Admin Dashboard' : 'Dashboard'}
      </Heading>
      <Text color="text.secondary" mb={6} fontFamily="body">
        {isAdmin
          ? 'Overview of all barangays and submissions'
          : 'Managing records for your assigned barangay'}
      </Text>

      {isAdmin ? (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} gap={4}>
          <MetricCard label="Total Records" value={summary?.totalRecords ?? 0} loading={loading} />
          <MetricCard label="Pending Review" value={summary?.submitted ?? 0} loading={loading} />
          <MetricCard label="Drafts" value={summary?.draft ?? 0} loading={loading} />
          <MetricCard label="Approved" value={summary?.approved ?? 0} loading={loading} />
          <MetricCard label="This Month" value={summary?.thisMonth ?? 0} loading={loading} />
        </SimpleGrid>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
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
