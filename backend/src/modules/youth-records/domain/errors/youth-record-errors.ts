export const YouthRecordErrors = {
  NOT_FOUND: { status: 404, code: 'RECORD_NOT_FOUND', message: 'Youth record not found.' },
  INVALID_STATUS_TRANSITION: (from: string, to: string) => ({ status: 409, code: 'INVALID_STATUS_TRANSITION', message: `Cannot transition record from ${from} to ${to}.` }),
  VERSION_CONFLICT: { status: 409, code: 'VERSION_CONFLICT', message: 'The record was updated by someone else. Please refresh and try again.' },
  BARANGAY_MISMATCH: { status: 403, code: 'BARANGAY_MISMATCH', message: 'You do not have permission to access records for this barangay.' },
  CATEGORY_PERMISSION_DENIED: { status: 403, code: 'CATEGORY_PERMISSION_DENIED', message: 'You do not have permission to use this category.' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN', message: 'Administrator access required.' },
} as const;
