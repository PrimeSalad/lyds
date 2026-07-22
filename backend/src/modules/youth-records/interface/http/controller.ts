import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { listYouthRecords } from '../../application/use-cases/list-youth-records';
import { getYouthRecord } from '../../application/use-cases/get-youth-record';
import { createYouthRecord } from '../../application/use-cases/create-youth-record';
import { updateYouthRecord } from '../../application/use-cases/update-youth-record';
import { submitYouthRecord } from '../../application/use-cases/submit-youth-record';
import { returnYouthRecord } from '../../application/use-cases/return-youth-record';
import { approveYouthRecord } from '../../application/use-cases/approve-youth-record';
import { archiveYouthRecord } from '../../application/use-cases/archive-youth-record';
import { restoreYouthRecord } from '../../application/use-cases/restore-youth-record';
import { getRecordHistory } from '../../application/use-cases/get-record-history';
import { copyYouthRecords } from '../../application/use-cases/copy-youth-records';
import {
  createYouthRecordSchema,
  updateYouthRecordSchema,
  returnYouthRecordSchema,
  listYouthRecordsQuerySchema,
  copyYouthRecordsSchema
} from './schema';

export const youthRecordController = {
  async list(req: Request, res: Response) {
    const filters = listYouthRecordsQuerySchema.parse(req.query);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const parsedFilters = {
      ...filters,
      filingYear: filters.filingYear,
      sort: filters.sortField ? { field: filters.sortField, direction: filters.sortDir || 'asc' } : undefined,
    };
    const result = await listYouthRecords(parsedFilters, ctx);
    res.json(result);
  },

  async getById(req: Request, res: Response) {
    const id = String(req.params.recordId);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const record = await getYouthRecord(id, ctx);
    res.json({ data: record });
  },

  async create(req: Request, res: Response) {
    const input = createYouthRecordSchema.parse(req.body);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const result = await createYouthRecord(input, ctx);
    res.status(201).json({ data: result.record, warnings: result.warnings });
  },

  async update(req: Request, res: Response) {
    const input = updateYouthRecordSchema.parse(req.body);
    const id = String(req.params.recordId);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const record = await updateYouthRecord(id, input, ctx);
    res.json({ data: record });
  },

  async submit(req: Request, res: Response) {
    const id = String(req.params.recordId);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const record = await submitYouthRecord(id, ctx);
    res.json({ data: record });
  },

  async return(req: Request, res: Response) {
    const input = returnYouthRecordSchema.parse(req.body);
    const id = String(req.params.recordId);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const record = await returnYouthRecord(id, input.return_reason, ctx);
    res.json({ data: record });
  },

  async approve(req: Request, res: Response) {
    const id = String(req.params.recordId);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const record = await approveYouthRecord(id, ctx);
    res.json({ data: record });
  },

  async archive(req: Request, res: Response) {
    const id = String(req.params.recordId);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const record = await archiveYouthRecord(id, ctx);
    res.json({ data: record });
  },

  async restore(req: Request, res: Response) {
    const id = String(req.params.recordId);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const record = await restoreYouthRecord(id, ctx);
    res.json({ data: record });
  },

  async history(req: Request, res: Response) {
    const id = String(req.params.recordId);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const logs = await getRecordHistory(id, ctx);
    res.json({ data: logs });
  },

  async copy(req: Request, res: Response) {
    const input = copyYouthRecordsSchema.parse(req.body);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const result = await copyYouthRecords(input.source_category_id, input.target_category_id, ctx);
    res.json({ data: result });
  },
};
