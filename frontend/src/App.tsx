import { lazy, Suspense } from 'react';
import { Routes, Route, BrowserRouter } from 'react-router';
import { AuthGuard } from './modules/auth/presentation/components/AuthGuard';
import LoginPage from './modules/auth/presentation/pages/LoginPage';
import DashboardPage from './modules/dashboard/presentation/pages/DashboardPage';
import { Spinner, Box } from '@chakra-ui/react';

const BarangayListPage = lazy(() => import('./modules/barangays/presentation/pages/BarangayListPage'));
const BarangayFormPage = lazy(() => import('./modules/barangays/presentation/pages/BarangayFormPage'));
const AccountListPage = lazy(() => import('./modules/accounts/presentation/pages/AccountListPage'));
const AccountFormPage = lazy(() => import('./modules/accounts/presentation/pages/AccountFormPage'));
const AuditLogListPage = lazy(() => import('./modules/audit-logs/presentation/pages/AuditLogListPage'));
const YouthRecordListPage = lazy(() => import('./modules/youth-records/presentation/pages/YouthRecordListPage'));
const YouthRecordFormPage = lazy(() => import('./modules/youth-records/presentation/pages/YouthRecordFormPage'));
const YouthRecordDetailPage = lazy(() => import('./modules/youth-records/presentation/pages/YouthRecordDetailPage'));
const CategoryListPage = lazy(() => import('./modules/categories/presentation/pages/CategoryListPage'));
const CategoryFormPage = lazy(() => import('./modules/categories/presentation/pages/CategoryFormPage'));
const CategoryFieldsPage = lazy(() => import('./modules/categories/presentation/pages/CategoryFieldsPage'));
const ReferenceDataPage = lazy(() => import('./modules/reference-data/presentation/pages/ReferenceDataPage'));
const ImportPage = lazy(() => import('./modules/imports/presentation/pages/ImportPage'));
const ImportHistoryPage = lazy(() => import('./modules/imports/presentation/pages/ImportHistoryPage'));
const ReportsPage = lazy(() => import('./modules/reports/presentation/pages/ReportsPage'));
const AnnouncementListPage = lazy(() => import('./modules/announcements/presentation/pages/AnnouncementListPage'));

const PageLoader = () => (
  <Box py={12} textAlign="center">
    <Spinner size="lg" color="primary.600" />
  </Box>
);

const NotFoundPage = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h1>404</h1>
    <p>Page not found</p>
  </div>
);

const Lazy = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AuthGuard />}>
        <Route path="/" element={<DashboardPage />} />
        {/* Barangays */}
        <Route path="/barangays" element={<Lazy><BarangayListPage /></Lazy>} />
        <Route path="/barangays/new" element={<Lazy><BarangayFormPage /></Lazy>} />
        <Route path="/barangays/:barangayId/edit" element={<Lazy><BarangayFormPage /></Lazy>} />
        {/* Accounts */}
        <Route path="/accounts" element={<Lazy><AccountListPage /></Lazy>} />
        <Route path="/accounts/new" element={<Lazy><AccountFormPage /></Lazy>} />
        <Route path="/accounts/:accountId/edit" element={<Lazy><AccountFormPage /></Lazy>} />
        {/* Youth Records */}
        <Route path="/youth-records" element={<Lazy><YouthRecordListPage /></Lazy>} />
        <Route path="/youth-records/new" element={<Lazy><YouthRecordFormPage /></Lazy>} />
        <Route path="/youth-records/:recordId" element={<Lazy><YouthRecordDetailPage /></Lazy>} />
        <Route path="/youth-records/:recordId/edit" element={<Lazy><YouthRecordFormPage /></Lazy>} />
        {/* Categories */}
        <Route path="/categories" element={<Lazy><CategoryListPage /></Lazy>} />
        <Route path="/categories/new" element={<Lazy><CategoryFormPage /></Lazy>} />
        <Route path="/categories/:categoryId/edit" element={<Lazy><CategoryFormPage /></Lazy>} />
        <Route path="/categories/:categoryId/fields" element={<Lazy><CategoryFieldsPage /></Lazy>} />
        {/* Reference Data */}
        <Route path="/reference-data" element={<Lazy><ReferenceDataPage /></Lazy>} />
        {/* Imports */}
        <Route path="/imports" element={<Lazy><ImportHistoryPage /></Lazy>} />
        <Route path="/imports/new" element={<Lazy><ImportPage /></Lazy>} />
        {/* Reports */}
        <Route path="/reports" element={<Lazy><ReportsPage /></Lazy>} />
        {/* Announcements */}
        <Route path="/announcements" element={<Lazy><AnnouncementListPage /></Lazy>} />
        {/* Audit Logs */}
        <Route path="/audit-logs" element={<Lazy><AuditLogListPage /></Lazy>} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;
