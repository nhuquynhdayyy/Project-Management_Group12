import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleGuardProps {
  allowedRoles: string[];
  redirectTo?: string;
}

export default function RoleGuard({ allowedRoles, redirectTo = '/map' }: RoleGuardProps) {
  const { user } = useAuth();

  // Check if user has at least one of the allowed roles
  const hasAccess = user?.roles.some(role => allowedRoles.includes(role));

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
