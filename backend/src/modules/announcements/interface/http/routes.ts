import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireAdmin } from '../../../../middleware/require-admin';
import { announcementController } from './controller';

export const announcementRouter = Router();

announcementRouter.use(requireAuth);

announcementRouter.get('/', announcementController.list);
announcementRouter.post('/', requireAdmin, announcementController.create);
announcementRouter.patch('/:announcementId', requireAdmin, announcementController.update);
announcementRouter.post('/:announcementId/archive', requireAdmin, announcementController.archive);
