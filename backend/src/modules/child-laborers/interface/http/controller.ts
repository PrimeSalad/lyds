import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { childLaborerService } from '../../application/child-laborer-service';
import {
  childLaborerExportQuerySchema,
  childLaborerSummaryQuerySchema,
  createChildLaborerSchema,
  listChildLaborersQuerySchema,
  updateChildLaborerSchema,
} from './schema';

const context = (request: Request) => (request as AuthenticatedRequest).authContext!;

export const childLaborerController = {
  async list(request: Request, response: Response) {
    const query = listChildLaborersQuerySchema.parse(request.query);
    response.json(await childLaborerService.list(query, context(request)));
  },

  async get(request: Request, response: Response) {
    const record = await childLaborerService.get(String(request.params.recordId), context(request));
    response.json({ data: record });
  },

  async create(request: Request, response: Response) {
    const input = createChildLaborerSchema.parse(request.body);
    const record = await childLaborerService.create(input, context(request));
    response.status(201).json({ data: record });
  },

  async update(request: Request, response: Response) {
    const input = updateChildLaborerSchema.parse(request.body);
    const record = await childLaborerService.update(String(request.params.recordId), input, context(request));
    response.json({ data: record });
  },

  async archive(request: Request, response: Response) {
    const record = await childLaborerService.archive(String(request.params.recordId), context(request));
    response.json({ data: record });
  },

  async restore(request: Request, response: Response) {
    const record = await childLaborerService.restore(String(request.params.recordId), context(request));
    response.json({ data: record });
  },

  async summary(request: Request, response: Response) {
    const query = childLaborerSummaryQuerySchema.parse(request.query);
    response.json({ data: await childLaborerService.summary(query, context(request)) });
  },

  async export(request: Request, response: Response) {
    const query = childLaborerExportQuerySchema.parse(request.query);
    const buffer = await childLaborerService.export(query, context(request));
    const filename = `Child Laborers ${query.filingYear}.${query.format}`;
    response.setHeader('Content-Type', query.format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.send(buffer);
  },
};
