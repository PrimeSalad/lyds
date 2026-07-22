import { createApiError } from '../../../../config/api-error';

export const IMPORT_ERRORS = {
  importBatchNotFound: () => createApiError(404, 'IMPORT_BATCH_NOT_FOUND', 'Import batch not found'),
  importAlreadyCommitted: () => createApiError(400, 'IMPORT_ALREADY_COMMITTED', 'Import batch is already committed or processing'),
  invalidFileType: () => createApiError(400, 'INVALID_FILE_TYPE', 'Invalid file type. Only .xlsx and .csv are supported.'),
  fileTooLarge: () => createApiError(400, 'FILE_TOO_LARGE', 'File size exceeds the 10MB limit.'),
  tooManyRows: () => createApiError(400, 'TOO_MANY_ROWS', 'File exceeds the 5000 rows limit.'),
};
