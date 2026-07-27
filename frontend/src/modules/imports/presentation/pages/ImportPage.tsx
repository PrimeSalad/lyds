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
import { DataTable, type Column } from '../../../../shared/tables/DataTable';
import { showToast } from '../../../../shared/toast';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import { categoryApi, type Category } from '../../../categories/infrastructure/category-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import {
  importApi,
  type CommitImportResult,
  type ImportBatch,
  type ImportRow,
  type PaginationMeta,
} from '../../infrastructure/import-api';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.xlsx', '.csv'];
const steps = ['Set up', 'Review', 'Complete'];

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

const rowName = (row: ImportRow) => {
  const normalized = String(row.normalized_data?.display_name ?? '').trim();
  if (normalized) return normalized;
  const rawName = Object.entries(row.raw_data).find(([key]) => key.trim().toLowerCase() === 'name')?.[1];
  return String(rawName ?? 'Unnamed row');
};

const resultColor = (row: ImportRow) => row.is_duplicate ? 'orange' : row.is_valid ? 'green' : 'red';
const resultLabel = (row: ImportRow) => row.is_duplicate ? 'Duplicate' : row.is_valid ? 'Ready' : 'Invalid';

const ImportPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';
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
      && category.record_type === 'YOUTH_PROFILE'
      && (isAdmin || ['SK_FILLABLE', 'PUBLIC'].includes(category.permission_mode))
    ))
    .sort((a, b) => (b.filing_year ?? 0) - (a.filing_year ?? 0)), [categories, isAdmin]);

  const currentStep = completed ? 2 : batch ? 1 : 0;

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
            && category.record_type === 'YOUTH_PROFILE'
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
  }, [isAdmin, profile?.barangayId]);

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
    showToast.success(`${response.data.imported_count.toLocaleString()} youth records imported`);
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

  const columns: Column<ImportRow>[] = [
    { key: 'row_number', header: 'Sheet row', width: '100px', sortable: true },
    { key: 'name', header: 'Youth name', width: '240px', render: rowName },
    {
      key: 'result',
      header: 'Result',
      width: '120px',
      render: (row) => <Badge colorPalette={resultColor(row)}>{resultLabel(row)}</Badge>,
    },
    {
      key: 'issues',
      header: 'Validation details',
      width: '460px',
      render: (row) => {
        const messages = [...(row.validation_errors ?? []), ...(row.validation_warnings ?? [])];
        return messages.length > 0
          ? <Text whiteSpace="normal" textAlign="left" lineHeight="1.5">{messages.join(' • ')}</Text>
          : <Text color="text.muted">No issues</Text>;
      },
    },
  ];

  return (
    <DashboardLayout>
      <Box maxW="1120px" mx="auto">
        <PageHeader
          title="Import Youth Records"
          description="Upload one barangay spreadsheet, review every issue, then import only clean and non-duplicate rows."
          actions={(
            <>
              <Button variant="outline" onClick={() => navigate('/imports')}>
                <LuArrowLeft aria-hidden="true" /> Import History
              </Button>
              <Button variant="outline" onClick={handleDownloadTemplate} loading={downloading}>
                <LuDownload aria-hidden="true" /> Download Template
              </Button>
            </>
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
            <IconButton aria-label="Dismiss error" variant="ghost" size="sm" onClick={() => setFormError(null)}>
              <LuX />
            </IconButton>
          </Alert.Root>
        )}

        {currentStep === 0 && (
          <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={{ base: 4, md: 7 }}>
              <VStack align="stretch" gap={6}>
                <Box>
                  <Heading size="md">1. Choose the destination</Heading>
                  <Text color="text.secondary" mt={2}>Age eligibility is calculated on December 31 of the selected filing year.</Text>
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
                  <Heading size="md">2. Add the spreadsheet</Heading>
                  <Text color="text.secondary" mt={2}>Official KK workbooks with title rows are supported. Maximum file size: 10 MB.</Text>
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

                <Alert.Root status="info" borderRadius="md" alignItems="flex-start">
                  <LuInfo aria-hidden="true" />
                  <Box>
                    <Alert.Title>Safe preview first</Alert.Title>
                    <Text mt={1}>No youth record is created until you review the results and confirm the import.</Text>
                  </Box>
                </Alert.Root>

                <Flex justify="flex-end">
                  <Button
                    colorPalette="green"
                    minH="44px"
                    minW={{ base: 'full', sm: '180px' }}
                    onClick={handleValidate}
                    loading={validating}
                    disabled={loadingContext}
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
                      {batch.barangay_name ?? 'Selected barangay'} · {batch.category_name ?? 'Youth Profile'}{batch.filing_year ? ` (${batch.filing_year})` : ''}
                    </Text>
                  </Box>
                  <Button variant="outline" minH="44px" onClick={() => void resetImport()}>
                    <LuRefreshCw aria-hidden="true" /> Choose Another File
                  </Button>
                </Flex>
              </Card.Body>
            </Card.Root>

            <SimpleGrid columns={{ base: 2, lg: 4 }} gap={3}>
              {[
                { label: 'Ready to import', value: batch.valid_rows, color: 'green' },
                { label: 'Invalid rows', value: batch.invalid_rows, color: 'red' },
                { label: 'Duplicates skipped', value: batch.duplicate_rows, color: 'orange' },
                { label: 'Total checked', value: batch.total_rows, color: 'blue' },
              ].map((item) => (
                <Card.Root key={item.label} borderColor="border" borderRadius="lg">
                  <Card.Body p={{ base: 4, md: 5 }}>
                    <Text color="text.muted" fontSize="sm">{item.label}</Text>
                    <Text color={`${item.color}.700`} fontSize={{ base: '2xl', md: '3xl' }} fontWeight="700" mt={1}>{item.value.toLocaleString()}</Text>
                  </Card.Body>
                </Card.Root>
              ))}
            </SimpleGrid>

            {(batch.invalid_rows > 0 || batch.duplicate_rows > 0) && (
              <Alert.Root status="warning" borderRadius="md" alignItems="flex-start">
                <LuTriangleAlert aria-hidden="true" />
                <Box flex="1">
                  <Alert.Title>{(batch.invalid_rows + batch.duplicate_rows).toLocaleString()} rows will be skipped</Alert.Title>
                  <Text mt={1}>Download the report for exact spreadsheet row numbers and correction details.</Text>
                </Box>
                <Button variant="outline" minH="44px" onClick={handleDownloadErrors} loading={downloading}>
                  <LuDownload aria-hidden="true" /> Error Report
                </Button>
              </Alert.Root>
            )}

            <Box>
              <HStack justify="space-between" align="flex-end" mb={3} wrap="wrap">
                <Box>
                  <Heading size="sm">Row-by-row results</Heading>
                  <Text color="text.muted" fontSize="sm" mt={1}>Spreadsheet row numbers are preserved for easy correction.</Text>
                </Box>
                <Text color="text.muted" fontSize="sm">{rowMeta.totalItems.toLocaleString()} rows</Text>
              </HStack>
              <DataTable
                columns={columns}
                data={rows}
                loading={loadingRows || validating}
                emptyMessage="No spreadsheet rows were found."
                variant="excel"
                pagination={{
                  page: rowMeta.page,
                  totalPages: rowMeta.totalPages,
                  totalItems: rowMeta.totalItems,
                  onPageChange: (page) => setRowMeta((current) => ({ ...current, page })),
                }}
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
                    {completed.imported_count.toLocaleString()} youth records were added to {batch?.barangay_name ?? 'the selected barangay'}.
                  </Text>
                </Box>
                <SimpleGrid columns={3} gap={3} width="full">
                  <Box p={4} bg="green.50" borderRadius="md"><Text fontWeight="700" fontSize="2xl">{completed.imported_count}</Text><Text fontSize="sm">Imported</Text></Box>
                  <Box p={4} bg="red.50" borderRadius="md"><Text fontWeight="700" fontSize="2xl">{completed.invalid_rows}</Text><Text fontSize="sm">Invalid</Text></Box>
                  <Box p={4} bg="orange.50" borderRadius="md"><Text fontWeight="700" fontSize="2xl">{completed.duplicate_rows}</Text><Text fontSize="sm">Duplicates</Text></Box>
                </SimpleGrid>
                <Flex gap={3} wrap="wrap" justify="center" width="full">
                  <Button colorPalette="green" minH="44px" onClick={() => navigate('/youth-records')}>View Youth Records</Button>
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
        title="Import validated youth records?"
        description={`This will create ${batch?.valid_rows.toLocaleString() ?? 0} submitted youth records for ${batch?.barangay_name ?? 'the selected barangay'}. Invalid and duplicate rows will remain skipped.`}
        confirmLabel="Confirm Import"
        onConfirm={handleCommit}
      />
    </DashboardLayout>
  );
};

export default ImportPage;
