import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireAdmin } from '../../../../middleware/require-admin';
import { barangayController } from './controller';

export const barangayRouter = Router();

barangayRouter.use(requireAuth);

barangayRouter.get('/', barangayController.list);
barangayRouter.get('/:barangayId', barangayController.getById);
barangayRouter.post('/', requireAdmin, barangayController.create);
barangayRouter.patch('/:barangayId', requireAdmin, barangayController.update);
barangayRouter.post('/:barangayId/activate', requireAdmin, barangayController.activate);
barangayRouter.post('/:barangayId/deactivate', requireAdmin, barangayController.deactivate);
barangayRouter.get('/:barangayId/summary', requireAdmin, barangayController.summary);
