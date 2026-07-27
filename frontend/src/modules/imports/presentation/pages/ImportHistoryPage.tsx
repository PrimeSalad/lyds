import { useEffect, useMemo, useState } from 'react';
import { Badge, Box, Button, Card, HStack, NativeSelect, SimpleGrid, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router';
import { LuPlus, LuUpload } from 'react-icons/lu';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { DataTable, type Action, type Column } from '../../../../shared/tables/DataTable';
import { showToast } from '../../../../shared/toast';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import {
  importApi,
  type ImportBatch,
  type ImportBatchStatus,
  type PaginationMeta,
} from '../../infrastructure/import-api';

const statusColor: Record<ImportBatchStatus, string> = {
  UPLOADING: 'blue',
  VALIDATING: 'blue',
  VALIDATED: 'orange',
  COMMITTING: 'blue',
  COMMITTED: 'green',
  FAILED: 'red',
  CANCELLED: 'gray',
};

const statusLabel: Record<ImportBatchStatus, string> = {
  UPLOADING: 'Uploading',
  VALIDATING: 'Checking',
  VALIDATED: 'Ready to review',
  COMMITTING: 'Importing',
  COMMITTED: 'Imported',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

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

const formatDate = (value: string) => new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(value));

const ImportHistoryPage = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [status, setStatus] = useState<ImportBatchStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });

  const summary = useMemo(() => {
    const counts = batches.reduce((acc, batch) => {
      acc.total += batch.total_rows;
      acc.ready += batch.valid_rows;
      acc.skipped += batch.invalid_rows + batch.duplicate_rows;
      if (batch.status === 'COMMITTED') acc.committed += 1;
      if (batch.status === 'VALIDATED') acc.readyToReview += 1;
      return acc;
    }, {
      total: 0,
      ready: 0,
      skipped: 0,
      committed: 0,
      readyToReview: 0,
    });

    return counts;
  }, [batches]);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const response = await importApi.list({ page, pageSize: 25, status: status || undefined });
        setBatches(response.data);
        setMeta(response.meta);
      } catch (error) {
        showToast.error({
          title: 'Import history could not be loaded',
          description: error instanceof Error ? error.message : 'Refresh the page and try again.',
        });
      } finally {
        setLoading(false);
      }
    };
    void loadHistory();
  }, [page, status]);

  const columns: Column<ImportBatch>[] = [
    {
      key: 'file_name',
      header: 'Spreadsheet',
      width: '260px',
      render: (batch) => (
        <Box textAlign="left">
          <Text fontWeight="700" overflow="hidden" textOverflow="ellipsis">{batch.file_name}</Text>
          <Text fontSize="xs" color="text.muted" mt={1}>{batch.uploaded_by_name ?? 'System user'}</Text>
        </Box>
      ),
    },
    {
      key: 'barangay_name',
      header: 'Destination',
      width: '220px',
      render: (batch) => (
        <Box>
          <Text fontWeight="600">{batch.barangay_name ?? '—'}</Text>
          <Text fontSize="xs" color="text.muted" mt={1}>{batch.category_name ?? 'Youth Profile'}{batch.filing_year ? ` · ${batch.filing_year}` : ''}</Text>
        </Box>
      ),
    },
    {
      key: 'total_rows',
      header: 'Rows',
      width: '160px',
      render: (batch) => (
        <Box>
          <Text fontWeight="700">{batch.total_rows.toLocaleString()} total</Text>
          <Text fontSize="xs" color="text.muted" mt={1}>{batch.valid_rows.toLocaleString()} ready · {(batch.invalid_rows + batch.duplicate_rows).toLocaleString()} skipped</Text>
        </Box>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '150px',
      align: 'center',
      render: (batch) => <Badge colorPalette={statusColor[batch.status]}>{statusLabel[batch.status]}</Badge>,
    },
    {
      key: 'created_at',
      header: 'Uploaded',
      width: '190px',
      render: (batch) => formatDate(batch.created_at),
    },
  ];

  const actions: Action<ImportBatch>[] = [
    {
      label: 'Review',
      show: (batch) => batch.status === 'VALIDATED',
      onClick: (batch) => navigate(`/imports/new?batchId=${batch.id}`),
    },
    {
      label: 'Error report',
      show: (batch) => batch.invalid_rows + batch.duplicate_rows > 0,
      onClick: async (batch) => {
        try {
          downloadBlob(
            await importApi.downloadErrorFile(batch.id),
            `import-errors-${batch.filing_year ?? batch.id}.xlsx`,
          );
        } catch (error) {
          showToast.error({
            title: 'Error report download failed',
            description: error instanceof Error ? error.message : 'Please try again.',
          });
        }
      },
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Import History"
        description="Track spreadsheet checks, resume pending reviews, and download correction reports."
        actions={(
          <Button colorPalette="green" onClick={() => navigate('/imports/new')}>
            <LuPlus aria-hidden="true" /> New Import
          </Button>
        )}
      />

      <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" mb={5}>
        <Card.Body p={{ base: 4, md: 5 }}>
          <SimpleGrid columns={{ base: 1, md: 4 }} gap={3} mb={4}>
            {[
              { label: 'Visible imports', value: meta.totalItems.toLocaleString(), tone: 'blue' },
              { label: 'Ready rows', value: summary.ready.toLocaleString(), tone: 'green' },
              { label: 'Skipped rows', value: summary.skipped.toLocaleString(), tone: 'orange' },
              { label: 'Ready to review', value: summary.readyToReview.toLocaleString(), tone: 'purple' },
            ].map((item) => (
              <Box key={item.label} p={4} borderRadius="md" bg="surface.muted" borderWidth="1px" borderColor="border">
                <Text color="text.muted" fontSize="sm">{item.label}</Text>
                <Text color={`${item.tone}.700`} fontSize="2xl" fontWeight="700" mt={1}>{item.value}</Text>
              </Box>
            ))}
          </SimpleGrid>

          <HStack gap={3} align="center" wrap="wrap">
            <LuUpload aria-hidden="true" />
            <Text fontWeight="600" fontSize="sm">Filter imports</Text>
            <NativeSelect.Root width={{ base: 'full', sm: '220px' }}>
              <NativeSelect.Field
                aria-label="Filter imports by status"
                minH="44px"
                value={status}
                onChange={(event) => { setStatus(event.target.value as ImportBatchStatus | ''); setPage(1); }}
              >
                <option value="">All statuses</option>
                {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
          <Text mt={3} color="text.muted" fontSize="sm" aria-live="polite">
            {loading ? 'Loading imports…' : `${meta.totalItems.toLocaleString()} import${meta.totalItems === 1 ? '' : 's'} found`}
          </Text>
        </Card.Body>
      </Card.Root>

      <DataTable
        columns={columns}
        data={batches}
        actions={actions}
        loading={loading}
        emptyMessage="No spreadsheet imports match this filter."
        pagination={{
          page: meta.page,
          totalPages: meta.totalPages,
          totalItems: meta.totalItems,
          onPageChange: setPage,
        }}
      />
    </DashboardLayout>
  );
};

export default ImportHistoryPage;
