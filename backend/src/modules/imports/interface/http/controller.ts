import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { validateImportSchema, listRowsSchema } from './schema';
import { validateImport } from '../../application/use-cases/validate-import';
import { getImportBatch } from '../../application/use-cases/get-import-batch';
import { listImportRows } from '../../application/use-cases/list-import-rows';
import { commitImport } from '../../application/use-cases/commit-import';
import { cancelImport } from '../../application/use-cases/cancel-import';
import { generateTemplate } from '../../application/use-cases/generate-template';
import { generateErrorFile } from '../../application/use-cases/generate-error-file';

const getParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

export const importController = {
  async validate(req: Request, res: Response) {
    const input = validateImportSchema.parse(req.body);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const batch = await validateImport({ ...input, uploadedBy: ctx.profileId });
    res.status(201).json({ data: batch });
  },
  
  async getBatch(req: Request, res: Response) {
    const id = getParam(req.params.batchId);
    const batch = await getImportBatch(id);
    res.json({ data: batch });
  },
  
  async listRows(req: Request, res: Response) {
    const id = getParam(req.params.batchId);
    const query = listRowsSchema.parse(req.query);
    const rows = await listImportRows(id, query.page, query.pageSize);
    res.json(rows);
  },
  
  async commit(req: Request, res: Response) {
    const id = getParam(req.params.batchId);
    const ctx = (req as AuthenticatedRequest).authContext!;
    await commitImport(id, ctx.profileId, ctx.role);
    res.json({ data: { success: true } });
  },
  
  async cancel(req: Request, res: Response) {
    const id = getParam(req.params.batchId);
    await cancelImport(id);
    res.json({ data: { success: true } });
  },
  
  async getTemplate(_req: Request, res: Response) {
    const buffer = await generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="import_template.xlsx"');
    res.send(buffer);
  },
  
  async getErrorFile(req: Request, res: Response) {
    const id = getParam(req.params.batchId);
    const buffer = await generateErrorFile(id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="errors_${id}.xlsx"`);
    res.send(buffer);
  }
};
