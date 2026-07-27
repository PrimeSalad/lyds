import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { importController } from './controller';

export const importRouter = Router();

importRouter.use(requireAuth);

importRouter.get('/template', importController.getTemplate);
importRouter.get('/', importController.list);
importRouter.post('/validate', importController.validate);
importRouter.get('/:batchId', importController.getBatch);
importRouter.get('/:batchId/rows', importController.listRows);
importRouter.post('/:batchId/commit', importController.commit);
importRouter.post('/:batchId/cancel', importController.cancel);
importRouter.get('/:batchId/error-file', importController.getErrorFile);
