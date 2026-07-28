import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Circle,
  Dialog,
  Field,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  Portal,
  SimpleGrid,
  Skeleton,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import {
  LuArchive,
  LuArchiveRestore,
  LuArrowLeft,
  LuBriefcaseBusiness,
  LuCheck,
  LuClock3,
  LuGraduationCap,
  LuHistory,
  LuMapPin,
  LuPencil,
  LuRotateCcw,
  LuSend,
  LuShieldCheck,
  LuUndo2,
  LuUserRound,
  LuUsersRound,
  LuVote,
  LuX,
} from 'react-icons/lu';
import { type RootState } from '../../../../redux/store';
import { youthRecordApi, type YouthRecordDetail, type AuditLog } from '../../infrastructure/youth-record-api';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { StatusBadge } from '../../../../shared/components/StatusBadge';
import { showToast } from '../../../../shared/toast';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { getYouthRecordActions } from '../youth-record-actions';

type WorkflowAction = 'submit' | 'approve' | 'archive' | 'restore';

const DetailField = ({ label, value }: { label: string; value?: ReactNode }) => {
  const missing = value === undefined || value === null || value === '';
  return (
    <Box minW={0}>
      <Text fontSize="xs" color="text.muted" fontWeight="700" textTransform="uppercase" letterSpacing="0.04em" mb={1}>
        {label}
      </Text>
      <Text color={missing ? 'text.muted' : 'text.primary'} fontWeight={missing ? '400' : '600'} fontStyle={missing ? 'italic' : 'normal'} lineHeight="1.5" overflowWrap="anywhere">
        {missing ? 'Not provided' : value}
      </Text>
    </Box>
  );
};

const DetailSection = ({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) => (
  <Card.Root bg="white" borderWidth="1px" borderColor="border" borderRadius="lg" boxShadow="panel" height="full">
    <Card.Header pb={3}>
      <HStack gap={3}>
        <Box display="grid" placeItems="center" boxSize="40px" flexShrink={0} bg="primary.50" color="primary.700" borderRadius="md" aria-hidden="true">
          {icon}
        </Box>
        <Heading as="h2" size="sm" color="text.primary">{title}</Heading>
      </HStack>
    </Card.Header>
    <Card.Body pt={2}>{children}</Card.Body>
  </Card.Root>
);

const formatDetailValue = (value: unknown) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value === null || value === undefined ? '' : String(value);
};

const normalizeFieldIdentity = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const coreCustomValueKeys = new Set([
  'category_id',
  'barangay_id',
  'display_name',
  'first_name',
  'middle_name',
  'last_name',
  'suffix',
  'ext_name',
  'birth_date',
  'age_at_submission',
  'sex_assigned_at_birth_id',
  'sex_id',
  'civil_status_id',
  'youth_classification_id',
  'youth_age_group_id',
  'educational_attainment_id',
  'work_status_id',
  'email',
  'contact_number',
  'purok',
  'is_registered_voter',
  'is_registered_sk_voter',
  'is_registered_national_voter',
  'voted_last_election',
  'attended_kk_assembly',
  'kk_assembly_count',
].map(normalizeFieldIdentity));

const visibleCustomValues = (values: Record<string, unknown>) => (
  Object.entries(values).filter(([key]) => !coreCustomValueKeys.has(normalizeFieldIdentity(key)))
);

const formatDate = (value?: string | null) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date(value.length === 10 ? `${value}T00:00:00+08:00` : value));
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
};

const yesNo = (value: boolean | null | undefined) => (
  value === true ? 'Yes' : value === false ? 'No' : ''
);

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('');

const formatAction = (action: string) => action
  .toLowerCase()
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const formatFieldLabel = (key: string) => key
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

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
  const [pendingAction, setPendingAction] = useState<WorkflowAction | null>(null);

  const loadData = async () => {
    if (!recordId) return;
    try {
      const [recordResponse, historyResponse] = await Promise.all([
        youthRecordApi.getById(recordId),
        youthRecordApi.getHistory(recordId),
      ]);
      setRecord(recordResponse.data);
      setHistory(historyResponse.data);
    } catch (error) {
      showToast.error({
        title: 'Youth record could not be loaded',
        description: error instanceof Error ? error.message : 'Return to the list and try again.',
      });
      navigate('/youth-records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [recordId]);

  const handleAction = async (action: WorkflowAction) => {
    if (!recordId) return;
    setActionLoading(true);
    try {
      await youthRecordApi[action](recordId);
      const successMessage = {
        submit: 'Record submitted for review',
        approve: 'Record approved',
        archive: 'Record archived',
        restore: 'Record restored as a draft',
      }[action];
      showToast.success(successMessage);
      await loadData();
    } catch (error) {
      showToast.error({
        title: `Could not ${action} record`,
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!recordId || !returnReason.trim()) return;
    setActionLoading(true);
    try {
      await youthRecordApi.returnRecord(recordId, returnReason.trim());
      showToast.success('Record returned for correction');
      setReturnDialogOpen(false);
      setReturnReason('');
      await loadData();
    } catch (error) {
      showToast.error({
        title: 'Record could not be returned',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !record) {
    return (
      <DashboardLayout>
        <PageHeader title="Youth Record Details" description="Loading profile information and workflow history." />
        <Card.Root borderWidth="1px" borderColor="border" borderRadius="lg">
          <Card.Body p={{ base: 5, md: 8 }}>
            <HStack gap={4} align="center">
              <Skeleton boxSize={{ base: '56px', md: '72px' }} borderRadius="full" />
              <VStack align="stretch" gap={2} flex="1">
                <Skeleton height="24px" maxW="320px" />
                <Skeleton height="16px" maxW="480px" />
              </VStack>
            </HStack>
          </Card.Body>
        </Card.Root>
      </DashboardLayout>
    );
  }

  const { canEdit, canSubmit, canReview, canArchive, canRestore } = getYouthRecordActions(record.status, isAdmin);
  const categoryName = record.category_name ?? record.category?.name ?? 'Unassigned category';
  const filingYear = record.category_filing_year ?? record.category?.filing_year;
  const barangayName = record.barangay_name ?? record.barangay?.name ?? '';
  const municipalityName = record.municipality_name ?? record.barangay?.municipality ?? '';
  const provinceName = record.province_name ?? record.barangay?.province ?? '';
  const customValues = visibleCustomValues(record.custom_values ?? {});

  return (
    <DashboardLayout>
      <PageHeader
        title="Youth Record Details"
        description="Review personal information, update the profile, and manage its workflow status."
        actions={(
          <>
            <Button variant="ghost" onClick={() => navigate('/youth-records')} disabled={actionLoading} width={{ base: 'full', sm: 'auto' }}>
              <LuArrowLeft aria-hidden="true" /> Back to Records
            </Button>
            {canEdit && (
              <Button variant="outline" colorPalette="green" onClick={() => navigate(`/youth-records/${record.id}/edit`)} disabled={actionLoading} width={{ base: 'full', sm: 'auto' }}>
                <LuPencil aria-hidden="true" /> Edit Information
              </Button>
            )}
            {canSubmit && (
              <Button colorPalette="green" onClick={() => setPendingAction('submit')} disabled={actionLoading} width={{ base: 'full', sm: 'auto' }}>
                <LuSend aria-hidden="true" /> Submit for Review
              </Button>
            )}
            {isAdmin && record.status === 'SUBMITTED' && (
              <>
                <Button variant="outline" colorPalette="orange" onClick={() => setReturnDialogOpen(true)} disabled={actionLoading} width={{ base: 'full', sm: 'auto' }}>
                  <LuUndo2 aria-hidden="true" /> Return
                </Button>
              </>
            )}
            {canReview && (
              <>
                <Button colorPalette="green" onClick={() => setPendingAction('approve')} disabled={actionLoading} width={{ base: 'full', sm: 'auto' }}>
                  <LuCheck aria-hidden="true" /> Approve
                </Button>
              </>
            )}
            {canArchive && (
              <Button variant="outline" colorPalette="red" onClick={() => setPendingAction('archive')} disabled={actionLoading} width={{ base: 'full', sm: 'auto' }}>
                <LuArchive aria-hidden="true" /> Archive
              </Button>
            )}
            {canRestore && (
              <Button colorPalette="green" onClick={() => setPendingAction('restore')} disabled={actionLoading} width={{ base: 'full', sm: 'auto' }}>
                <LuArchiveRestore aria-hidden="true" /> Restore Record
              </Button>
            )}
          </>
        )}
      />

      {record.status === 'RETURNED' && (
        <Alert.Root status="warning" mb={5} borderRadius="lg" borderWidth="1px" borderColor="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Corrections requested</Alert.Title>
            <Alert.Description>
              {record.return_reason || 'Review the record history, edit the information, and submit it again.'}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {record.status === 'ARCHIVED' && (
        <Alert.Root status="info" mb={5} borderRadius="lg" borderWidth="1px" borderColor="border.strong">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>This record is archived</Alert.Title>
            <Alert.Description>Restore it as a draft before editing or submitting it again.</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      <Card.Root bg="white" borderWidth="1px" borderColor="border" borderTopWidth="4px" borderTopColor="primary.600" borderRadius="lg" boxShadow="panel" mb={5}>
        <Card.Body p={{ base: 5, md: 7 }}>
          <Flex direction={{ base: 'column', lg: 'row' }} gap={{ base: 6, lg: 8 }} justify="space-between" align={{ base: 'stretch', lg: 'center' }}>
            <HStack gap={{ base: 4, md: 5 }} align="center" minW={0}>
              <Circle size={{ base: '60px', md: '76px' }} flexShrink={0} bg="primary.100" color="primary.800" fontFamily="heading" fontSize={{ base: 'lg', md: 'xl' }} fontWeight="800" aria-hidden="true">
                {initials(record.display_name) || 'YR'}
              </Circle>
              <Box minW={0}>
                <HStack gap={3} wrap="wrap" mb={2}>
                  <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }} lineHeight="1.25" overflowWrap="anywhere">
                    {record.display_name}
                  </Heading>
                  <StatusBadge status={record.status} />
                </HStack>
                <HStack gap={4} wrap="wrap" color="text.secondary" fontSize="sm">
                  <HStack gap={1.5}>
                    <LuMapPin aria-hidden="true" />
                    <Text>{barangayName || 'Barangay not provided'}</Text>
                  </HStack>
                  <HStack gap={1.5}>
                    <LuShieldCheck aria-hidden="true" />
                    <Text>{categoryName}</Text>
                  </HStack>
                </HStack>
              </Box>
            </HStack>

            <SimpleGrid columns={{ base: 2, sm: 3 }} gap={3} minW={{ lg: '360px' }}>
              <Box p={3} bg="surface.muted" borderRadius="md" borderWidth="1px" borderColor="border">
                <Text fontSize="xs" color="text.muted" fontWeight="700" textTransform="uppercase">Age</Text>
                <Text fontSize="xl" fontWeight="800" fontFamily="heading">{record.age_at_submission ?? '—'}</Text>
              </Box>
              <Box p={3} bg="surface.muted" borderRadius="md" borderWidth="1px" borderColor="border">
                <Text fontSize="xs" color="text.muted" fontWeight="700" textTransform="uppercase">Filing Year</Text>
                <Text fontSize="xl" fontWeight="800" fontFamily="heading">{filingYear ?? '—'}</Text>
              </Box>
              <Box p={3} bg="surface.muted" borderRadius="md" borderWidth="1px" borderColor="border" gridColumn={{ base: '1 / -1', sm: 'auto' }}>
                <Text fontSize="xs" color="text.muted" fontWeight="700" textTransform="uppercase">Version</Text>
                <Text fontSize="xl" fontWeight="800" fontFamily="heading">{record.version}</Text>
              </Box>
            </SimpleGrid>
          </Flex>
        </Card.Body>
      </Card.Root>

      <SimpleGrid columns={{ base: 1, xl: 2 }} gap={5} alignItems="stretch">
        <DetailSection title="Personal Information" icon={<LuUserRound size={20} />}>
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }} gap={5}>
            <DetailField label="First Name" value={record.first_name} />
            <DetailField label="Middle Name" value={record.middle_name} />
            <DetailField label="Last Name" value={record.last_name} />
            <DetailField label="Suffix" value={record.suffix} />
            <DetailField label="Birth Date" value={formatDate(record.birth_date)} />
            <DetailField label="Age for Filing Year" value={record.age_at_submission} />
          </Grid>
        </DetailSection>

        <DetailSection title="Youth Classification" icon={<LuUsersRound size={20} />}>
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }} gap={5}>
            <DetailField label="Sex Assigned at Birth" value={record.sex_label} />
            <DetailField label="Civil Status" value={record.civil_status_label} />
            <DetailField label="Youth Classification" value={record.youth_classification_label} />
            <DetailField label="Youth Age Group" value={record.youth_age_group_label} />
          </Grid>
        </DetailSection>

        <DetailSection title="Contact & Location" icon={<LuMapPin size={20} />}>
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }} gap={5}>
            <DetailField label="Email Address" value={record.email} />
            <DetailField label="Contact Number" value={record.contact_number} />
            <DetailField label="Barangay" value={barangayName} />
            <DetailField label="Municipality" value={municipalityName} />
            <DetailField label="Province" value={provinceName} />
            <DetailField label="Category" value={categoryName} />
          </Grid>
        </DetailSection>

        <DetailSection title="Education & Employment" icon={<LuGraduationCap size={20} />}>
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }} gap={5}>
            <DetailField label="Highest Educational Attainment" value={record.educational_attainment_label} />
            <DetailField label="Work Status" value={record.work_status_label} />
          </Grid>
        </DetailSection>

        <DetailSection title="Civic Participation" icon={<LuVote size={20} />}>
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }} gap={5}>
            <DetailField label="Registered Voter" value={yesNo(record.is_registered_voter)} />
            <DetailField label="Voted Last Election" value={yesNo(record.voted_last_election)} />
            <DetailField label="Attended KK Assembly" value={yesNo(record.attended_kk_assembly)} />
            <DetailField label="KK Assembly Count" value={record.attended_kk_assembly ? record.kk_assembly_count ?? 0 : 0} />
          </Grid>
        </DetailSection>

        <DetailSection title="Record Information" icon={<LuClock3 size={20} />}>
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }} gap={5}>
            <DetailField label="Created" value={formatDateTime(record.created_at)} />
            <DetailField label="Last Updated" value={formatDateTime(record.updated_at)} />
            <DetailField label="Submitted" value={formatDateTime(record.submitted_at)} />
            <DetailField label="Approved" value={formatDateTime(record.approved_at)} />
          </Grid>
        </DetailSection>
      </SimpleGrid>

      {customValues.length > 0 && (
        <Box mt={5}>
          <DetailSection title="Additional Category Fields" icon={<LuBriefcaseBusiness size={20} />}>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap={5}>
              {customValues.map(([key, value]) => (
                <DetailField key={key} label={formatFieldLabel(key)} value={formatDetailValue(value)} />
              ))}
            </Grid>
          </DetailSection>
        </Box>
      )}

      <Card.Root bg="white" borderWidth="1px" borderColor="border" borderRadius="lg" boxShadow="panel" mt={5}>
        <Card.Header pb={3}>
          <HStack gap={3}>
            <Box display="grid" placeItems="center" boxSize="40px" bg="primary.50" color="primary.700" borderRadius="md" aria-hidden="true">
              <LuHistory size={20} />
            </Box>
            <Box>
              <Heading as="h2" size="sm">Record History</Heading>
              <Text fontSize="sm" color="text.muted" mt={1}>Newest activity appears first.</Text>
            </Box>
          </HStack>
        </Card.Header>
        <Card.Body pt={2}>
          {history.length === 0 ? (
            <Box py={8} textAlign="center" bg="surface.muted" borderRadius="md">
              <LuHistory size={24} aria-hidden="true" />
              <Text color="text.secondary" mt={2}>No history is available for this record yet.</Text>
            </Box>
          ) : (
            <VStack align="stretch" gap={0}>
              {history.map((log, index) => (
                <Flex key={log.id} gap={4} position="relative" pb={index === history.length - 1 ? 0 : 5}>
                  <VStack gap={0} flexShrink={0} aria-hidden="true">
                    <Circle size="32px" bg="primary.50" color="primary.700">
                      <LuHistory size={15} />
                    </Circle>
                    {index < history.length - 1 && <Box width="2px" flex="1" minH="32px" bg="border" />}
                  </VStack>
                  <Box flex="1" minW={0} pt={1}>
                    <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} gap={2} direction={{ base: 'column', sm: 'row' }}>
                      <Badge colorPalette="green" variant="subtle">{formatAction(log.action)}</Badge>
                      <Text fontSize="xs" color="text.muted">{formatDateTime(log.created_at)}</Text>
                    </Flex>
                    <Text fontSize="sm" color="text.secondary" mt={2}>
                      <Text as="span" color="text.primary" fontWeight="700">{log.actor_name || 'System user'}</Text> performed this action.
                    </Text>
                    {log.details?.reason && (
                      <Box mt={2} p={3} bg="warning.light" borderRadius="md" borderLeftWidth="3px" borderColor="warning">
                        <Text fontSize="sm" color="text.secondary"><Text as="span" fontWeight="700">Reason:</Text> {String(log.details.reason)}</Text>
                      </Box>
                    )}
                  </Box>
                </Flex>
              ))}
            </VStack>
          )}
        </Card.Body>
      </Card.Root>

      <Dialog.Root open={returnDialogOpen} onOpenChange={({ open }) => { if (!actionLoading) setReturnDialogOpen(open); }}>
        <Portal>
          <Dialog.Backdrop bg="rgba(0, 0, 0, 0.58)" backdropFilter="blur(2px)" zIndex={1400} />
          <Dialog.Positioner zIndex={1500} p={{ base: 4, sm: 6 }}>
            <Dialog.Content width="full" maxW="480px" maxH="calc(100dvh - 32px)" overflowY="auto" bg="white" borderRadius="lg" borderWidth="1px" borderColor="border.strong" boxShadow="0 24px 64px rgba(0, 0, 0, 0.24)">
              <Dialog.Header>
                <Dialog.Title>Return Record for Correction</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text color="text.secondary" mb={4}>Explain exactly what needs to be corrected. This reason will appear in the record history.</Text>
                <Field.Root required>
                  <Field.Label>Return reason</Field.Label>
                  <Textarea
                    value={returnReason}
                    onChange={(event) => setReturnReason(event.target.value)}
                    placeholder="Example: Verify the birth date and contact number."
                    rows={5}
                    minH="120px"
                    disabled={actionLoading}
                  />
                </Field.Root>
              </Dialog.Body>
              <Dialog.Footer flexDirection={{ base: 'column-reverse', sm: 'row' }} gap={3}>
                <Button width={{ base: 'full', sm: 'auto' }} variant="outline" onClick={() => setReturnDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
                <Button width={{ base: 'full', sm: 'auto' }} colorPalette="orange" onClick={handleReturn} disabled={!returnReason.trim()} loading={actionLoading}>
                  <LuRotateCcw aria-hidden="true" /> Return Record
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <IconButton aria-label="Close return dialog" variant="ghost" size="sm" position="absolute" top={3} right={3} disabled={actionLoading}>
                  <LuX aria-hidden="true" />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={!!pendingAction}
        onOpenChange={({ open }) => { if (!open) setPendingAction(null); }}
        title={{
          submit: 'Submit this record?',
          approve: 'Approve this record?',
          archive: 'Archive this record?',
          restore: 'Restore this record?',
        }[pendingAction ?? 'submit']}
        description={{
          submit: 'The record will be locked for SK editing while an administrator reviews it.',
          approve: 'This confirms that the youth profile has been reviewed and is ready for official reporting.',
          archive: 'The record will leave active workflows but remain available in the archive and audit history.',
          restore: 'The record will return as a draft so its information can be edited and submitted again.',
        }[pendingAction ?? 'submit']}
        confirmLabel={{ submit: 'Submit for Review', approve: 'Approve Record', archive: 'Archive Record', restore: 'Restore as Draft' }[pendingAction ?? 'submit']}
        variant={pendingAction === 'archive' ? 'danger' : 'default'}
        onConfirm={() => pendingAction ? handleAction(pendingAction) : undefined}
      />
    </DashboardLayout>
  );
};

export default YouthRecordDetailPage;
