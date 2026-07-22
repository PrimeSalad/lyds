import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Heading, Button, HStack, VStack, Grid, Text, Badge, Spinner, Textarea, Dialog } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { youthRecordApi, type YouthRecordDetail, type AuditLog } from '../../infrastructure/youth-record-api';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { SectionHeader } from '../../../../shared/components/SectionHeader';
import { StatusBadge } from '../../../../shared/components/StatusBadge';
import { showToast } from '../../../../shared/toast';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const DetailField = ({ label, value }: { label: string; value?: string | number | boolean }) => (
  <Box>
    <Text fontSize="sm" color="gray.500" mb={1}>{label}</Text>
    <Text fontWeight="500">{value !== undefined && value !== '' ? String(value) : '-'}</Text>
  </Box>
);

const YouthRecordDetailPage = () => {
  const navigate = useNavigate();
  const { recordId } = useParams();
  
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';

  const [record, setRecord] = useState<YouthRecordDetail | null>(null);
  const [history, setHistory] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  const loadData = async () => {
    if (!recordId) return;
    try {
      const [recRes, histRes] = await Promise.all([
        youthRecordApi.getById(recordId),
        youthRecordApi.getHistory(recordId)
      ]);
      setRecord(recRes.data);
      setHistory(histRes.data);
    } catch {
      showToast.error('Failed to load record');
      navigate('/youth-records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [recordId]);

  const handleAction = async (action: 'submit' | 'approve' | 'archive' | 'restore') => {
    if (!recordId) return;
    setActionLoading(true);
    try {
      await youthRecordApi[action](recordId);
      const successMessage = {
        submit: 'Record submitted successfully',
        approve: 'Record approved successfully',
        archive: 'Record archived successfully',
        restore: 'Record restored successfully',
      }[action];
      showToast.success(successMessage);
      loadData();
    } catch {
      showToast.error(`Failed to ${action} record`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!recordId || !returnReason.trim()) return;
    setActionLoading(true);
    try {
      await youthRecordApi.returnRecord(recordId, returnReason);
      showToast.success('Record returned successfully');
      setReturnDialogOpen(false);
      setReturnReason('');
      loadData();
    } catch {
      showToast.error('Failed to return record');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !record) {
    return (
      <DashboardLayout>
        <Box py={10} textAlign="center">
          <Spinner size="xl" color="green.600" />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={record.display_name}
        description="Review record details, workflow status, and history."
        actions={(
          <Button variant="ghost" onClick={() => navigate('/youth-records')}>
            Back to List
          </Button>
        )}
      />
      <Box mb={4}>
        <StatusBadge status={record.status} />
      </Box>

      {record.status === 'RETURNED' && (
        <Box bg="orange.50" borderLeft="4px solid" borderColor="orange.400" p={4} mb={6} borderRadius="md">
          <Text fontWeight="bold" color="orange.800" mb={1}>Record Returned</Text>
          <Text color="orange.700">Please review and update the record. Check history for details.</Text>
        </Box>
      )}

      <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="lg" border="1px solid" borderColor="border" mb={6}>
        <HStack gap={3} mb={6} wrap="wrap">
          {record.status === 'DRAFT' && (
            <>
              <Button colorPalette="blue" onClick={() => navigate(`/youth-records/${record.id}/edit`)}>Edit</Button>
              <Button colorPalette="green" onClick={() => handleAction('submit')} loading={actionLoading}>Submit</Button>
            </>
          )}
          {record.status === 'SUBMITTED' && isAdmin && (
            <>
              <Button colorPalette="green" onClick={() => handleAction('approve')} loading={actionLoading}>Approve</Button>
              <Button colorPalette="orange" onClick={() => setReturnDialogOpen(true)}>Return</Button>
            </>
          )}
          {record.status === 'RETURNED' && (
            <Button colorPalette="blue" onClick={() => navigate(`/youth-records/${record.id}/edit`)}>Edit</Button>
          )}
          {record.status === 'APPROVED' && isAdmin && (
            <Button colorPalette="gray" onClick={() => handleAction('archive')} loading={actionLoading}>Archive</Button>
          )}
          {record.status === 'ARCHIVED' && isAdmin && (
            <Button colorPalette="gray" variant="outline" onClick={() => handleAction('restore')} loading={actionLoading}>Restore</Button>
          )}
        </HStack>

        <SectionHeader>Personal Information</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
          <DetailField label="First Name" value={record.first_name} />
          <DetailField label="Middle Name" value={record.middle_name} />
          <DetailField label="Last Name" value={record.last_name} />
          <DetailField label="Suffix" value={record.suffix} />
        </Grid>

        <SectionHeader>Birthday & Age</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
          <DetailField label="Birth Date" value={record.birth_date ? new Date(record.birth_date).toLocaleDateString() : '-'} />
          <DetailField label="Age at Submission" value={record.age_at_submission} />
        </Grid>

        <SectionHeader>Youth Classification</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
          <DetailField label="Sex Assigned at Birth" value={record.sex_label || record.sex_assigned_at_birth_id || '-'} />
          <DetailField label="Civil Status" value={record.civil_status_label || record.civil_status_id || '-'} />
          <DetailField label="Youth Classification" value={record.youth_classification_label || record.youth_classification_id || '-'} />
          <DetailField label="Youth Age Group" value={record.youth_age_group_label} />
        </Grid>

        <SectionHeader>Contact Information</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
          <DetailField label="Email" value={record.email} />
          <DetailField label="Contact Number" value={record.contact_number} />
        </Grid>

        <SectionHeader>Education & Employment</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
          <DetailField label="Highest Educational Attainment" value={record.educational_attainment_label || record.educational_attainment_id || '-'} />
          <DetailField label="Work Status" value={record.work_status_label || record.work_status_id || '-'} />
        </Grid>

        <SectionHeader>Voter Participation</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
          <DetailField label="Registered Voter?" value={record.is_registered_voter ? 'Yes' : 'No'} />
          <DetailField label="Voted Last Election?" value={record.voted_last_election ? 'Yes' : 'No'} />
        </Grid>

        <SectionHeader>KK Assembly Attendance</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
          <DetailField label="Attended KK Assembly?" value={record.attended_kk_assembly ? 'Yes' : 'No'} />
          {record.attended_kk_assembly && (
            <DetailField label="How Many Times?" value={record.kk_assembly_count} />
          )}
        </Grid>
      </Box>

      <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="lg" border="1px solid" borderColor="border">
        <Heading size="md" mb={4} color="gray.700">Record History</Heading>
        {history.length === 0 ? (
          <Text color="gray.500">No history available.</Text>
        ) : (
          <VStack align="stretch" gap={4}>
            {history.map((log) => (
              <Box key={log.id} borderLeft="2px solid" borderColor="gray.200" pl={4} py={1}>
                <HStack justify="space-between" mb={1}>
                  <Badge colorPalette="gray">{log.action}</Badge>
                  <Text fontSize="xs" color="gray.500">{new Date(log.created_at).toLocaleString()}</Text>
                </HStack>
                <Text fontSize="sm">
                  <Text as="span" fontWeight="500">{log.actor_name || log.actor_id}</Text> performed this action.
                </Text>
                {log.details?.reason && (
                  <Text fontSize="sm" color="orange.600" mt={1}>Reason: {log.details.reason}</Text>
                )}
              </Box>
            ))}
          </VStack>
        )}
      </Box>

      <Dialog.Root open={returnDialogOpen} onOpenChange={(e) => setReturnDialogOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Return Record</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text mb={4}>Please provide a reason for returning this record to the user.</Text>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Missing middle name"
                rows={4}
              />
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
              <Button colorPalette="orange" onClick={handleReturn} disabled={!returnReason.trim()} loading={actionLoading}>Return Record</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

    </DashboardLayout>
  );
};

export default YouthRecordDetailPage;
