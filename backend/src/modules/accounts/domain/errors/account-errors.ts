export const AccountErrors = {
  NOT_FOUND: { status: 404, code: 'ACCOUNT_NOT_FOUND', message: 'Account not found.' },
  ALREADY_EXISTS: { status: 409, code: 'ACCOUNT_ALREADY_EXISTS', message: 'An account with this email already exists.' },
  BARANGAY_REQUIRED: { status: 422, code: 'BARANGAY_REQUIRED', message: 'Barangay assignment is required for SK officials.' },
  INVALID_BARANGAY: { status: 422, code: 'INVALID_BARANGAY', message: 'The specified barangay does not exist or is inactive.' },
  SELF_DEACTIVATE: { status: 409, code: 'SELF_DEACTIVATE', message: 'Cannot deactivate your own account.' },
  INVITE_FAILED: { status: 500, code: 'INVITE_FAILED', message: 'Failed to send account invitation.' },
} as const;
