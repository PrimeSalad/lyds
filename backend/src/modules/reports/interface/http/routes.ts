import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireAdmin } from '../../../../middleware/require-admin';
import { reportController } from './controller';

export const reportRouter = Router();

reportRouter.use(requireAuth);

reportRouter.get('/summary', reportController.summary);
reportRouter.get('/demographics', reportController.demographics);
reportRouter.get('/by-barangay', requireAdmin, reportController.byBarangay);
reportRouter.get('/export', reportController.export);
