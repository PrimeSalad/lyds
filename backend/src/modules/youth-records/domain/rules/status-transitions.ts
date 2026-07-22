import type { RecordStatus } from '../entities/youth-record';

export const canTransition = (from: RecordStatus, to: RecordStatus, role: 'ADMIN' | 'SK_OFFICIAL'): boolean => {
  if (role === 'ADMIN') {
    if (from === 'SUBMITTED' && to === 'RETURNED') return true;
    if (from === 'SUBMITTED' && to === 'APPROVED') return true;
    if (to === 'ARCHIVED') return true; // DRAFT/SUBMITTED/RETURNED/APPROVED -> ARCHIVED
    if (from === 'ARCHIVED' && to === 'DRAFT') return true;
  }

  // Any role can do these
  if (from === 'DRAFT' && to === 'SUBMITTED') return true;
  if (from === 'RETURNED' && to === 'SUBMITTED') return true;

  return false;
};
