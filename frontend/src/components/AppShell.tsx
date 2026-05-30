import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
} from '../api/notifications';
import type { NotificationItem } from '../types';

const NAV_ITEMS = [
  { to: '/map', label: 'Bản đồ 3D', roles: ['Admin', 'Manager', 'Staff'], path: 'M9 20l-5.4-2.7A1 1 0 013 16.4V5.6a1 1 0 011.4-.9L9 7m0 13l6-3m-6 3V7m6 10l4.6 2.3A1 1 0 0021 18.4V7.6a1 1 0 00-.6-.9L15 4m0 13V4m0 0L9 7' },
  { to: '/dashboard', label: 'Dashboard', roles: ['Admin', 'Manager'], path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: '/maintenance/schedules', label: 'Lịch bảo trì', roles: ['Admin', 'Manager'], path: 'M8 7V3m8 4V3M4 11h16M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z' },
  { to: '/stats', label: 'Thống kê', roles: ['Admin', 'Manager'], path: 'M11 3v18m-6-8l6-6 4 4 4-4' },
  { to: '/activity-logs', label: 'Nhật ký hoạt động', roles: ['Admin'], path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z' },
  { to: '/notifications/new', label: 'Tạo thông báo', roles: ['Admin', 'Manager'], path: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 01-6 0m3-9v4m-2-2h4' },
  { to: '/help', label: 'Trợ giúp', roles: ['Admin', 'Manager', 'Staff'], path: 'M8.25 9a3.75 3.75 0 117.1 1.7c-.9.5-1.6 1.2-1.6 2.3m-1.5 4h.01M12 22a10 10 0 100-20 10 10 0 000 20z' },
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

        <div className="flex-1 space-y-1 px-2 py-4">
          {NAV_ITEMS.filter((item) => hasAnyRole(user?.roles, item.roles)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-green-600/20 text-green-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon path={item.path} />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="border-t border-gray-800 px-3 py-3">
          <div className="mb-2.5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-bold uppercase">
              {user?.username?.[0] ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">{user?.username}</p>
              <p className="truncate text-[10px] text-gray-500">{user?.roles.join(', ')}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-white">
            <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
