import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import DashboardPage from './pages/DashboardPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import TreeStatsPage from './pages/dashboard/TreeStatsPage';
import TaskStatsPage from './pages/dashboard/TaskStatsPage';
import TaskManagementPage from './pages/dashboard/TaskManagementPage';
import TreeManagementPage from './pages/dashboard/TreeManagementPage';
import TreeHeatmapPage from './pages/dashboard/TreeHeatmapPage';
import StaffStatsPage from './pages/dashboard/StaffStatsPage';
import UsersPage from './pages/dashboard/UsersPage';
import SystemSettingsPage from './pages/dashboard/SystemSettingsPage';
import NearbyTreesPage from './pages/dashboard/NearbyTreesPage';
import StaffTasksPage from './pages/dashboard/StaffTasksPage';

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
              
              {/* Nearby Trees - Staff, Manager, Admin */}
              <Route element={<RoleGuard allowedRoles={['Admin', 'Manager', 'Staff']} />}>
                <Route path="/nearby" element={<NearbyTreesPage />} />
                <Route path="/tasks" element={<StaffTasksPage />} />
              </Route>
              
              {/* Dashboard - Admin/Manager only */}
              <Route element={<RoleGuard allowedRoles={['Admin', 'Manager']} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/trees" element={<TreeStatsPage />} />
                <Route path="/dashboard/trees/manage" element={<TreeManagementPage />} />
                <Route path="/dashboard/trees/heatmap" element={<TreeHeatmapPage />} />
                <Route path="/dashboard/tasks" element={<TaskStatsPage />} />
                <Route path="/dashboard/tasks/manage" element={<TaskManagementPage />} />
                <Route path="/dashboard/staff" element={<StaffStatsPage />} />
              </Route>
              <Route element={<RoleGuard allowedRoles={['Admin']} />}>
                <Route path="/dashboard/users" element={<UsersPage />} />
                <Route path="/dashboard/settings" element={<SystemSettingsPage />} />
              </Route>

              <Route element={<RoleGuard allowedRoles={['Admin']} />}>
                <Route path="/activity-logs" element={<ActivityLogsPage />} />
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
