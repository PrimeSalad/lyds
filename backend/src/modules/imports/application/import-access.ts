import { API_ERRORS } from '../../../config/api-error';
import { IMPORT_ERRORS } from '../domain/errors/import-errors';
import type { ImportBatch } from '../domain/entities/import-batch';

export type ImportAuthContext = {
  profileId: string;
  role: 'ADMIN' | 'SK_OFFICIAL';
  barangayId: string | null;
};

export const resolveImportBarangayId = (
  requestedBarangayId: string | undefined,
  authContext: ImportAuthContext,
) => {
  if (authContext.role === 'ADMIN') {
    if (!requestedBarangayId) throw API_ERRORS.validation('Select a barangay for this import.');
    return requestedBarangayId;
  }

  if (!authContext.barangayId) throw API_ERRORS.forbidden('No active barangay assignment.');
  if (requestedBarangayId && requestedBarangayId !== authContext.barangayId) {
    throw API_ERRORS.forbidden('You can only import records for your assigned barangay.');
  }
  return authContext.barangayId;
};

export const assertImportBatchAccess = (batch: ImportBatch, authContext: ImportAuthContext) => {
  if (authContext.role === 'SK_OFFICIAL' && batch.barangay_id !== authContext.barangayId) {
    throw IMPORT_ERRORS.accessDenied();
  }
};
