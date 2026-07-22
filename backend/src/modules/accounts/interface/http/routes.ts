import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireAdmin } from '../../../../middleware/require-admin';
import { accountController } from './controller';

export const accountRouter = Router();

accountRouter.use(requireAuth);
accountRouter.use(requireAdmin);

accountRouter.get('/', accountController.list);
accountRouter.get('/:accountId', accountController.getById);
accountRouter.post('/', accountController.create);
accountRouter.patch('/:accountId', accountController.update);
accountRouter.post('/:accountId/activate', accountController.activate);
accountRouter.post('/:accountId/deactivate', accountController.deactivate);
accountRouter.post('/:accountId/assign-barangay', accountController.assignBarangayEndpoint);
