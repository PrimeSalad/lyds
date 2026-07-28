import { Navigate, Outlet } from 'react-router';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../redux/store';

export const AdminGuard = () => {
  const profile = useSelector((state: RootState) => state.auth.profile);

  return profile?.role === 'ADMIN' ? <Outlet /> : <Navigate to="/" replace />;
};

export default AdminGuard;
