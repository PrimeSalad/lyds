import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { childLaborerController } from './controller';

export const childLaborerRouter = Router();

childLaborerRouter.use(requireAuth);
childLaborerRouter.get('/', childLaborerController.list);
childLaborerRouter.post('/', childLaborerController.create);
childLaborerRouter.get('/summary', childLaborerController.summary);
childLaborerRouter.get('/export', childLaborerController.export);
childLaborerRouter.get('/:recordId', childLaborerController.get);
childLaborerRouter.patch('/:recordId', childLaborerController.update);
childLaborerRouter.post('/:recordId/archive', childLaborerController.archive);
childLaborerRouter.post('/:recordId/restore', childLaborerController.restore);
