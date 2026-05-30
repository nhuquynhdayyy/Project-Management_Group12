import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import DashboardPage from './pages/DashboardPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import CreateNotificationPage from './pages/CreateNotificationPage';
import MaintenanceSchedulePage from './pages/MaintenanceSchedulePage';
import StatsPage from './pages/StatsPage';
import HelpPage from './pages/HelpPage';

function DefaultRedirect() {
  const { user } = useAuth();
  
  // Admin and Manager → Dashboard
  // Staff → Map
  const hasManagerAccess = user?.roles.some(role => ['admin', 'manager'].includes(role.toLowerCase()));
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

          {/* Protected — all share the AppShell sidebar */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/map" element={<MapPage />} />
              
              {/* Dashboard - Admin/Manager only */}
              <Route element={<RoleGuard allowedRoles={['Admin', 'Manager']} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>

              <Route element={<RoleGuard allowedRoles={['Admin']} />}>
                <Route path="/activity-logs" element={<ActivityLogsPage />} />
              </Route>

              <Route element={<RoleGuard allowedRoles={['Admin', 'Manager']} />}>
                <Route path="/notifications/new" element={<CreateNotificationPage />} />
                <Route path="/maintenance/schedules" element={<MaintenanceSchedulePage />} />
                <Route path="/stats" element={<StatsPage />} />
              </Route>

              <Route path="/help" element={<HelpPage />} />
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
