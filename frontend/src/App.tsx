import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import MapPage from './pages/MapPage';
import DashboardPage from './pages/DashboardPage';
import TreeStatsPage from './pages/dashboard/TreeStatsPage';
import TaskStatsPage from './pages/dashboard/TaskStatsPage';
import TaskManagementPage from './pages/dashboard/TaskManagementPage';
import TreeManagementPage from './pages/dashboard/TreeManagementPage';
import StaffStatsPage from './pages/dashboard/StaffStatsPage';
import UsersPage from './pages/dashboard/UsersPage';
import AreasPage from './pages/dashboard/AreasPage';

function DefaultRedirect() {
  const { user } = useAuth();
  
  // Admin and Manager → Dashboard
  // Staff → Map
  const hasManagerAccess = user?.roles.some(role => ['Admin', 'Manager'].includes(role));
  const defaultPath = hasManagerAccess ? '/dashboard' : '/map';
  
  return <Navigate to={defaultPath} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected — all share the AppShell sidebar */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/map" element={<MapPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              
              {/* Dashboard - Admin/Manager only */}
              <Route element={<RoleGuard allowedRoles={['Admin', 'Manager']} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/trees" element={<TreeStatsPage />} />
                <Route path="/dashboard/trees/manage" element={<TreeManagementPage />} />
                <Route path="/dashboard/tasks" element={<TaskStatsPage />} />
                <Route path="/dashboard/tasks/manage" element={<TaskManagementPage />} />
                <Route path="/dashboard/staff" element={<StaffStatsPage />} />
                <Route path="/dashboard/areas" element={<AreasPage />} />
              </Route>
              <Route element={<RoleGuard allowedRoles={['Admin']} />}>
                <Route path="/dashboard/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          {/* Default - smart redirect based on role */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<DefaultRedirect />} />
          </Route>
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
