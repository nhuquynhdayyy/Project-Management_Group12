import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  {
    to: '/map',
    label: 'Bản đồ 3D',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    roles: ['Admin', 'Manager', 'Staff'], // All roles can see map
  },
  {
    to: '/dashboard',
    label: '📊 Tổng quan',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    roles: ['Admin', 'Manager'], // Staff CANNOT see dashboard
    end: true,
  },
  {
    to: '/dashboard/trees',
    label: '🌳 Thống kê Cây',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 3C8 3 5 6.5 5 10c0 2.5 1.3 4.7 3.3 6L8 20h8l-.3-4C17.7 14.7 19 12.5 19 10c0-3.5-3-7-7-7z" />
      </svg>
    ),
    roles: ['Admin', 'Manager'],
    end: true,
  },
  {
    to: '/dashboard/trees/manage',
    label: '🌿 Quản lý Cây',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 3C8 3 5 6.5 5 10c0 2.5 1.3 4.7 3.3 6L8 20h8l-.3-4C17.7 14.7 19 12.5 19 10c0-3.5-3-7-7-7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20v-4" />
      </svg>
    ),
    roles: ['Admin', 'Manager'],
  },
  {
    to: '/dashboard/tasks',
    label: '🔧 Thống kê Bảo trì',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    roles: ['Admin', 'Manager'],
    end: true,
  },
  {
    to: '/dashboard/tasks/manage',
    label: '📋 Quản lý Task',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    roles: ['Admin', 'Manager'],
  },
  {
    to: '/dashboard/staff',
    label: '👷 Hiệu suất Nhân viên',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m10-4.13a4 4 0 11-8 0 4 4 0 018 0zm-8 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    roles: ['Admin', 'Manager'],
  },
  {
    to: '/dashboard/areas',
    label: '📍 Quản lý Khu vực',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    roles: ['Admin', 'Manager'],
  },
  {
    to: '/dashboard/users',
    label: '👥 Quản lý Users',
icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 14c-3.314 0-6 1.567-6 3.5V20h12v-2.5c0-1.933-2.686-3.5-6-3.5z" />
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 11a4 4 0 100-8 4 4 0 000 8zm6.5 1.5a3 3 0 100-6 3 3 0 000 6z" />
      </svg>
    ),
    roles: ['Admin'],
  },
];

export default function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* ── Sidebar ── */}
      <nav className="w-56 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-800">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-600">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 3C8 3 5 6.5 5 10c0 2.5 1.3 4.7 3.3 6L8 20h8l-.3-4C17.7 14.7 19 12.5 19 10c0-3.5-3-7-7-7z" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Cây Xanh</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Đà Nẵng</p>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.filter(item => 
            user?.roles.some(role => item.roles.includes(role))
          ).map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-green-600/20 text-green-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </div>

        {/* User section */}
        <div className="px-3 py-3 border-t border-gray-800">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-2.5 mb-2.5 px-2 py-2 rounded-lg transition-colors
              ${isActive
                ? 'bg-green-600/20'
                : 'hover:bg-gray-800'
              }`
            }
          >
            <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
              {user?.username?.[0] ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.username}</p>
              <p className="text-[10px] text-gray-500 truncate">
                {user?.roles.join(', ')}
              </p>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-gray-400
                       hover:bg-gray-800 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Đăng xuất
          </button>
        </div>
      </nav>

      {/* ── Page content ── */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
