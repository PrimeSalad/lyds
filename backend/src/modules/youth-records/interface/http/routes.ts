import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireAdmin } from '../../../../middleware/require-admin';
import { requireBarangayAccess } from '../../../../middleware/require-barangay-access';
import { youthRecordController } from './controller';

export const youthRecordRouter = Router();

youthRecordRouter.use(requireAuth);

youthRecordRouter.get('/', requireBarangayAccess, youthRecordController.list);
youthRecordRouter.post('/', requireBarangayAccess, youthRecordController.create);
youthRecordRouter.post('/copy', requireAdmin, youthRecordController.copy);
youthRecordRouter.get('/:recordId', requireBarangayAccess, youthRecordController.getById);
youthRecordRouter.patch('/:recordId', requireBarangayAccess, youthRecordController.update);
youthRecordRouter.post('/:recordId/submit', requireBarangayAccess, youthRecordController.submit);

youthRecordRouter.post('/:recordId/return', requireAdmin, youthRecordController.return);
youthRecordRouter.post('/:recordId/approve', requireAdmin, youthRecordController.approve);
youthRecordRouter.post('/:recordId/archive', requireAdmin, youthRecordController.archive);
youthRecordRouter.post('/:recordId/restore', requireAdmin, youthRecordController.restore);

youthRecordRouter.get('/:recordId/history', youthRecordController.history);
