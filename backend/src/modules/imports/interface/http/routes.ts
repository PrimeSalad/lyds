import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireBarangayAccess } from '../../../../middleware/require-barangay-access';
import { importController } from './controller';

export const importRouter = Router();

importRouter.use(requireAuth);

importRouter.get('/template', importController.getTemplate);
importRouter.post('/validate', requireBarangayAccess, importController.validate);
importRouter.get('/:batchId', importController.getBatch);
importRouter.get('/:batchId/rows', importController.listRows);
importRouter.post('/:batchId/commit', requireBarangayAccess, importController.commit);
importRouter.post('/:batchId/cancel', importController.cancel);
importRouter.get('/:batchId/error-file', importController.getErrorFile);
