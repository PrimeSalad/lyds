import { Router } from 'express';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { barangayRouter } from '../modules/barangays/interface/http/routes';
import { accountRouter } from '../modules/accounts/interface/http/routes';
import { auditLogRouter } from '../modules/audit-logs/interface/http/routes';
import { categoryRoutes } from '../modules/categories/interface/http/routes';
import { referenceDataRoutes } from '../modules/reference-data/interface/http/routes';
import { youthRecordRouter } from '../modules/youth-records/interface/http/routes';
import { importRouter } from '../modules/imports/interface/http/routes';
import { reportRouter } from '../modules/reports/interface/http/routes';
import { announcementRouter } from '../modules/announcements/interface/http/routes';

export const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/barangays', barangayRouter);
v1Router.use('/accounts', accountRouter);
v1Router.use('/audit-logs', auditLogRouter);
v1Router.use('/categories', categoryRoutes);
v1Router.use('/reference-data', referenceDataRoutes);
v1Router.use('/youth-records', youthRecordRouter);
v1Router.use('/imports', importRouter);
v1Router.use('/reports', reportRouter);
v1Router.use('/announcements', announcementRouter);
