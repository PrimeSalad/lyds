import type { YouthRecordStatus } from '../infrastructure/youth-record-api';

export type YouthRecordActions = {
  canEdit: boolean;
  canSubmit: boolean;
  canReview: boolean;
  canArchive: boolean;
  canRestore: boolean;
};

export const getYouthRecordActions = (
  status: YouthRecordStatus,
  isAdmin: boolean,
): YouthRecordActions => ({
  canEdit: status !== 'ARCHIVED' && (isAdmin || status === 'DRAFT' || status === 'RETURNED'),
  canSubmit: status === 'DRAFT' || status === 'RETURNED',
  canReview: isAdmin && (status === 'SUBMITTED' || status === 'DRAFT'),
  canArchive: isAdmin && status !== 'ARCHIVED',
  canRestore: isAdmin && status === 'ARCHIVED',
});
