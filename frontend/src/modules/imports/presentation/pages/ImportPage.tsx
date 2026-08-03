import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Field,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router';
import {
  LuArrowLeft,
  LuCheck,
  LuCircleCheck,
  LuDownload,
  LuFileSpreadsheet,
  LuInfo,
  LuRefreshCw,
  LuTriangleAlert,
  LuUpload,
  LuX,
} from 'react-icons/lu';
import type { RootState } from '../../../../redux/store';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { showToast } from '../../../../shared/toast';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import {
  categoryApi,
  type Category,
  type CategoryRecordType,
} from '../../../categories/infrastructure/category-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import {
  importApi,
  type CommitImportResult,
  type ImportBatch,
  type ImportRow,
  type PaginationMeta,
} from '../../infrastructure/import-api';
import { ImportValidationTable } from '../components/ImportValidationTable';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.xlsx', '.csv'];
const steps = ['Prepare', 'Review', 'Complete'];

const registryDetails: Record<CategoryRecordType, {
  label: string;
  shortLabel: string;
  description: string;
  destination: string;
  queryValue: string;
}> = {
  YOUTH_PROFILE: {
    label: 'Youth Records',
    shortLabel: 'Youth',
    description: 'KK youth profile dataset',
    destination: '/youth-records',
    queryValue: 'youth',
  },
  OUT_OF_SCHOOL_YOUTH: {
    label: 'Out-of-School Youth Records',
    shortLabel: 'OSY',
    description: 'Annual out-of-school youth dataset',
    destination: '/out-of-school-youth',
    queryValue: 'out-of-school-youth',
  },
  CHILD_LABORER: {
    label: 'Child Laborer Records',
    shortLabel: 'Child Laborer',
    description: 'Child labor monitoring dataset',
    destination: '/child-laborers',
    queryValue: 'child-laborer',
  },
};

const readFileAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result ?? '');
    resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result);
  };
  reader.onerror = () => reject(new Error('The selected file could not be read.'));
  reader.readAsDataURL(file);
});

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

const fileSize = (bytes: number) => bytes >= 1024 * 1024
  ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const ImportPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';
  const [recordType, setRecordType] = useState<CategoryRecordType>(
    searchParams.get('type') === 'child-laborer'
      ? 'CHILD_LABORER'
      : searchParams.get('type') === 'out-of-school-youth'
        ? 'OUT_OF_SCHOOL_YOUTH'
        : 'YOUTH_PROFILE',
  );
  const [file, setFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [barangayId, setBarangayId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [assignedBarangay, setAssignedBarangay] = useState<Barangay | null>(null);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [rowMeta, setRowMeta] = useState<PaginationMeta>({ page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });
  const [completed, setCompleted] = useState<CommitImportResult | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [validating, setValidating] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeBatchId = searchParams.get('batchId');

  const availableCategories = useMemo(() => categories
    .filter((category) => (
      category.status === 'PUBLISHED'
      && category.record_type === recordType
      && (isAdmin || ['SK_FILLABLE', 'PUBLIC'].includes(category.permission_mode))
    ))
    .sort((a, b) => (b.filing_year ?? 0) - (a.filing_year ?? 0)), [categories, isAdmin, recordType]);

  const selectedCategory = useMemo(
    () => availableCategories.find((category) => category.id === categoryId) ?? null,
    [availableCategories, categoryId],
  );
  const destinationBarangay = isAdmin
    ? barangays.find((barangay) => barangay.id === barangayId) ?? null
    : assignedBarangay;
  const destinationBarangayId = isAdmin ? barangayId : profile?.barangayId;
  const setupReady = Boolean(categoryId && destinationBarangayId && file && !loadingContext);

  const currentStep = completed ? 2 : batch ? 1 : 0;
  const activeRecordType = batch?.record_type ?? recordType;
  const activeRegistry = registryDetails[activeRecordType];

  useEffect(() => {
    const loadContext = async () => {
      setLoadingContext(true);
      try {
        const [categoryResponse, barangayResponse, assignedResponse] = await Promise.all([
          categoryApi.list(),
          isAdmin ? barangayApi.list() : Promise.resolve([]),
          !isAdmin && profile?.barangayId
            ? barangayApi.getById(profile.barangayId)
            : Promise.resolve(null),
        ]);
        const activeBarangays = barangayResponse.filter((barangay) => barangay.is_active);
        setCategories(categoryResponse.data);
        setBarangays(activeBarangays);
        setAssignedBarangay(assignedResponse);

        const eligible = categoryResponse.data
          .filter((category) => (
            category.status === 'PUBLISHED'
            && category.record_type === recordType
            && (isAdmin || ['SK_FILLABLE', 'PUBLIC'].includes(category.permission_mode))
          ))
          .sort((a, b) => (b.filing_year ?? 0) - (a.filing_year ?? 0));
        setCategoryId((current) => current || eligible[0]?.id || '');
        if (!isAdmin && profile?.barangayId) setBarangayId(profile.barangayId);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Import settings could not be loaded.');
      } finally {
        setLoadingContext(false);
      }
    };
    void loadContext();
  }, [isAdmin, profile?.barangayId, recordType]);

  useEffect(() => {
    if (loadingContext) return;
    if (!availableCategories.some((category) => category.id === categoryId)) {
      setCategoryId(availableCategories[0]?.id ?? '');
    }
  }, [availableCategories, categoryId, loadingContext]);

  useEffect(() => {
    if (!resumeBatchId) return;
    const resume = async () => {
      setValidating(true);
      setFormError(null);
      try {
        const response = await importApi.getBatch(resumeBatchId);
        if (response.data.status !== 'VALIDATED') {
          throw new Error('Only a validated import can be resumed. Start a new import instead.');
        }
        setBatch(response.data);
        setRecordType(response.data.record_type);
        setCategoryId(response.data.category_id);
        setBarangayId(response.data.barangay_id);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'The import could not be resumed.');
        setSearchParams({}, { replace: true });
      } finally {
        setValidating(false);
      }
    };
    void resume();
  }, [resumeBatchId, setSearchParams]);

  useEffect(() => {
    if (!batch || completed) return;
    const loadRows = async () => {
      setLoadingRows(true);
      try {
        const response = await importApi.listRows(batch.id, rowMeta.page, rowMeta.pageSize);
        setRows(response.data);
        setRowMeta(response.meta);
      } catch (error) {
        showToast.error({
          title: 'Preview could not be loaded',
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      } finally {
        setLoadingRows(false);
      }
    };
    void loadRows();
  }, [batch, completed, rowMeta.page, rowMeta.pageSize]);

  const chooseFile = (selectedFile: File | null) => {
    setFormError(null);
    if (!selectedFile) {
      setFile(null);
      return;
    }
    const lowerName = selectedFile.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
      setFile(null);
      setFormError('Choose an .xlsx or .csv spreadsheet.');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setFormError('The spreadsheet is larger than 10 MB. Split it into smaller files and try again.');
      return;
    }
    setFile(selectedFile);
  };

  const chooseRegistry = (nextRecordType: CategoryRecordType) => {
    if (nextRecordType === recordType) return;
    setRecordType(nextRecordType);
    setCategoryId('');
    setFile(null);
    setFormError(null);
    setSearchParams(
      nextRecordType === 'YOUTH_PROFILE' ? {} : { type: registryDetails[nextRecordType].queryValue },
      { replace: true },
    );
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    chooseFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropActive(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  };

  const handleValidate = async () => {
    setFormError(null);
    const targetBarangayId = isAdmin ? barangayId : profile?.barangayId;
    if (!categoryId) {
      setFormError('Select a filing-year category.');
      return;
    }
    if (!targetBarangayId) {
      setFormError(isAdmin ? 'Select the barangay this spreadsheet belongs to.' : 'Your account has no active barangay assignment.');
      return;
    }
    if (!file) {
      setFormError('Choose an .xlsx or .csv spreadsheet.');
      return;
    }

    setValidating(true);
    try {
      const fileData = await readFileAsBase64(file);
      const response = await importApi.validate({
        categoryId,
        barangayId: targetBarangayId,
        fileData,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
      });
      setBatch(response.data);
      setRowMeta((current) => ({ ...current, page: 1 }));
      setSearchParams({ batchId: response.data.id }, { replace: true });
      showToast.success('Spreadsheet checked successfully');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'The spreadsheet could not be checked.');
    } finally {
      setValidating(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      downloadBlob(await importApi.downloadTemplate(), 'youth-record-import-template.xlsx');
      showToast.success('Import template downloaded');
    } catch (error) {
      showToast.error({
        title: 'Template download failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadErrors = async () => {
    if (!batch) return;
    setDownloading(true);
    try {
      downloadBlob(await importApi.downloadErrorFile(batch.id), `import-errors-${batch.filing_year ?? 'youth-records'}.xlsx`);
    } catch (error) {
      showToast.error({
        title: 'Error report download failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleCommit = async () => {
    if (!batch) return;
    const response = await importApi.commit(batch.id);
    setBatch(response.data.batch);
    setCompleted(response.data);
    setSearchParams({}, { replace: true });
    showToast.success(`${response.data.imported_count.toLocaleString()} ${activeRegistry.shortLabel.toLowerCase()} records imported`);
  };

  const resetImport = async () => {
    setFormError(null);
    if (batch?.status === 'VALIDATED') {
      try {
        await importApi.cancel(batch.id);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'The current import could not be cancelled.');
        return;
      }
    }
    setFile(null);
    setBatch(null);
    setRows([]);
    setCompleted(null);
    setRowMeta({ page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });
    setSearchParams({}, { replace: true });
  };

  return (
    <DashboardLayout>
      <Box maxW="1120px" mx="auto">
        <PageHeader
          title="Import Registry Records"
          description="Choose a registry, match its filing year and barangay, then review every row before anything is saved."
          actions={(
            <Button variant="outline" onClick={() => navigate('/imports')}>
              <LuArrowLeft aria-hidden="true" /> Import History
            </Button>
          )}
        />

        <Card.Root borderColor="border" borderRadius="lg" mb={5} boxShadow="panel">
          <Card.Body py={4} px={{ base: 4, md: 6 }}>
            <Grid templateColumns="repeat(3, 1fr)" gap={2} position="relative">
              <Box position="absolute" h="2px" bg="border" left="16%" right="16%" top="17px" />
              {steps.map((step, index) => (
                <VStack key={step} gap={2} position="relative" zIndex={1}>
                  <Flex
                    boxSize="36px"
                    borderRadius="full"
                    align="center"
                    justify="center"
                    bg={index <= currentStep ? 'primary.600' : 'surface'}
                    color={index <= currentStep ? 'white' : 'text.muted'}
                    borderWidth="2px"
                    borderColor={index <= currentStep ? 'primary.600' : 'border.strong'}
                    fontWeight="700"
                  >
                    {index < currentStep ? <LuCheck aria-hidden="true" /> : index + 1}
                  </Flex>
                  <Text fontSize="sm" fontWeight={index === currentStep ? '700' : '500'} color={index <= currentStep ? 'text.primary' : 'text.muted'}>
                    {step}
                  </Text>
                </VStack>
              ))}
            </Grid>
          </Card.Body>
        </Card.Root>

        {formError && (
          <Alert.Root status="error" role="alert" mb={5} borderRadius="md" alignItems="flex-start">
            <LuTriangleAlert aria-hidden="true" />
            <Box flex="1">
              <Alert.Title>Import needs attention</Alert.Title>
              <Text mt={1}>{formError}</Text>
            </Box>
            <IconButton aria-label="Dismiss error" variant="ghost" minW="44px" minH="44px" onClick={() => setFormError(null)}>
              <LuX />
            </IconButton>
          </Alert.Root>
        )}

        {currentStep === 0 && (
          <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={{ base: 4, md: 7 }}>
              <VStack align="stretch" gap={6}>
                <Box>
                  <Heading size="md">Choose the destination registry</Heading>
                  <Text color="text.secondary" mt={2}>
                    The selected registry controls the expected columns and prevents a Youth file from being filed as Child Laborer data, or vice versa.
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} mt={4}>
                    {(Object.keys(registryDetails) as CategoryRecordType[]).map((type) => {
                      const details = registryDetails[type];
                      const selected = recordType === type;
                      return (
                        <Button
                          key={type}
                          variant="outline"
                          minH="68px"
                          height="auto"
                          justifyContent="flex-start"
                          textAlign="left"
                          whiteSpace="normal"
                          borderWidth="2px"
                          borderColor={selected ? 'primary.600' : 'border.strong'}
                          bg={selected ? 'primary.50' : 'surface'}
                          color={selected ? 'primary.800' : 'text.primary'}
                          onClick={() => chooseRegistry(type)}
                          aria-pressed={selected}
                        >
                          <Box>
                            <Text fontWeight="700">{details.label}</Text>
                            <Text fontSize="xs" color="text.secondary" mt={1}>
                              {details.description}
                            </Text>
                          </Box>
                        </Button>
                      );
                    })}
                  </SimpleGrid>
                </Box>

                <Box
                  borderWidth="1px"
                  borderColor="green.200"
                  borderRadius="lg"
                  bg="green.50"
                  p={{ base: 4, md: 5 }}
                >
                  <Flex
                    align={{ base: 'stretch', md: 'center' }}
                    justify="space-between"
                    direction={{ base: 'column', md: 'row' }}
                    gap={4}
                  >
                    <HStack align="flex-start" gap={3}>
                      <Flex
                        boxSize="44px"
                        flexShrink={0}
                        borderRadius="md"
                        align="center"
                        justify="center"
                        bg="green.100"
                        color="green.700"
                      >
                        <LuFileSpreadsheet size={22} aria-hidden="true" />
                      </Flex>
                      <Box>
                        <Badge colorPalette="green" mb={2}>{recordType === 'YOUTH_PROFILE' ? 'Recommended' : 'Round-trip ready'}</Badge>
                        <Heading size="md">
                          {recordType === 'YOUTH_PROFILE' ? 'Start with the guided Excel template' : `Use an exported ${activeRegistry.shortLabel} CSV`}
                        </Heading>
                        <Text color="text.secondary" mt={2} maxW="68ch">
                          {recordType === 'YOUTH_PROFILE'
                            ? 'Its dropdown choices match the Youth Record form, so classifications, education, work status, and Yes/No answers arrive consistently.'
                            : `Filter the ${activeRegistry.shortLabel} list by year, barangay, or status, then download CSV. That same file can be checked and imported here without remapping columns.`}
                        </Text>
                      </Box>
                    </HStack>
                    <Button
                      colorPalette="green"
                      variant="solid"
                      minH="44px"
                      flexShrink={0}
                      onClick={recordType === 'YOUTH_PROFILE'
                        ? handleDownloadTemplate
                        : () => navigate(activeRegistry.destination)}
                      loading={recordType === 'YOUTH_PROFILE' && downloading}
                    >
                      {recordType === 'YOUTH_PROFILE'
                        ? <><LuDownload aria-hidden="true" /> Download Guided Template</>
                        : <>Open {activeRegistry.shortLabel} Records</>}
                    </Button>
                  </Flex>
                  <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3} mt={4}>
                    {(recordType === 'YOUTH_PROFILE' ? [
                      'Built-in dropdown choices',
                      'Required fields clearly marked',
                      'Instructions and field examples',
                    ] : [
                      'Registry and filing year embedded',
                      'Current filters carried into CSV',
                      'Custom fields preserved as JSON',
                    ]).map((benefit) => (
                      <HStack key={benefit} gap={2} align="flex-start">
                        <LuCircleCheck color="var(--chakra-colors-green-700)" aria-hidden="true" />
                        <Text fontSize="sm" color="text.secondary">{benefit}</Text>
                      </HStack>
                    ))}
                  </SimpleGrid>
                </Box>

                <Box>
                  <Heading size="md">1. Confirm the import destination</Heading>
                  <Text color="text.secondary" mt={2}>
                    Choose carefully: every ready row will be filed under this category and barangay.
                    {recordType === 'YOUTH_PROFILE'
                      ? ' Youth age eligibility is calculated on December 31 of the selected filing year.'
                      : ` The file metadata must match the selected ${activeRegistry.shortLabel} filing year.`}
                  </Text>
                </Box>

                {loadingContext ? (
                  <HStack role="status" py={6} justify="center"><Spinner color="primary.600" /><Text>Loading import settings…</Text></HStack>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
                    <Field.Root required>
                      <Field.Label htmlFor="import-category">Filing-year category <Field.RequiredIndicator /></Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field id="import-category" minH="44px" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                          <option value="">Select filing year</option>
                          {availableCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}{category.filing_year ? ` — ${category.filing_year}` : ''}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>

                    <Field.Root required>
                      <Field.Label htmlFor="import-barangay">Barangay <Field.RequiredIndicator /></Field.Label>
                      {isAdmin ? (
                        <NativeSelect.Root>
                          <NativeSelect.Field id="import-barangay" minH="44px" value={barangayId} onChange={(event) => setBarangayId(event.target.value)}>
                            <option value="">Select barangay</option>
                            {barangays.map((barangay) => <option key={barangay.id} value={barangay.id}>{barangay.name}</option>)}
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      ) : (
                        <Box minH="44px" display="flex" alignItems="center" px={3} borderWidth="1px" borderColor="border.strong" borderRadius="md" bg="surface.muted">
                          <Text fontWeight="600">{assignedBarangay?.name ?? 'No assigned barangay'}</Text>
                        </Box>
                      )}
                      <Field.HelperText>Rows marked for another barangay will be listed as invalid and skipped.</Field.HelperText>
                    </Field.Root>
                  </SimpleGrid>
                )}

                <Box>
                  <Heading size="md">2. Add the completed spreadsheet</Heading>
                  <Text color="text.secondary" mt={2}>
                    {recordType === 'YOUTH_PROFILE'
                      ? 'Guided templates, official KK workbooks, and Youth CSV exports are supported. Only the guided .xlsx template includes dropdown validation.'
                      : `Use an ${activeRegistry.shortLabel} CSV exported by this system. Registry, filing year, barangay, required fields, and duplicates are checked before import.`}{' '}
                    Maximum file size: 10 MB.
                  </Text>
                </Box>

                <Box
                  role="button"
                  tabIndex={0}
                  aria-label="Choose spreadsheet file"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => { event.preventDefault(); setDropActive(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDropActive(false)}
                  onDrop={handleDrop}
                  borderWidth="2px"
                  borderStyle="dashed"
                  borderColor={dropActive || file ? 'primary.500' : 'border.strong'}
                  bg={dropActive || file ? 'primary.50' : 'surface.muted'}
                  borderRadius="lg"
                  p={{ base: 6, md: 10 }}
                  textAlign="center"
                  cursor="pointer"
                  transition="border-color 0.15s ease, background 0.15s ease"
                  _hover={{ borderColor: 'primary.500', bg: 'primary.50' }}
                  _focusVisible={{ outline: '3px solid', outlineColor: 'primary.300', outlineOffset: '2px' }}
                >
                  <Input ref={fileInputRef} type="file" accept=".xlsx,.csv" hidden onChange={handleFileChange} />
                  {file ? (
                    <VStack gap={2}>
                      <Flex boxSize="48px" borderRadius="full" align="center" justify="center" bg="primary.100" color="primary.700">
                        <LuFileSpreadsheet size={24} aria-hidden="true" />
                      </Flex>
                      <Text fontWeight="700" overflowWrap="anywhere">{file.name}</Text>
                      <Text color="text.muted" fontSize="sm">{fileSize(file.size)} · Ready to check</Text>
                      <Button
                        mt={2}
                        variant="ghost"
                        colorPalette="red"
                        minH="44px"
                        onClick={(event) => { event.stopPropagation(); setFile(null); }}
                      >
                        <LuX aria-hidden="true" /> Remove file
                      </Button>
                    </VStack>
                  ) : (
                    <VStack gap={3}>
                      <Flex boxSize="48px" borderRadius="full" align="center" justify="center" bg="primary.100" color="primary.700">
                        <LuUpload size={24} aria-hidden="true" />
                      </Flex>
                      <Box>
                        <Text fontWeight="700">Drop your .xlsx or .csv file here</Text>
                        <Text color="text.muted" fontSize="sm" mt={1}>or click to browse your computer</Text>
                      </Box>
                    </VStack>
                  )}
                </Box>

                {setupReady && (
                  <Alert.Root status="success" borderRadius="md" alignItems="flex-start">
                    <LuCircleCheck aria-hidden="true" />
                    <Box>
                      <Alert.Title>Ready for a safe preview</Alert.Title>
                      <Text mt={1} overflowWrap="anywhere">
                        <strong>{file?.name}</strong> will be checked for{' '}
                        <strong>{destinationBarangay?.name ?? 'your assigned barangay'}</strong> under{' '}
                        <strong>{selectedCategory?.name ?? 'the selected category'}{selectedCategory?.filing_year ? ` (${selectedCategory.filing_year})` : ''}</strong>.
                      </Text>
                    </Box>
                  </Alert.Root>
                )}

                <Alert.Root status="info" borderRadius="md" alignItems="flex-start">
                  <LuInfo aria-hidden="true" />
                  <Box>
                    <Alert.Title>Nothing is imported during checking</Alert.Title>
                    <Text mt={1}>You will review ready, invalid, and duplicate rows before any {activeRegistry.shortLabel.toLowerCase()} record is created.</Text>
                  </Box>
                </Alert.Root>

                <Flex justify="flex-end">
                  <Button
                    colorPalette="green"
                    minH="44px"
                    minW={{ base: 'full', sm: '180px' }}
                    onClick={handleValidate}
                    loading={validating}
                    disabled={!setupReady || validating}
                  >
                    <LuFileSpreadsheet aria-hidden="true" /> Check Spreadsheet
                  </Button>
                </Flex>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {currentStep === 1 && batch && (
          <VStack align="stretch" gap={5}>
            <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
              <Card.Body p={{ base: 4, md: 6 }}>
                <Flex align={{ base: 'flex-start', md: 'center' }} justify="space-between" gap={4} direction={{ base: 'column', md: 'row' }}>
                  <Box minW={0}>
                    <HStack gap={2} mb={2} wrap="wrap">
                      <Badge colorPalette="green">Validated</Badge>
                      <Text color="text.muted" fontSize="sm">{batch.file_name}</Text>
                    </HStack>
                    <Heading size="md">Review before importing</Heading>
                    <Text color="text.secondary" mt={2}>
                      {activeRegistry.label} · {batch.barangay_name ?? 'Selected barangay'} · {batch.category_name ?? activeRegistry.shortLabel}{batch.filing_year ? ` (${batch.filing_year})` : ''}
                    </Text>
                  </Box>
                  <Button variant="outline" minH="44px" onClick={() => void resetImport()}>
                    <LuRefreshCw aria-hidden="true" /> Choose Another File
                  </Button>
                </Flex>
              </Card.Body>
            </Card.Root>

            <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" overflow="hidden">
              <Card.Body p={{ base: 4, md: 5 }}>
                <Flex align={{ base: 'stretch', md: 'center' }} justify="space-between" direction={{ base: 'column', md: 'row' }} gap={4}>
                  <HStack align="flex-start" gap={3}>
                    <Flex
                      boxSize="36px"
                      align="center"
                      justify="center"
                      flexShrink={0}
                      borderRadius="md"
                      bg={batch.invalid_rows + batch.duplicate_rows > 0 ? 'orange.50' : 'green.50'}
                      color={batch.invalid_rows + batch.duplicate_rows > 0 ? 'orange.800' : 'green.700'}
                    >
                      {batch.invalid_rows + batch.duplicate_rows > 0
                        ? <LuTriangleAlert size={18} aria-hidden="true" />
                        : <LuCircleCheck size={18} aria-hidden="true" />}
                    </Flex>
                    <Box>
                      <Heading as="h3" size="sm">Validation summary</Heading>
                      <Text mt={1} color="text.secondary" fontSize="sm" lineHeight="1.5" aria-live="polite">
                        <strong>{batch.valid_rows.toLocaleString()}</strong> ready to create ·{' '}
                        <strong>{(batch.invalid_rows + batch.duplicate_rows).toLocaleString()}</strong> excluded from this import.
                        Only rows marked ready will be saved.
                      </Text>
                    </Box>
                  </HStack>
                  {(batch.invalid_rows > 0 || batch.duplicate_rows > 0) && (
                    <Button
                      variant="outline"
                      minH="44px"
                      flexShrink={0}
                      onClick={handleDownloadErrors}
                      loading={downloading}
                    >
                      <LuDownload aria-hidden="true" /> Download Correction Report
                    </Button>
                  )}
                </Flex>

                <SimpleGrid
                  columns={{ base: 2, lg: 4 }}
                  gap={0}
                  mt={5}
                  borderWidth="1px"
                  borderColor="border"
                  borderRadius="md"
                  overflow="hidden"
                >
                  {[
                    { label: 'Rows checked', value: batch.total_rows, color: 'text.primary', detail: 'All source rows' },
                    { label: 'Ready', value: batch.valid_rows, color: 'green.700', detail: 'Will be created' },
                    { label: 'Corrections', value: batch.invalid_rows, color: 'red.700', detail: 'Needs source edits' },
                    { label: 'Duplicates', value: batch.duplicate_rows, color: 'orange.800', detail: 'Already recorded' },
                  ].map((item, index) => (
                    <Box
                      key={item.label}
                      p={{ base: 3, md: 4 }}
                      bg="surface.muted"
                      borderRightWidth={{ base: index % 2 === 0 ? '1px' : 0, lg: index < 3 ? '1px' : 0 }}
                      borderBottomWidth={{ base: index < 2 ? '1px' : 0, lg: 0 }}
                      borderColor="border"
                    >
                      <Text color="text.muted" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.03em">{item.label}</Text>
                      <Text color={item.color} fontSize="2xl" fontWeight="700" lineHeight="1.2" mt={1} fontVariantNumeric="tabular-nums">
                        {item.value.toLocaleString()}
                      </Text>
                      <Text color="text.secondary" fontSize="xs" mt={1}>{item.detail}</Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </Card.Body>
            </Card.Root>

            <Box>
              <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} mb={3}>
                <Box maxW="680px">
                  <Heading size="sm">Validation results</Heading>
                  <Text color="text.muted" fontSize="sm" mt={1} lineHeight="1.5">
                    Every result stays tied to its exact source row, recognized person, import decision, and field-level finding.
                  </Text>
                </Box>
                <Badge variant="outline" color="text.secondary" px={2.5} py={1.5} borderRadius="md">
                  {rowMeta.totalItems.toLocaleString()} source rows
                </Badge>
              </Flex>
              <ImportValidationTable
                rows={rows}
                loading={loadingRows || validating}
                pagination={rowMeta}
                onPageChange={(page) => setRowMeta((current) => ({ ...current, page }))}
              />
            </Box>

            <Flex justify="space-between" direction={{ base: 'column-reverse', sm: 'row' }} gap={3}>
              <Button variant="outline" minH="44px" onClick={() => navigate('/imports')}>Back to History</Button>
              <Button
                colorPalette="green"
                minH="44px"
                onClick={() => setConfirmOpen(true)}
                disabled={batch.valid_rows < 1}
              >
                <LuCheck aria-hidden="true" /> Import {batch.valid_rows.toLocaleString()} Ready Rows
              </Button>
            </Flex>
          </VStack>
        )}

        {currentStep === 2 && completed && (
          <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={{ base: 6, md: 10 }} textAlign="center">
              <VStack maxW="620px" mx="auto" gap={5}>
                <Flex boxSize="72px" borderRadius="full" align="center" justify="center" bg="green.100" color="green.700">
                  <LuCircleCheck size={38} aria-hidden="true" />
                </Flex>
                <Box>
                  <Heading size="lg">Import complete</Heading>
                  <Text color="text.secondary" mt={3}>
                    {completed.imported_count.toLocaleString()} {activeRegistry.shortLabel.toLowerCase()} records were added to {batch?.barangay_name ?? 'the selected barangay'}.
                  </Text>
                </Box>
                <SimpleGrid columns={3} gap={3} width="full">
                  <Box p={4} bg="green.50" borderRadius="md"><Text fontWeight="700" fontSize="2xl">{completed.imported_count}</Text><Text fontSize="sm">Imported</Text></Box>
                  <Box p={4} bg="red.50" borderRadius="md"><Text fontWeight="700" fontSize="2xl">{completed.invalid_rows}</Text><Text fontSize="sm">Invalid</Text></Box>
                  <Box p={4} bg="orange.50" borderRadius="md"><Text fontWeight="700" fontSize="2xl">{completed.duplicate_rows}</Text><Text fontSize="sm">Duplicates</Text></Box>
                </SimpleGrid>
                <Flex gap={3} wrap="wrap" justify="center" width="full">
                  <Button colorPalette="green" minH="44px" onClick={() => navigate(activeRegistry.destination)}>View {activeRegistry.label}</Button>
                  <Button variant="outline" minH="44px" onClick={() => navigate('/imports')}>Import History</Button>
                  <Button variant="ghost" minH="44px" onClick={() => void resetImport()}><LuRefreshCw /> New Import</Button>
                </Flex>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={({ open }) => setConfirmOpen(open)}
        title={`Import validated ${activeRegistry.shortLabel.toLowerCase()} records?`}
        description={`This will create ${batch?.valid_rows.toLocaleString() ?? 0} ${activeRegistry.shortLabel.toLowerCase()} records for ${batch?.barangay_name ?? 'the selected barangay'}. Invalid and duplicate rows will remain skipped.`}
        confirmLabel="Confirm Import"
        onConfirm={handleCommit}
      />
    </DashboardLayout>
  );
};

export default ImportPage;
