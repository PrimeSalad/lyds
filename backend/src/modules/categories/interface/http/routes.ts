import { Router } from 'express';
import { categoryController } from './controller';
import { requireAuth } from '../../../../middleware/auth';
import { requireAdmin } from '../../../../middleware/require-admin';

export const categoryRoutes = Router();

categoryRoutes.use(requireAuth);

// Base category routes
categoryRoutes.get('/', categoryController.list);
categoryRoutes.post('/', requireAdmin, categoryController.create);
categoryRoutes.get('/:categoryId', categoryController.getById);
categoryRoutes.patch('/:categoryId', requireAdmin, categoryController.update);
categoryRoutes.post('/:categoryId/publish', requireAdmin, categoryController.publish);
categoryRoutes.post('/:categoryId/archive', requireAdmin, categoryController.archive);

// Category field routes
categoryRoutes.get('/:categoryId/fields', categoryController.listFields);
categoryRoutes.post('/:categoryId/fields', requireAdmin, categoryController.createField);
categoryRoutes.patch('/:categoryId/fields/:fieldId', requireAdmin, categoryController.updateField);
