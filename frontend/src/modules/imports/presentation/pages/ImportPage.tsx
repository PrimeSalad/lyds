import { useEffect, useState, useRef } from 'react';
import { Box, Button, Card, Flex, Heading, Text, VStack, Input, Table, Badge, Spinner, Alert, HStack, NativeSelect } from '@chakra-ui/react';
import { useNavigate } from 'react-router';
import { LuCheck, LuUpload } from 'react-icons/lu';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import { showToast } from '../../../../shared/toast';
import { importApi, type ImportBatch, type ImportRow } from '../../infrastructure/import-api';
import { categoryApi, type Category } from '../../../categories/infrastructure/category-api';

const steps = ['Upload', 'Preview', 'Duplicates', 'Confirm'];

const readFileAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result ?? '');
    resolve(result.includes(',') ? result.split(',')[1] : result);
  };
  reader.onerror = () => reject(new Error('The selected file could not be read.'));
  reader.readAsDataURL(file);
});

const ImportPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    categoryApi.list()
      .then((response) => setCategories(response.data.filter((category) => category.status === 'PUBLISHED' && category.is_active)))
      .catch((error) => showToast.error({
        title: 'Could not load import categories',
        description: error instanceof Error ? error.message : 'Refresh the page and try again.',
      }))
      .finally(() => setCategoryLoading(false));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      if (!file || !categoryId) return;
      setIsLoading(true);
      try {
        const base64 = await readFileAsBase64(file);
        const result = await importApi.validate({
          categoryId,
          fileData: base64,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
        });
        setBatch(result.data);
        const rowsResult = await importApi.listRows(result.data.id, 1);
        setRows(rowsResult.data);
        setCurrentStep(1);
      } catch (error) {
        showToast.error({
          title: 'Import validation failed',
          description: error instanceof Error ? error.message : 'Check the file format and try again.',
        });
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await importApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'youth-record-import-template.xlsx';
      anchor.click();
      window.URL.revokeObjectURL(url);
      showToast.success('Import template downloaded');
    } catch (error) {
      showToast.error({
        title: 'Template download failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const handleConfirm = async () => {
    if (!batch) return;
    setIsLoading(true);
    try {
      await importApi.commit(batch.id);
      setIsLoading(false);
      showToast.success('Import committed successfully');
      navigate('/youth-records');
    } catch {
      setIsLoading(false);
      showToast.error('Failed to commit import');
    }
  };

  return (
    <DashboardLayout>
      <Box maxW="672px" mx="auto" pt={8}>
        <Heading size="lg" mb={8} textAlign="center">Import Youth Records</Heading>
        
        <Flex justify="space-between" mb={10} position="relative" gap={2} overflowX="auto" pb={2}>
          <Box position="absolute" top="12px" left="10%" right="10%" h="2px" bg="border" zIndex={0} />
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (
              <VStack key={step} zIndex={1}>
                <Flex
                  w="24px" h="24px" rounded="full" align="center" justify="center"
                  bg={isActive || isCompleted ? 'green.500' : 'white'}
                  border="2px solid"
                  borderColor={isActive || isCompleted ? 'green.500' : 'gray.300'}
                  color="white"
                  fontSize="xs"
                >
                  {isCompleted ? <LuCheck aria-hidden="true" /> : index + 1}
                </Flex>
                <Text fontSize="xs" color={isActive ? 'text.primary' : 'text.muted'} fontWeight={isActive ? '600' : '400'} whiteSpace="nowrap">
                  {step}
                </Text>
              </VStack>
            );
          })}
        </Flex>

        <Card.Root>
          <Card.Body p={6}>
            {isLoading ? (
              <Flex justify="center" align="center" py={12} direction="column">
                <Spinner size="xl" color="green.500" mb={4} />
                <Text>Processing file...</Text>
              </Flex>
            ) : (
              <>
                {currentStep === 0 && (
                  <VStack align="stretch">
                    <Box mb={4}>
                      <Text mb={2} fontWeight="medium">Select Category</Text>
                      <NativeSelect.Root disabled={categoryLoading || categories.length === 0}>
                        <NativeSelect.Field value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                          <option value="">{categoryLoading ? 'Loading categories...' : 'Select category'}</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Box>
                    <Box mb={4}>
                      <Text mb={2} fontWeight="medium">Upload File</Text>
                      <Box
                        border="2px dashed" borderColor={file ? 'primary.500' : 'border'} borderRadius="lg" p={8} textAlign="center"
                        bg={file ? 'primary.50' : 'surface.muted'} cursor="pointer" onClick={() => fileInputRef.current?.click()}
                      >
                        <Input type="file" hidden ref={fileInputRef} accept=".csv,.xlsx" onChange={handleFileSelect} />
                        {file ? (
                          <VStack>
                            <Text fontWeight="bold">{file.name}</Text>
                            <Text fontSize="sm" color="text.muted">{(file.size / 1024).toFixed(2)} KB</Text>
                            <Button size="sm" variant="ghost" colorPalette="red" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove</Button>
                          </VStack>
                        ) : (
                          <VStack gap={2}>
                            <LuUpload aria-hidden="true" />
                            <Text color="text.muted">Drop .xlsx or .csv here or click to browse</Text>
                          </VStack>
                        )}
                      </Box>
                    </Box>
                    <Box mb={6}>
                      <Button variant="ghost" colorPalette="blue" onClick={handleDownloadTemplate}>
                        Download Template
                      </Button>
                    </Box>
                    <Flex justify="flex-end">
                      <Button colorPalette="green" onClick={handleNext} disabled={!file || !categoryId}>Next</Button>
                    </Flex>
                  </VStack>
                )}

                {currentStep === 1 && batch && (
                  <VStack align="stretch">
                    <Heading size="sm" mb={4}>Validation Results</Heading>
                    <HStack mb={4} wrap="wrap">
                      <Badge colorPalette="blue">Total: {batch.total_rows}</Badge>
                      <Badge colorPalette="green">Valid: {batch.valid_rows}</Badge>
                      <Badge colorPalette="red">Invalid: {batch.invalid_rows}</Badge>
                      <Badge colorPalette="orange">Duplicates: {batch.duplicate_rows}</Badge>
                    </HStack>
                    <Box maxH="384px" overflowY="auto" border="1px solid" borderColor="gray.200" borderRadius="md" mb={6}>
                      <Table.Root size="sm">
                        <Table.Header>
                          <Table.Row>
                            <Table.Cell>Row #</Table.Cell>
                            <Table.Cell>Status</Table.Cell>
                            <Table.Cell>Errors</Table.Cell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {rows.map((row) => (
                            <Table.Row key={row.id}>
                              <Table.Cell>{row.row_number}</Table.Cell>
                              <Table.Cell>
                                {row.is_valid ? <Badge colorPalette="green">Valid</Badge> : <Badge colorPalette="red">Invalid</Badge>}
                              </Table.Cell>
                              <Table.Cell>
                                {row.validation_errors?.join(', ') || '-'}
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    </Box>
                    <Flex justify="space-between">
                      <Button variant="outline" onClick={() => setCurrentStep(0)}>Back</Button>
                      <Button colorPalette="green" onClick={handleNext}>Next</Button>
                    </Flex>
                  </VStack>
                )}

                {currentStep === 2 && batch && (
                  <VStack align="stretch">
                    <Heading size="sm" mb={2}>Resolve Duplicates</Heading>
                    <Text color="gray.600" mb={4}>Review potential duplicate records before importing.</Text>
                    {batch?.duplicate_rows > 0 ? (
                      <Alert.Root status="warning" mb={6}>
                        <Alert.Title>Found {batch.duplicate_rows} potential duplicates</Alert.Title>
                      </Alert.Root>
                    ) : (
                      <Text color="green.600" mb={6}>No duplicates found.</Text>
                    )}
                    <Flex justify="space-between">
                      <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
                      <Button colorPalette="green" onClick={handleNext}>Next</Button>
                    </Flex>
                  </VStack>
                )}

                {currentStep === 3 && batch && (
                  <VStack align="stretch">
                    <Heading size="sm" mb={4}>Confirm Import</Heading>
                    <Text mb={6}>
                      You are about to import <strong>{batch?.valid_rows}</strong> valid records. 
                      Invalid rows will be skipped.
                    </Text>
                    <Flex justify="space-between">
                      <Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
                      <Button colorPalette="green" onClick={handleConfirm}>Confirm Import</Button>
                    </Flex>
                  </VStack>
                )}
              </>
            )}
          </Card.Body>
        </Card.Root>
      </Box>
    </DashboardLayout>
  );
};

export default ImportPage;
