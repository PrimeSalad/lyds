export const ReferenceDataErrors = {
  GROUP_NOT_FOUND: { status: 404, code: 'REFERENCE_GROUP_NOT_FOUND', message: 'Reference group not found.' },
  OPTION_NOT_FOUND: { status: 404, code: 'REFERENCE_OPTION_NOT_FOUND', message: 'Reference option not found.' },
  OPTION_ALREADY_EXISTS: { status: 409, code: 'REFERENCE_OPTION_ALREADY_EXISTS', message: 'Option code already exists in this group.' },
} as const;
