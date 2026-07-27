import { useState, useEffect, useMemo } from 'react';
import { Box, Button, Card, Dialog, Heading, HStack, IconButton, NativeSelect, Portal, SimpleGrid, Table, Text, VStack } from '@chakra-ui/react';
import { LuDownload, LuFileSpreadsheet, LuX } from 'react-icons/lu';
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
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportYear, setExportYear] = useState('');
  const [exporting, setExporting] = useState(false);

  const exportYears = useMemo(() => {
    const years = categories
      .map((category) => category.filing_year)
      .filter((year): year is number => year != null);
    const uniqueYears = [...new Set(years)].sort((a, b) => b - a);
    return uniqueYears.map((year) => ({
      year,
      recordCount: categories
        .filter((category) => category.filing_year === year)
        .reduce((total, category) => total + (category.record_count ?? 0), 0),
    }));
  }, [categories]);

  useEffect(() => {
    if (exportYears.length === 0) {
      setExportYear('');
      return;
    }
    if (!exportYears.some(({ year }) => String(year) === exportYear)) {
      setExportYear(String(exportYears[0].year));
    }
  }, [exportYear, exportYears]);

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
    setExporting(true);
    try {
      const selectedYear = format === 'xlsx' ? Number(exportYear) : undefined;
      const blob = await reportApi.exportRecords({
        format,
        barangayId,
        categoryId,
        status,
        filingYear: Number.isInteger(selectedYear) ? selectedYear : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const scope = isAdmin && barangayId ? barangays.find((barangay) => barangay.id === barangayId)?.code ?? 'barangay' : isAdmin ? 'all-barangays' : 'assigned-barangay';
      a.href = url;
      a.download = format === 'xlsx' && Number.isInteger(selectedYear)
        ? `KK Youth Profile ${selectedYear}.xlsx`
        : `youth-records-${scope}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      setExportDialogOpen(false);
    } catch {
      showToast.error('Failed to export records');
    } finally {
      setExporting(false);
    }
  };

  const DemographicTable = ({ title, data }: { title: string, data: DemographicBreakdown[] }) => (
    <Card.Root mb={6} borderColor="border" borderRadius="lg" boxShadow="panel" overflow="hidden">
      <Card.Header px={{ base: 4, md: 5 }} py={4} borderBottomWidth="1px" borderColor="border">
        <Box>
          <Heading size="sm">{title}</Heading>
          <Text fontSize="sm" color="text.muted" mt={1}>
            Distribution within the current report filters.
          </Text>
        </Box>
      </Card.Header>
      <Card.Body p={0}>
        <Table.Root size="sm" variant="outline" striped>
          <Table.Header bg="surface.muted">
            <Table.Row>
              <Table.Cell fontWeight="bold">Category</Table.Cell>
              <Table.Cell fontWeight="bold" textAlign="right">Count</Table.Cell>
              <Table.Cell fontWeight="bold" textAlign="right">%</Table.Cell>
              <Table.Cell w="30%" />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data?.map((item, i) => (
              <Table.Row key={i}>
                <Table.Cell>{item.label}</Table.Cell>
                <Table.Cell textAlign="right">{item.count}</Table.Cell>
                <Table.Cell textAlign="right">{item.percentage.toFixed(1)}%</Table.Cell>
                <Table.Cell>
                  <Box w="100%" bg="surface.muted" h="8px" borderRadius="full">
                    <Box w={`${item.percentage}%`} bg="green.500" h="100%" borderRadius="full" />
                  </Box>
                </Table.Cell>
              </Table.Row>
            ))}
            {(!data || data.length === 0) && (
              <Table.Row>
                <Table.Cell colSpan={4} textAlign="center" color="gray.500" py={8}>No data available</Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Card.Body>
    </Card.Root>
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
            <Button variant="outline" onClick={() => handleExport('csv')} disabled={exporting}>
              Export CSV
            </Button>
            <Button colorPalette="green" onClick={() => setExportDialogOpen(true)} disabled={exportYears.length === 0 || exporting}>
              <LuDownload aria-hidden="true" /> Export XLSX
            </Button>
          </HStack>
        )}
      />

      <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" mb={6}>
        <Card.Body p={{ base: 4, md: 5 }}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            {[
              {
                label: 'Current scope',
                value: isAdmin
                  ? 'All barangays'
                  : 'Assigned barangay only',
              },
              {
                label: 'Excel export',
                value: exportYears.length > 0
                  ? `KK Youth Profile ${exportYear || (exportYears[0]?.year ?? 'Year')}`
                  : 'No filing year available',
              },
              {
                label: 'Record scope',
                value: status || categoryId || barangayId
                  ? 'Filtered dataset'
                  : 'All available records',
              },
            ].map((item) => (
              <Box key={item.label} p={4} bg="surface.muted" borderRadius="md" borderWidth="1px" borderColor="border">
                <Text fontSize="sm" color="text.muted">{item.label}</Text>
                <Text fontWeight="700" mt={1}>{item.value}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Card.Body>
      </Card.Root>

      {!isAdmin && (
        <Card.Root borderColor="border" borderRadius="lg" mb={6}>
          <Card.Body p={{ base: 4, md: 5 }}>
            <Text color="text.secondary">
              Exports are automatically limited to your assigned barangay. The backend applies this scope even if the browser sends a different barangay value.
            </Text>
          </Card.Body>
        </Card.Root>
      )}

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4} mb={8}>
        <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={5}>
            <Text fontSize="sm" color="text.muted">Total Records</Text>
            <Text fontSize="2xl" fontWeight="700" mt={1}>{summary?.totalRecords || 0}</Text>
          </Card.Body>
        </Card.Root>
        <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={5}>
            <Text fontSize="sm" color="text.muted">Approved</Text>
            <Text fontSize="2xl" fontWeight="700" mt={1}>{summary?.approved || 0}</Text>
          </Card.Body>
        </Card.Root>
        <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={5}>
            <Text fontSize="sm" color="text.muted">Pending Review</Text>
            <Text fontSize="2xl" fontWeight="700" mt={1}>{summary?.submitted || 0}</Text>
          </Card.Body>
        </Card.Root>
        <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={5}>
            <Text fontSize="sm" color="text.muted">This Month</Text>
            <Text fontSize="2xl" fontWeight="700" mt={1}>{summary?.thisMonth || 0}</Text>
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

      <Dialog.Root open={exportDialogOpen} onOpenChange={({ open }) => { if (!exporting) setExportDialogOpen(open); }}>
        <Portal>
          <Dialog.Backdrop bg="rgba(0, 0, 0, 0.58)" backdropFilter="blur(2px)" zIndex={1400} />
          <Dialog.Positioner zIndex={1500} p={{ base: 4, sm: 6 }}>
            <Dialog.Content width="full" maxW="480px" maxH="calc(100dvh - 32px)" overflowY="auto" bg="white" color="text.primary" borderRadius="lg" borderWidth="1px" borderColor="border.strong" boxShadow="0 24px 64px rgba(0, 0, 0, 0.24)">
              <Dialog.Header>
                <HStack gap={3} pr={10} align="center">
                  <Box display="grid" placeItems="center" boxSize="44px" flexShrink={0} borderRadius="md" bg="primary.50" color="primary.700">
                    <LuFileSpreadsheet size={22} aria-hidden="true" />
                  </Box>
                  <Box>
                    <Dialog.Title fontFamily="heading" fontWeight="650">Export Reports XLSX</Dialog.Title>
                    <Text color="text.muted" fontSize="sm" mt={1}>Choose the filing year to use the official KK workbook layout.</Text>
                  </Box>
                </HStack>
              </Dialog.Header>
              <Dialog.Body>
                <VStack align="stretch" gap={4}>
                  <NativeSelect.Root width="full" disabled={exporting}>
                    <NativeSelect.Field
                      aria-label="Filing year"
                      value={exportYear}
                      onChange={(e) => setExportYear(e.target.value)}
                      minH="44px"
                    >
                      {exportYears.map(({ year, recordCount }) => (
                        <option key={year} value={year}>
                          {`KK Youth Profile ${year} — ${recordCount.toLocaleString()} record${recordCount === 1 ? '' : 's'}`}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                  <Box p={4} bg="surface.muted" borderWidth="1px" borderColor="border" borderRadius="md">
                    <Text fontWeight="700" fontSize="sm">Official KK youth profile layout</Text>
                    <Text color="text.secondary" fontSize="sm" lineHeight="1.6" mt={1}>
                      The XLSX export uses the same filing-year workbook format as Youth Records, with the official title block and print-ready columns.
                    </Text>
                  </Box>
                  <Text color="text.muted" fontSize="sm">
                    Filename: <Text as="span" fontWeight="700" color="text.secondary">KK Youth Profile {exportYear || 'Year'}.xlsx</Text>
                  </Text>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer flexDirection={{ base: 'column-reverse', sm: 'row' }} gap={3}>
                <Button width={{ base: 'full', sm: 'auto' }} variant="outline" onClick={() => setExportDialogOpen(false)} disabled={exporting}>
                  Cancel
                </Button>
                <Button width={{ base: 'full', sm: 'auto' }} colorPalette="green" onClick={() => handleExport('xlsx')} loading={exporting} disabled={!exportYear}>
                  <LuDownload aria-hidden="true" /> Download Excel
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <IconButton aria-label="Close export dialog" variant="ghost" size="sm" position="absolute" top={3} right={3} disabled={exporting}>
                  <LuX aria-hidden="true" />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </DashboardLayout>
  );
};

export default ReportsPage;
