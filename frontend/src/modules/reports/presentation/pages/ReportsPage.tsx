import { useState, useEffect, useMemo } from 'react';
import { Alert, Badge, Box, Button, Card, Dialog, Field, Grid, Heading, HStack, IconButton, NativeSelect, Portal, SimpleGrid, Spinner, Table, Text, VStack } from '@chakra-ui/react';
import { LuCircleAlert, LuDatabase, LuDownload, LuFileSpreadsheet, LuRefreshCw, LuX } from 'react-icons/lu';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import { categoryApi, type Category } from '../../../categories/infrastructure/category-api';
import {
  availableCategoryYears,
  categoriesForRegistry,
  categoriesForYear,
  preferredCategoryYear,
} from '../../../categories/domain/category-scope';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { showToast } from '../../../../shared/toast';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import { reportApi, type DemographicBreakdown, type SummaryData } from '../../infrastructure/report-api';
import { ChildLaborerReportsView } from '../../../child-laborers/presentation/components/ChildLaborerReportsView';

type Demographics = {
  totalRecords: number;
  sex: DemographicBreakdown[];
  civilStatus: DemographicBreakdown[];
  youthClassification: DemographicBreakdown[];
  youthAgeGroup: DemographicBreakdown[];
  educationalAttainment: DemographicBreakdown[];
  workStatus: DemographicBreakdown[];
  registeredVoter: DemographicBreakdown[];
  votedLastElection: DemographicBreakdown[];
  attendedAssembly: DemographicBreakdown[];
};

const ReportsPage = () => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';
  const [dataset, setDataset] = useState<'KK_YOUTH' | 'CHILD_LABORERS'>('KK_YOUTH');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filingYear, setFilingYear] = useState<number | null>(null);
  const [barangayId, setBarangayId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportsRevision, setReportsRevision] = useState(0);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const demographicSections = useMemo(() => demographics ? [
    { title: 'Sex', data: demographics.sex, group: 'profile' },
    { title: 'Civil Status', data: demographics.civilStatus, group: 'profile' },
    { title: 'Youth Classification', data: demographics.youthClassification, group: 'profile' },
    { title: 'Age Group', data: demographics.youthAgeGroup, group: 'profile' },
    { title: 'Educational Attainment', data: demographics.educationalAttainment, group: 'profile' },
    { title: 'Work Status', data: demographics.workStatus, group: 'profile' },
    { title: 'Registered Voter', data: demographics.registeredVoter, group: 'participation' },
    { title: 'Voted in the Last Election', data: demographics.votedLastElection, group: 'participation' },
    { title: 'Attended a KK Assembly', data: demographics.attendedAssembly, group: 'participation' },
  ] : [], [demographics]);
  const unansweredFields = useMemo(() => demographicSections.reduce((total, section) => (
    total + (section.data.find((item) => item.label === 'No response')?.count ?? 0)
  ), 0), [demographicSections]);

  const youthCategories = useMemo(
    () => categoriesForRegistry(categories, 'YOUTH_PROFILE'),
    [categories],
  );
  const filingYears = useMemo(() => availableCategoryYears(youthCategories), [youthCategories]);
  const yearCategories = useMemo(
    () => categoriesForYear(youthCategories, filingYear),
    [filingYear, youthCategories],
  );
  const selectedCategory = yearCategories.find((category) => category.id === categoryId) ?? null;
  const selectedBarangay = barangays.find((barangay) => barangay.id === barangayId) ?? null;

  useEffect(() => {
    let active = true;
    const loadFilters = async () => {
      setFiltersLoading(true);
      try {
        const [barangayData, categoryRes] = await Promise.all([
          isAdmin ? barangayApi.list() : Promise.resolve([]),
          categoryApi.list('YOUTH_PROFILE'),
        ]);
        if (!active) return;
        setBarangays(barangayData);
        setCategories(categoryRes.data);
        const scopedCategories = categoriesForRegistry(categoryRes.data, 'YOUTH_PROFILE');
        setFilingYear((current) => (
          current !== null && availableCategoryYears(scopedCategories).includes(current)
            ? current
            : preferredCategoryYear(scopedCategories)
        ));
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Report filters could not be loaded.';
        setReportsError(message);
        showToast.error({ title: 'Failed to load report filters', description: message });
      } finally {
        if (active) setFiltersLoading(false);
      }
    };
    void loadFilters();
    return () => { active = false; };
  }, [isAdmin]);

  useEffect(() => {
    if (categoryId && !yearCategories.some((category) => category.id === categoryId)) {
      setCategoryId('');
    }
  }, [categoryId, yearCategories]);

  useEffect(() => {
    if (dataset !== 'KK_YOUTH' || filingYear === null || filtersLoading) return;
    let active = true;
    const fetchData = async () => {
      setReportsLoading(true);
      setReportsError(null);
      setSummary(null);
      setDemographics(null);
      try {
        const filters = { barangayId, categoryId, status, filingYear };
        const [sumRes, demRes] = await Promise.all([
          reportApi.getSummary(filters),
          reportApi.getDemographics(filters),
        ]);
        if (!active) return;
        setSummary(sumRes.data);
        setDemographics(demRes.data);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : `The ${filingYear} report could not be loaded.`;
        setReportsError(message);
        showToast.error({ title: 'Failed to load reports', description: message });
      } finally {
        if (active) setReportsLoading(false);
      }
    };
    void fetchData();
    return () => { active = false; };
  }, [barangayId, categoryId, status, filingYear, filtersLoading, dataset, reportsRevision]);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    const selectedYear = filingYear;
    if (!Number.isInteger(selectedYear)) {
      showToast.error('Select a filing year before exporting');
      return;
    }
    setExporting(true);
    try {
      const blob = await reportApi.exportRecords({
        format,
        barangayId,
        categoryId,
        status,
        filingYear: selectedYear as number,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const scope = isAdmin && barangayId ? barangays.find((barangay) => barangay.id === barangayId)?.code ?? 'barangay' : isAdmin ? 'all-barangays' : 'assigned-barangay';
      a.href = url;
      a.download = format === 'xlsx'
        ? `KK Youth Profile ${selectedYear}.xlsx`
        : `youth-records-${selectedYear}-${scope}.${format}`;
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
    <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" overflow="hidden">
      <Card.Header px={{ base: 4, md: 5 }} py={4} borderBottomWidth="1px" borderColor="border">
        <Box>
          <Heading size="sm">{title}</Heading>
          <Text fontSize="sm" color="text.muted" mt={1}>
            All {demographics?.totalRecords.toLocaleString() ?? 0} filtered {filingYear} records are counted.
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
            {data?.map((item) => {
              const isUnanswered = item.label === 'No response';
              return (
              <Table.Row key={item.label} bg={isUnanswered ? 'orange.50' : undefined}>
                <Table.Cell>
                  {isUnanswered ? <Badge colorPalette="orange" variant="subtle">No response</Badge> : item.label}
                </Table.Cell>
                <Table.Cell textAlign="right">{item.count.toLocaleString()}</Table.Cell>
                <Table.Cell textAlign="right">{item.percentage.toFixed(1)}%</Table.Cell>
                <Table.Cell>
                  <Box w="100%" bg="surface.muted" h="8px" borderRadius="full">
                    <Box w={`${item.percentage}%`} bg={isUnanswered ? 'orange.500' : 'green.500'} h="100%" borderRadius="full" />
                  </Box>
                </Table.Cell>
              </Table.Row>
              );
            })}
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

  if (dataset === 'CHILD_LABORERS') {
    return <ChildLaborerReportsView onShowYouthRecords={() => setDataset('KK_YOUTH')} />;
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Reports"
        description="Review one annual dataset at a time. Every metric, demographic response, and export follows the selected filing year."
        actions={(
          <HStack gap={3} wrap="wrap">
            <NativeSelect.Root width={{ base: 'full', md: '220px' }}>
              <NativeSelect.Field
                aria-label="Report dataset"
                value={dataset}
                minH="44px"
                onChange={(event) => setDataset(event.target.value as 'KK_YOUTH' | 'CHILD_LABORERS')}
              >
                <option value="KK_YOUTH">KK Youth Records</option>
                <option value="CHILD_LABORERS">Child Laborer Records</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Button variant="outline" onClick={() => void handleExport('csv')} disabled={filingYear === null || exporting}>
              Export CSV
            </Button>
            <Button colorPalette="green" onClick={() => setExportDialogOpen(true)} disabled={filingYear === null || exporting}>
              <LuDownload aria-hidden="true" /> Export XLSX
            </Button>
          </HStack>
        )}
      />

      <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" mb={5}>
        <Card.Header px={{ base: 4, md: 5 }} pt={{ base: 4, md: 5 }} pb={2}>
          <Heading as="h2" size="sm">Report controls</Heading>
          <Text mt={1} fontSize="sm" color="text.muted">
            Filing year is required. Profile and demographic totals never combine different annual datasets.
          </Text>
        </Card.Header>
        <Card.Body px={{ base: 4, md: 5 }} pt={3} pb={{ base: 4, md: 5 }}>
          <Grid
            templateColumns={{
              base: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
              xl: isAdmin ? 'repeat(4, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
            }}
            gap={4}
          >
            <Field.Root required>
              <Field.Label>Filing year <Field.RequiredIndicator /></Field.Label>
              <NativeSelect.Root width="full" disabled={filtersLoading || filingYears.length === 0}>
                <NativeSelect.Field
                  aria-label="Filing year"
                  minH="44px"
                  value={filingYear ?? ''}
                  onChange={(event) => {
                    setFilingYear(Number(event.target.value));
                    setCategoryId('');
                  }}
                >
                  {filingYears.length === 0 && <option value="">No filing years available</option>}
                  {filingYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Field.HelperText>Controls every total, response table, and export.</Field.HelperText>
            </Field.Root>
            {isAdmin && (
              <Field.Root>
                <Field.Label>Barangay scope</Field.Label>
                <NativeSelect.Root width="full" disabled={filtersLoading}>
                  <NativeSelect.Field aria-label="Barangay" minH="44px" value={barangayId} onChange={(event) => setBarangayId(event.target.value)}>
                    <option value="">All Barangays</option>
                    {barangays.map((barangay) => (
                      <option key={barangay.id} value={barangay.id}>{barangay.name}</option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            )}
            <Field.Root>
              <Field.Label>Youth category</Field.Label>
              <NativeSelect.Root width="full" disabled={filtersLoading || filingYear === null}>
                <NativeSelect.Field aria-label="Youth category" minH="44px" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="">All categories in {filingYear ?? 'selected year'}</option>
                  {yearCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Record status</Field.Label>
              <NativeSelect.Root width="full" disabled={filtersLoading || filingYear === null}>
                <NativeSelect.Field aria-label="Record status" minH="44px" value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="RETURNED">Returned</option>
                  <option value="APPROVED">Approved</option>
                  <option value="ARCHIVED">Archived</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          </Grid>
        </Card.Body>
      </Card.Root>

      <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" mb={6}>
        <Card.Body p={{ base: 4, md: 5 }}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            {[
              {
                label: 'Filing year',
                value: filingYear ?? 'No annual dataset',
              },
              {
                label: 'Barangay scope',
                value: isAdmin ? selectedBarangay?.name ?? 'All barangays' : 'Assigned barangay only',
              },
              {
                label: 'Category scope',
                value: selectedCategory?.name ?? (filingYear === null ? 'No annual dataset' : `All ${filingYear} youth categories`),
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

      {reportsError && (
        <Alert.Root status="error" role="alert" borderRadius="md" mb={6} alignItems="flex-start">
          <LuCircleAlert aria-hidden="true" />
          <Box flex="1">
            <Alert.Title>{filingYear ? `${filingYear} report could not be loaded` : 'Reports could not be loaded'}</Alert.Title>
            <Text mt={1}>{reportsError}</Text>
          </Box>
          <Button variant="outline" colorPalette="red" minH="44px" onClick={() => setReportsRevision((revision) => revision + 1)}>
            <LuRefreshCw aria-hidden="true" /> Retry
          </Button>
        </Alert.Root>
      )}

      {(filtersLoading || reportsLoading) && (
        <Card.Root borderColor="border" borderRadius="lg" mb={6} aria-busy="true">
          <Card.Body p={6}>
            <HStack justify="center" gap={3} role="status">
              <Spinner color="primary.600" />
              <Text>Loading {filingYear ? `${filingYear} ` : ''}report data…</Text>
            </HStack>
          </Card.Body>
        </Card.Root>
      )}

      {!filtersLoading && filingYear === null && (
        <Card.Root borderColor="border" borderRadius="lg" mb={6}>
          <Card.Body p={{ base: 5, md: 7 }} textAlign="center">
            <Heading size="sm">No Youth Registry filing year is available</Heading>
            <Text mt={2} color="text.muted">Create an annual Youth Registry category before generating reports.</Text>
          </Card.Body>
        </Card.Root>
      )}

      {!reportsLoading && summary && (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4} mb={8}>
          <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={5}>
              <Text fontSize="sm" color="text.muted">{filingYear} Records</Text>
              <Text fontSize="2xl" fontWeight="700" mt={1}>{summary.totalRecords.toLocaleString()}</Text>
            </Card.Body>
          </Card.Root>
          <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={5}>
              <Text fontSize="sm" color="text.muted">Approved</Text>
              <Text fontSize="2xl" fontWeight="700" mt={1}>{summary.approved.toLocaleString()}</Text>
            </Card.Body>
          </Card.Root>
          <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={5}>
              <Text fontSize="sm" color="text.muted">Pending Review</Text>
              <Text fontSize="2xl" fontWeight="700" mt={1}>{summary.submitted.toLocaleString()}</Text>
            </Card.Body>
          </Card.Root>
          <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={5}>
              <Text fontSize="sm" color="text.muted">Added This Month</Text>
              <Text fontSize="2xl" fontWeight="700" mt={1}>{summary.thisMonth.toLocaleString()}</Text>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>
      )}

      {demographics && (
        <VStack align="stretch" gap={8}>
          <Card.Root borderColor="orange.200" borderRadius="lg" bg="orange.50">
            <Card.Body p={{ base: 4, md: 5 }}>
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} alignItems="center">
                <HStack gap={3}>
                  <Box display="grid" placeItems="center" boxSize="44px" flexShrink={0} borderRadius="md" bg="white" color="orange.700">
                    <LuDatabase size={22} aria-hidden="true" />
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="text.muted">Records represented</Text>
                    <Text fontFamily="heading" fontSize="2xl" fontWeight="700">{demographics.totalRecords.toLocaleString()}</Text>
                  </Box>
                </HStack>
                <HStack gap={3}>
                  <Box display="grid" placeItems="center" boxSize="44px" flexShrink={0} borderRadius="md" bg="white" color="orange.700">
                    <LuCircleAlert size={22} aria-hidden="true" />
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="text.muted">Unanswered fields</Text>
                    <Text fontFamily="heading" fontSize="2xl" fontWeight="700">{unansweredFields.toLocaleString()}</Text>
                  </Box>
                </HStack>
                <Text fontSize="sm" color="text.secondary" lineHeight="1.6">
                  Imported blanks and unanswered questions remain visible as <Text as="span" fontWeight="700">No response</Text>. One record may contribute to multiple unanswered fields.
                </Text>
              </SimpleGrid>
            </Card.Body>
          </Card.Root>

          <Box>
            <HStack gap={3} wrap="wrap">
              <Heading size="md">Profile and demographic responses</Heading>
              <Badge colorPalette="green" variant="subtle">Filing year {filingYear}</Badge>
            </HStack>
            <Text mt={1} mb={4} color="text.muted" fontSize="sm">
              Percentages use only {filingYear} records in the current barangay, category, and status filters, including records with missing answers.
            </Text>
            <SimpleGrid columns={{ base: 1, xl: 2 }} gap={5}>
              {demographicSections.filter((section) => section.group === 'profile').map((section) => (
                <DemographicTable key={section.title} title={section.title} data={section.data} />
              ))}
            </SimpleGrid>
          </Box>

          <Box>
            <HStack gap={3} wrap="wrap">
              <Heading size="md">Civic participation responses</Heading>
              <Badge colorPalette="green" variant="subtle">Filing year {filingYear}</Badge>
            </HStack>
            <Text mt={1} mb={4} color="text.muted" fontSize="sm">Yes, No, and unanswered imported values for {filingYear} are reported separately.</Text>
            <SimpleGrid columns={{ base: 1, xl: 2 }} gap={5}>
              {demographicSections.filter((section) => section.group === 'participation').map((section) => (
                <DemographicTable key={section.title} title={section.title} data={section.data} />
              ))}
            </SimpleGrid>
          </Box>
        </VStack>
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
                    <Text color="text.muted" fontSize="sm" mt={1}>The export follows the active report filters.</Text>
                  </Box>
                </HStack>
              </Dialog.Header>
              <Dialog.Body>
                <VStack align="stretch" gap={4}>
                  <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                    <Box p={4} bg="surface.muted" borderWidth="1px" borderColor="border" borderRadius="md">
                      <Text color="text.muted" fontSize="sm">Filing year</Text>
                      <Text mt={1} fontWeight="700">{filingYear ?? 'Not selected'}</Text>
                    </Box>
                    <Box p={4} bg="surface.muted" borderWidth="1px" borderColor="border" borderRadius="md">
                      <Text color="text.muted" fontSize="sm">Barangay</Text>
                      <Text mt={1} fontWeight="700">{isAdmin ? selectedBarangay?.name ?? 'All barangays' : 'Assigned barangay'}</Text>
                    </Box>
                  </SimpleGrid>
                  <Box p={4} bg="surface.muted" borderWidth="1px" borderColor="border" borderRadius="md">
                    <Text fontWeight="700" fontSize="sm">Official KK youth profile layout</Text>
                    <Text color="text.secondary" fontSize="sm" lineHeight="1.6" mt={1}>
                      The XLSX export includes only the selected filing year and current category/status filters, using the official title block and print-ready columns.
                    </Text>
                  </Box>
                  <Text color="text.muted" fontSize="sm">
                    Filename: <Text as="span" fontWeight="700" color="text.secondary">KK Youth Profile {filingYear ?? 'Year'}.xlsx</Text>
                  </Text>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer flexDirection={{ base: 'column-reverse', sm: 'row' }} gap={3}>
                <Button width={{ base: 'full', sm: 'auto' }} variant="outline" onClick={() => setExportDialogOpen(false)} disabled={exporting}>
                  Cancel
                </Button>
                <Button width={{ base: 'full', sm: 'auto' }} colorPalette="green" onClick={() => void handleExport('xlsx')} loading={exporting} disabled={filingYear === null}>
                  <LuDownload aria-hidden="true" /> Download Excel
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <IconButton aria-label="Close export dialog" variant="ghost" minW="44px" minH="44px" position="absolute" top={2} right={2} disabled={exporting}>
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
