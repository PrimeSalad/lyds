export const AccountErrors = {
  NOT_FOUND: { status: 404, code: 'ACCOUNT_NOT_FOUND', message: 'Account not found.' },
  ALREADY_EXISTS: { status: 409, code: 'ACCOUNT_ALREADY_EXISTS', message: 'An account with this email already exists.' },
  BARANGAY_REQUIRED: { status: 422, code: 'BARANGAY_REQUIRED', message: 'Barangay assignment is required for SK officials.' },
  INVALID_BARANGAY: { status: 422, code: 'INVALID_BARANGAY', message: 'The specified barangay does not exist or is inactive.' },
  SELF_DEACTIVATE: { status: 409, code: 'SELF_DEACTIVATE', message: 'Cannot deactivate your own account.' },
  SELF_DELETE: { status: 409, code: 'SELF_DELETE', message: 'You cannot delete your own account.' },
  DELETE_FAILED: {
    status: 409,
    code: 'ACCOUNT_DELETE_FAILED',
    message: 'This account could not be deleted because it may have linked activity. Deactivate it instead.',
  },
  CREDENTIALS_FAILED: { status: 500, code: 'ACCOUNT_CREDENTIALS_FAILED', message: 'Failed to create account credentials.' },
} as const;
