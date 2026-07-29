export const AccountErrors = {
  NOT_FOUND: { status: 404, code: 'ACCOUNT_NOT_FOUND', message: 'Account not found.' },
  ALREADY_EXISTS: { status: 409, code: 'ACCOUNT_ALREADY_EXISTS', message: 'An account with this email already exists.' },
  BARANGAY_REQUIRED: { status: 422, code: 'BARANGAY_REQUIRED', message: 'Barangay assignment is required for SK officials.' },
  INVALID_BARANGAY: { status: 422, code: 'INVALID_BARANGAY', message: 'The specified barangay does not exist or is inactive.' },
  SELF_DEACTIVATE: { status: 409, code: 'SELF_DEACTIVATE', message: 'Cannot deactivate your own account.' },
  SELF_DELETE: { status: 409, code: 'SELF_DELETE', message: 'You cannot delete your own account.' },
  SELF_MFA_RESET: { status: 409, code: 'SELF_MFA_RESET', message: 'You cannot reset your own two-factor authentication from account management.' },
  HAS_APPROVED_RECORDS: {
    status: 409,
    code: 'ACCOUNT_HAS_APPROVED_RECORDS',
    message: 'This account has approved youth records and cannot be permanently deleted. Deactivate it instead.',
  },
  DELETE_FAILED: {
    status: 409,
    code: 'ACCOUNT_DELETE_FAILED',
    message: 'This account could not be fully deleted. Try again, or deactivate it if the problem continues.',
  },
  CREDENTIALS_FAILED: { status: 500, code: 'ACCOUNT_CREDENTIALS_FAILED', message: 'Failed to create account credentials.' },
  MFA_RESET_FAILED: { status: 500, code: 'ACCOUNT_MFA_RESET_FAILED', message: 'Two-factor authentication could not be reset. Please try again.' },
} as const;
