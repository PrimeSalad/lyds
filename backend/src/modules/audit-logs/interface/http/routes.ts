import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireAdmin } from '../../../../middleware/require-admin';
import { auditLogController } from './controller';

export const auditLogRouter = Router();

auditLogRouter.use(requireAuth);
auditLogRouter.use(requireAdmin);

auditLogRouter.get('/', auditLogController.list);
auditLogRouter.get('/:auditLogId', auditLogController.getById);
