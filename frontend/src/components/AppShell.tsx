import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
} from '../api/notifications';
import type { NotificationItem } from '../types';

const NAV_GROUPS = [
  {
    title: 'Khám phá',
    items: [
      {
        to: '/map',
        label: 'Bản đồ 3D',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        ),
        roles: ['Admin', 'Manager', 'Staff'],
      },
      {
        to: '/nearby',
        label: 'Tìm cây xung quanh',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        roles: ['Admin', 'Manager', 'Staff'],
      },
      {
        to: '/dashboard/trees/heatmap',
        label: 'Bản đồ nhiệt',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="8" cy="10" r="1.5" fill="currentColor" opacity="0.6" />
            <circle cx="16" cy="14" r="1.5" fill="currentColor" opacity="0.6" />
          </svg>
        ),
        roles: ['Admin', 'Manager'],
      },
    ],
  },
  {
    title: 'Quản lý',
    items: [
      {
        to: '/dashboard/trees/manage',
        label: 'Quản lý Cây',
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
        to: '/dashboard/areas',
        label: 'Quản lý Khu vực',
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
    ],
  },
  {
    title: 'Bảo trì',
    items: [
      {
        to: '/maintenance/schedules',
        label: 'Lịch bảo trì',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 7V3m8 4V3M4 11h16M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
          </svg>
        ),
        roles: ['Admin', 'Manager'],
      },
      {
        to: '/dashboard/tasks/manage',
        label: 'Quản lý Task',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        roles: ['Admin', 'Manager'],
      },
    ],
  },
  {
    title: 'Thống kê',
    items: [
      {
        to: '/dashboard',
        label: 'Tổng quan',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        roles: ['Admin', 'Manager'],
        end: true,
      },
      {
        to: '/dashboard/trees',
        label: 'Thống kê Cây',
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
        to: '/dashboard/tasks',
        label: 'Thống kê Bảo trì',
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
        to: '/dashboard/staff',
        label: 'Hiệu suất Nhân viên',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m10-4.13a4 4 0 11-8 0 4 4 0 018 0zm-8 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
        roles: ['Admin', 'Manager'],
      },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      {
        to: '/dashboard/users',
        label: 'Quản lý Users',
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
      {
        to: '/dashboard/settings',
        label: 'Cấu hình hệ thống',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        roles: ['Admin'],
      },
      {
        to: '/activity-logs',
        label: 'Nhật ký hoạt động',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z" />
          </svg>
        ),
        roles: ['Admin'],
      },
      {
        to: '/notifications/new',
        label: 'Tạo thông báo',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 01-6 0m3-9v4m-2-2h4" />
          </svg>
        ),
        roles: ['Admin', 'Manager'],
      },
    ],
  },
  {
    title: 'Hỗ trợ',
    items: [
      {
        to: '/help',
        label: 'Trợ giúp',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.25 9a3.75 3.75 0 117.1 1.7c-.9.5-1.6 1.2-1.6 2.3m-1.5 4h.01M12 22a10 10 0 100-20 10 10 0 000 20z" />
          </svg>
        ),
        roles: ['Admin', 'Manager', 'Staff'],
      },
    ],
  },
];

function hasAnyRole(userRoles: string[] | undefined, allowedRoles: string[]) {
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toLowerCase());
  return userRoles?.some((role) => normalizedAllowedRoles.includes(role.toLowerCase())) ?? false;
}

function Icon({ path }: { path: string }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export default function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const onboardingSlides = [
    { title: 'Bản đồ cây xanh', body: 'Theo dõi vị trí, tình trạng sức khỏe và các điểm cần xử lý trên bản đồ.' },
    { title: 'Lịch bảo trì', body: 'Tạo chu kỳ tưới nước, bón phân, cắt tỉa và gửi nhắc việc cho nhân viên.' },
    { title: 'Thống kê', body: 'Xem tỷ lệ cây khỏe, yếu, chết/nguy hiểm và phân tích cây theo nhóm tuổi.' },
    { title: 'Trợ giúp', body: 'Mở dấu hỏi hoặc trang Trợ giúp để xem lại hướng dẫn bất kỳ lúc nào.' },
  ];

  useEffect(() => {
    if (!user) return;

    let active = true;
    async function loadNotifications() {
      try {
        const [items, count] = await Promise.all([
          fetchNotifications(),
          fetchUnreadNotificationCount(),
        ]);
        if (!active) return;
        setNotifications(items);
        setUnreadCount(count);
      } catch {
        if (!active) return;
        setNotifications([]);
        setUnreadCount(0);
      }
    }

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const key = `onboarding_seen_${user.id}`;
    if (!localStorage.getItem(key)) {
      setOnboardingOpen(true);
      localStorage.setItem(key, 'true');
    }
  }, [user]);

  async function handleOpenNotifications() {
    const nextOpen = !notificationOpen;
    setNotificationOpen(nextOpen);
    if (!nextOpen) return;

    const unread = notifications.filter((item) => !item.read_at);
    await Promise.all(unread.map((item) => markNotificationRead(item.notification_id)));
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
  }

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
      <nav className="flex w-56 shrink-0 flex-col border-r border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2.5 border-b border-gray-800 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
            <Icon path="M12 3C8 3 5 6.5 5 10c0 2.5 1.3 4.7 3.3 6L8 20h8l-.3-4C17.7 14.7 19 12.5 19 10c0-3.5-3-7-7-7z" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Cây Xanh</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Đà Nẵng</p>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex-1 px-2 py-4 overflow-y-auto">
          {NAV_GROUPS.map((group, groupIndex) => {
            const visibleItems = group.items.filter((item) => hasAnyRole(user?.roles, item.roles));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className={groupIndex > 0 ? 'mt-4' : ''}>
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-green-600/20 text-green-400' 
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`
                      }
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
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
              <p className="truncate text-xs font-medium text-white">{user?.username}</p>
              <p className="truncate text-[10px] text-gray-500">{user?.roles.join(', ')}</p>
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

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="relative flex h-12 items-center justify-end border-b border-gray-800 bg-gray-900 px-5">
          <button
            type="button"
            onClick={() => {
              setOnboardingStep(0);
              setOnboardingOpen(true);
            }}
            className="mr-2 flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Trợ giúp nhanh"
            title="Trợ giúp nhanh"
          >
            <Icon path="M9.1 9a3 3 0 115.8 1c-.7.4-1.4.9-1.4 2v.5m-1.5 3h.01M12 22a10 10 0 100-20 10 10 0 000 20z" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="mr-2 flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-200"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Đăng xuất
          </button>

          <button
            type="button"
            onClick={handleOpenNotifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Thông báo"
          >
            <Icon path="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 01-6 0" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>

          {notificationOpen ? (
            <div className="absolute right-5 top-11 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-md border border-gray-700 bg-gray-900 shadow-xl">
              <div className="border-b border-gray-800 px-4 py-3">
                <p className="text-sm font-semibold text-white">Thông báo</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-500">Chưa có thông báo</p>
                ) : (
                  notifications.map((item) => (
                    <article key={item.id} className={`border-b border-gray-800 px-4 py-3 last:border-b-0 ${item.read_at ? 'bg-gray-900' : 'bg-gray-800/60'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-medium text-white">{item.notification.title}</h4>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${item.notification.severity === 'urgent' ? 'bg-red-500/15 text-red-300' : 'bg-green-500/15 text-green-300'}`}>
                          {item.notification.severity === 'urgent' ? 'Khẩn cấp' : 'Bình thường'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-300">{item.notification.content}</p>
                      <time className="mt-2 block text-[11px] text-gray-500">
                        {new Date(item.notification.created_at).toLocaleString('vi-VN')}
                      </time>
                    </article>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </header>

        {onboardingOpen ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-green-400">Hướng dẫn {onboardingStep + 1}/{onboardingSlides.length}</p>
                <button type="button" onClick={() => setOnboardingOpen(false)} className="rounded px-2 py-1 text-sm text-gray-400 hover:bg-gray-800 hover:text-white">Đóng</button>
              </div>
              <h2 className="text-lg font-semibold text-white">{onboardingSlides[onboardingStep].title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-300">{onboardingSlides[onboardingStep].body}</p>
              <div className="mt-5 flex justify-between">
                <button type="button" onClick={() => setOnboardingStep((step) => Math.max(0, step - 1))} disabled={onboardingStep === 0} className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 disabled:opacity-40">
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onboardingStep === onboardingSlides.length - 1) setOnboardingOpen(false);
                    else setOnboardingStep((step) => step + 1);
                  }}
                  className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
                >
                  {onboardingStep === onboardingSlides.length - 1 ? 'Hoàn tất' : 'Tiếp'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
