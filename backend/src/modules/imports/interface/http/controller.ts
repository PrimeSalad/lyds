import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { cancelImport } from '../../application/use-cases/cancel-import';
import { commitImport } from '../../application/use-cases/commit-import';
import { generateErrorFile } from '../../application/use-cases/generate-error-file';
import { generateTemplate } from '../../application/use-cases/generate-template';
import { getImportBatch } from '../../application/use-cases/get-import-batch';
import { listImportBatches } from '../../application/use-cases/list-import-batches';
import { listImportRows } from '../../application/use-cases/list-import-rows';
import { validateImport } from '../../application/use-cases/validate-import';
import { resolveImportBarangayId } from '../../application/import-access';
import { listBatchesSchema, listRowsSchema, validateImportSchema } from './schema';

const getParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

const getAuthContext = (req: Request) => (req as AuthenticatedRequest).authContext!;

export const importController = {
  list: async (req: Request, res: Response) => {
    const query = listBatchesSchema.parse(req.query);
    const result = await listImportBatches(query, getAuthContext(req));
    res.json(result);
  },

  validate: async (req: Request, res: Response) => {
    const input = validateImportSchema.parse(req.body);
    const authContext = getAuthContext(req);
    const barangayId = resolveImportBarangayId(input.barangayId, authContext);
    const batch = await validateImport({
      ...input,
      barangayId,
      uploadedBy: authContext.profileId,
      actorRole: authContext.role,
    });
    res.status(201).json({ data: batch });
  },

  getBatch: async (req: Request, res: Response) => {
    const batch = await getImportBatch(getParam(req.params.batchId), getAuthContext(req));
    res.json({ data: batch });
  },

  listRows: async (req: Request, res: Response) => {
    const query = listRowsSchema.parse(req.query);
    const rows = await listImportRows(
      getParam(req.params.batchId),
      query.page,
      query.pageSize,
      getAuthContext(req),
    );
    res.json(rows);
  },

  commit: async (req: Request, res: Response) => {
    const id = getParam(req.params.batchId);
    const authContext = getAuthContext(req);
    const result = await commitImport(id, authContext);
    const batch = await getImportBatch(id, authContext);
    res.json({ data: { batch, ...result } });
  },

  cancel: async (req: Request, res: Response) => {
    await cancelImport(getParam(req.params.batchId), getAuthContext(req));
    res.json({ data: { success: true } });
  },

  getTemplate: async (_req: Request, res: Response) => {
    const buffer = await generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="youth-record-import-template.xlsx"');
    res.send(buffer);
  },

  getErrorFile: async (req: Request, res: Response) => {
    const id = getParam(req.params.batchId);
    const buffer = await generateErrorFile(id, getAuthContext(req));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="import-errors-${id}.xlsx"`);
    res.send(buffer);
  },
};
