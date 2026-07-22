import { useState, useEffect } from 'react';
import { Box, Button, Card, Heading, Text, SimpleGrid, HStack, Table, NativeSelect } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import { categoryApi, type Category } from '../../../categories/infrastructure/category-api';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { showToast } from '../../../../shared/toast';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import { reportApi, type DemographicBreakdown, type SummaryData } from '../../infrastructure/report-api';

type Demographics = {
  sex: DemographicBreakdown[];
  civilStatus: DemographicBreakdown[];
  youthClassification: DemographicBreakdown[];
  youthAgeGroup: DemographicBreakdown[];
  educationalAttainment: DemographicBreakdown[];
  workStatus: DemographicBreakdown[];
};

const ReportsPage = () => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [barangayId, setBarangayId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, demRes, barangayData, categoryRes] = await Promise.all([
          reportApi.getSummary({ barangayId, categoryId, status }),
          reportApi.getDemographics({ barangayId, categoryId, status }),
          isAdmin ? barangayApi.list() : Promise.resolve([]),
          categoryApi.list(),
        ]);
        setSummary(sumRes.data);
        setDemographics(demRes.data);
        setBarangays(barangayData);
        setCategories(categoryRes.data);
      } catch {
        showToast.error('Failed to load reports');
      }
    };
    fetchData();
  }, [barangayId, categoryId, status, isAdmin]);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const blob = await reportApi.exportRecords({ format, barangayId, categoryId, status });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const scope = isAdmin && barangayId ? barangays.find((barangay) => barangay.id === barangayId)?.code ?? 'barangay' : isAdmin ? 'all-barangays' : 'assigned-barangay';
      a.href = url;
      a.download = `youth-records-${scope}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast.error('Failed to export records');
    }
  };

  const DemographicTable = ({ title, data }: { title: string, data: DemographicBreakdown[] }) => (
    <Box mb={6}>
      <Heading size="sm" mb={4} borderBottom="2px solid" borderColor="green.500" pb={2} display="inline-block">{title}</Heading>
      <Box border="1px solid" borderColor="border" borderRadius="lg" overflow="hidden" bg="white">
        <Table.Root size="sm">
          <Table.Header bg="gray.50">
            <Table.Row>
              <Table.Cell fontWeight="bold">Category</Table.Cell>
              <Table.Cell fontWeight="bold" textAlign="right">Count</Table.Cell>
              <Table.Cell fontWeight="bold" textAlign="right">%</Table.Cell>
              <Table.Cell w="30%"></Table.Cell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data?.map((item, i) => (
              <Table.Row key={i}>
                <Table.Cell>{item.label}</Table.Cell>
                <Table.Cell textAlign="right">{item.count}</Table.Cell>
                <Table.Cell textAlign="right">{item.percentage.toFixed(1)}%</Table.Cell>
                <Table.Cell>
                  <Box w="100%" bg="gray.100" h="8px" borderRadius="full">
                    <Box w={`${item.percentage}%`} bg="green.500" h="100%" borderRadius="full" />
                  </Box>
                </Table.Cell>
              </Table.Row>
            ))}
            {(!data || data.length === 0) && (
              <Table.Row>
                <Table.Cell colSpan={4} textAlign="center" color="gray.500">No data available</Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Reports"
        description="Review consolidated record totals and export scoped datasets."
        actions={(
        <HStack gap={3} wrap="wrap">
          {isAdmin && (
            <NativeSelect.Root maxW={{ base: 'full', md: '190px' }}>
              <NativeSelect.Field value={barangayId} onChange={(e) => setBarangayId(e.target.value)}>
                <option value="">All Barangays</option>
                {barangays.map((barangay) => (
                  <option key={barangay.id} value={barangay.id}>{barangay.name}</option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          )}
          <NativeSelect.Root maxW={{ base: 'full', md: '220px' }}>
            <NativeSelect.Field value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <NativeSelect.Root maxW={{ base: 'full', md: '170px' }}>
            <NativeSelect.Field value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="RETURNED">Returned</option>
              <option value="APPROVED">Approved</option>
              <option value="ARCHIVED">Archived</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Button variant="outline" onClick={() => handleExport('csv')}>Export CSV</Button>
          <Button colorPalette="green" onClick={() => handleExport('xlsx')}>Export XLSX</Button>
        </HStack>
        )}
      />

      {!isAdmin && (
        <Card.Root borderColor="border" borderRadius="lg" mb={6}>
          <Card.Body>
            <Text color="text.secondary">
              Exports are automatically limited to your assigned barangay. The backend applies this scope even if the browser sends a different barangay value.
            </Text>
          </Card.Body>
        </Card.Root>
      )}

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4} mb={8}>
        <Card.Root borderColor="border" borderRadius="lg">
          <Card.Body>
            <Text fontSize="sm" color="gray.500">Total Records</Text>
            <Text fontSize="2xl" fontWeight="700">{summary?.totalRecords || 0}</Text>
          </Card.Body>
        </Card.Root>
        <Card.Root borderColor="border" borderRadius="lg">
          <Card.Body>
            <Text fontSize="sm" color="gray.500">Approved</Text>
            <Text fontSize="2xl" fontWeight="700">{summary?.approved || 0}</Text>
          </Card.Body>
        </Card.Root>
        <Card.Root borderColor="border" borderRadius="lg">
          <Card.Body>
            <Text fontSize="sm" color="gray.500">Pending Review</Text>
            <Text fontSize="2xl" fontWeight="700">{summary?.submitted || 0}</Text>
          </Card.Body>
        </Card.Root>
        <Card.Root borderColor="border" borderRadius="lg">
          <Card.Body>
            <Text fontSize="sm" color="gray.500">This Month</Text>
            <Text fontSize="2xl" fontWeight="700">{summary?.thisMonth || 0}</Text>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      {demographics && (
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
          <Box>
            <DemographicTable title="Sex" data={demographics.sex} />
            <DemographicTable title="Civil Status" data={demographics.civilStatus} />
            <DemographicTable title="Youth Classification" data={demographics.youthClassification} />
          </Box>
          <Box>
            <DemographicTable title="Age Group" data={demographics.youthAgeGroup} />
            <DemographicTable title="Educational Attainment" data={demographics.educationalAttainment} />
            <DemographicTable title="Work Status" data={demographics.workStatus} />
          </Box>
        </SimpleGrid>
      )}
    </DashboardLayout>
  );
};

export default ReportsPage;
