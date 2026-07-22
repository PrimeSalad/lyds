import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { getSummary } from '../../application/use-cases/get-summary';
import { getDemographics } from '../../application/use-cases/get-demographics';
import { getByBarangay } from '../../application/use-cases/get-by-barangay';
import { exportRecords } from '../../application/use-cases/export-records';
import { getDashboardAnalytics } from '../../application/use-cases/get-dashboard-analytics';

export const reportController = {
  async dashboard(req: Request, res: Response) {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const data = await getDashboardAnalytics(ctx.role === 'ADMIN' ? null : ctx.barangayId);
    res.json({ data });
  },

  async summary(req: Request, res: Response) {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const requestedBarangayId = typeof req.query.barangayId === 'string' ? req.query.barangayId : null;
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : null;
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    const barangayId = ctx.role === 'ADMIN' ? requestedBarangayId : ctx.barangayId;
    const data = await getSummary({ barangayId, categoryId, status });
    res.json({ data });
  },

  async demographics(req: Request, res: Response) {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const requestedBarangayId = typeof req.query.barangayId === 'string' ? req.query.barangayId : null;
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : null;
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    const barangayId = ctx.role === 'ADMIN' ? requestedBarangayId : ctx.barangayId;
    const data = await getDemographics({ barangayId, categoryId, status });
    res.json({ data });
  },

  async byBarangay(_req: Request, res: Response) {
    const data = await getByBarangay();
    res.json({ data });
  },

  async export(req: Request, res: Response) {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const requestedBarangayId = typeof req.query.barangayId === 'string' ? req.query.barangayId : null;
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : null;
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
    const barangayId = ctx.role === 'ADMIN' ? requestedBarangayId : ctx.barangayId;
    const buffer = await exportRecords({
      barangayId,
      categoryId,
      status,
      actorId: ctx.profileId,
      actorRole: ctx.role,
      format,
    });
    
    const dateStr = new Date().toISOString().split('T')[0];
    const scope = barangayId ? 'Barangay' : 'All';
    const filename = `Youth_Profiles_${scope}_${dateStr}.${format}`;
    
    res.setHeader('Content-Type', format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
};
