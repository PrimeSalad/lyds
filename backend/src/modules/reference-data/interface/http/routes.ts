import { Router } from 'express';
import { referenceDataController } from './controller';
import { requireAuth } from '../../../../middleware/auth';
import { requireAdmin } from '../../../../middleware/require-admin';

export const referenceDataRoutes = Router();

referenceDataRoutes.use(requireAuth);

referenceDataRoutes.get('/', referenceDataController.listGroups);
referenceDataRoutes.get('/:groupCode/options', referenceDataController.listOptions);

referenceDataRoutes.post('/:groupCode/options', requireAdmin, referenceDataController.createOption);
referenceDataRoutes.patch('/:groupCode/options/:optionId', requireAdmin, referenceDataController.updateOption);
