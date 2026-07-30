import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { getSummary } from '../../application/use-cases/get-summary';
import { getDemographics } from '../../application/use-cases/get-demographics';
import { getByBarangay } from '../../application/use-cases/get-by-barangay';
import { exportRecords } from '../../application/use-cases/export-records';
import { getDashboardAnalytics } from '../../application/use-cases/get-dashboard-analytics';
import { dashboardQuerySchema, exportRecordsQuerySchema, reportQuerySchema } from './schema';

export const reportController = {
  async dashboard(req: Request, res: Response) {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const query = dashboardQuerySchema.parse(req.query);
    const data = await getDashboardAnalytics({
      barangayId: ctx.role === 'ADMIN' ? null : ctx.barangayId,
      filingYear: query.filingYear ?? null,
    });
    res.json({ data });
  },

  async summary(req: Request, res: Response) {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const query = reportQuerySchema.parse(req.query);
    const requestedBarangayId = query.barangayId ?? null;
    const barangayId = ctx.role === 'ADMIN' ? requestedBarangayId : ctx.barangayId;
    const data = await getSummary({
      barangayId,
      categoryId: query.categoryId ?? null,
      status: query.status ?? null,
      filingYear: query.filingYear,
    });
    res.json({ data });
  },

  async demographics(req: Request, res: Response) {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const query = reportQuerySchema.parse(req.query);
    const requestedBarangayId = query.barangayId ?? null;
    const barangayId = ctx.role === 'ADMIN' ? requestedBarangayId : ctx.barangayId;
    const data = await getDemographics({
      barangayId,
      categoryId: query.categoryId ?? null,
      status: query.status ?? null,
      filingYear: query.filingYear,
    });
    res.json({ data });
  },

  async byBarangay(_req: Request, res: Response) {
    const data = await getByBarangay();
    res.json({ data });
  },

  export: async (req: Request, res: Response) => {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const query = exportRecordsQuerySchema.parse(req.query);
    const requestedBarangayId = query.barangayId ?? null;
    const categoryId = query.categoryId ?? null;
    const status = query.status ?? null;
    const filingYear = query.filingYear ?? null;
    const format = query.format;
    const barangayId = ctx.role === 'ADMIN' ? requestedBarangayId : ctx.barangayId;
    const buffer = await exportRecords({
      barangayId,
      categoryId,
      status,
      filingYear,
      actorId: ctx.profileId,
      actorRole: ctx.role,
      format,
    });
    
    const dateStr = new Date().toISOString().split('T')[0];
    const scope = barangayId ? 'Barangay' : 'All';
    const filename = format === 'xlsx' && filingYear
      ? `KK Youth Profile ${filingYear}.xlsx`
      : `Youth_Profiles_${scope}_${dateStr}.${format}`;
    
    res.setHeader('Content-Type', format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  },
};
