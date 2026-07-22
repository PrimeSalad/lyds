export const BarangayErrors = {
  NOT_FOUND: { status: 404, code: 'BARANGAY_NOT_FOUND', message: 'Barangay not found.' },
  ALREADY_EXISTS: { status: 409, code: 'BARANGAY_ALREADY_EXISTS', message: 'A barangay with this code already exists.' },
  HAS_ACCOUNTS: { status: 409, code: 'BARANGAY_HAS_ACCOUNTS', message: 'Cannot delete a barangay with assigned accounts. Deactivate it instead.' },
  HAS_RECORDS: { status: 409, code: 'BARANGAY_HAS_RECORDS', message: 'Cannot delete a barangay with existing records. Deactivate it instead.' },
} as const;
