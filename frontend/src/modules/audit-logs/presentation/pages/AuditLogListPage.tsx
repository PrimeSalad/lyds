import { useState, useEffect } from 'react';
import { Heading, Badge, Text, VStack } from '@chakra-ui/react';
import { DataTable, type Column } from '../../../../shared/tables/DataTable';
import { auditLogApi, type AuditLog } from '../../infrastructure/audit-log-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const actionColors: Record<string, string> = {
  ACCOUNT_CREATED: 'green',
  ACCOUNT_UPDATED: 'blue',
  ACCOUNT_ACTIVATED: 'green',
  ACCOUNT_DEACTIVATED: 'red',
  BARANGAY_ASSIGNED: 'purple',
  CATEGORY_CREATED: 'green',
  CATEGORY_UPDATED: 'blue',
  YOUTH_RECORD_CREATED: 'green',
  YOUTH_RECORD_UPDATED: 'blue',
  YOUTH_RECORD_SUBMITTED: 'teal',
  YOUTH_RECORD_RETURNED: 'orange',
  YOUTH_RECORD_APPROVED: 'green',
  YOUTH_RECORD_ARCHIVED: 'gray',
};

const AuditLogListPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadLogs = async (p: number) => {
    try {
      const result = await auditLogApi.list({ page: p, pageSize: 25 });
      setLogs(result.data);
      setTotalPages(result.meta.totalPages);
      setTotalItems(result.meta.totalItems);
    } catch {
      // Toast would be nice but we keep it simple
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(page);
  }, [page]);

  const columns: Column<AuditLog>[] = [
    {
      key: 'created_at',
      header: 'Time',
      render: (row) => new Date(row.created_at).toLocaleString(),
      width: '180px',
    },
    {
      key: 'actor_role',
      header: 'Actor',
      render: (row) => (
        <VStack align="start" gap={0}>
          <Text fontSize="sm">{row.actor_profile_id?.slice(0, 8) ?? 'System'}</Text>
          {row.actor_role && <Badge size="xs">{row.actor_role}</Badge>}
        </VStack>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <Badge colorPalette={(actionColors[row.action] ?? 'gray') as 'green'}>
          {row.action}
        </Badge>
      ),
    },
    {
      key: 'entity_type',
      header: 'Entity',
      render: (row) => (
        <VStack align="start" gap={0}>
          <Text fontSize="sm">{row.entity_type}</Text>
          {row.entity_id && <Text fontSize="xs" color="text.muted">{row.entity_id.slice(0, 8)}...</Text>}
        </VStack>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Heading size="lg" mb={6}>Audit Logs</Heading>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyMessage="No audit logs found."
        pagination={{
          page,
          totalPages,
          totalItems,
          onPageChange: setPage,
        }}
      />
    </DashboardLayout>
  );
};

export default AuditLogListPage;
