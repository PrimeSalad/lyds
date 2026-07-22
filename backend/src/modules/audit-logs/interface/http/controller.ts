import type { Request, Response } from 'express';
import { auditService } from '../../infrastructure/audit-service';

export const auditLogController = {
  async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 25;
    const entity_type = req.query.entity_type as string | undefined;
    const action = req.query.action as string | undefined;

    const result = await auditService.findAll({ page, pageSize, entity_type, action });

    res.json({
      data: result.data,
      meta: {
        page,
        pageSize,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / pageSize),
      },
    });
  },

  async getById(req: Request, res: Response) {
    const id = String(req.params.auditLogId);
    const log = await auditService.findById(id);
    if (!log) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Audit log not found.' } });
      return;
    }
    res.json({ data: log });
  },
};
