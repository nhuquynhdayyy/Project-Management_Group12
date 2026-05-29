import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { fetchUsers, registerUser, updateUserRole, updateUserStatus } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import type { DashboardUser, UserRole } from '../../types';
import { DashboardPageFrame, PAGE_SIZE, PaginationControls, Section } from './dashboardShared';

const ROLES: UserRole[] = ['Admin', 'Manager', 'Staff'];

function getPrimaryRole(user: DashboardUser): UserRole {
  return user.roles[0]?.role_name ?? 'Staff';
}

function roleBadgeClass(role: UserRole): string {
  if (role === 'Admin') return 'bg-red-600/20 text-red-300 border-red-700/50';
  if (role === 'Manager') return 'bg-blue-600/20 text-blue-300 border-blue-700/50';
  return 'bg-green-600/20 text-green-300 border-green-700/50';
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('Staff');

  function loadUsers() {
    setLoading(true);
    setError('');
    fetchUsers()
      .then(setUsers)
      .catch(() => setError('Khong the tai danh sach users. Vui long thu lai.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((dashboardUser) => {
      const primaryRole = getPrimaryRole(dashboardUser);
      const matchesRole = roleFilter === 'All' || primaryRole === roleFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        dashboardUser.username.toLowerCase().includes(normalizedQuery) ||
        (dashboardUser.full_name ?? '').toLowerCase().includes(normalizedQuery);

      return matchesRole && matchesQuery;
    });
  }, [users, query, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const visibleUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetForm() {
    setUsername('');
    setPassword('');
    setFullName('');
    setRole('Staff');
    setFormError('');
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    if (!username.trim() || !password.trim() || !fullName.trim()) {
      setFormError('Vui long nhap day du thong tin.');
      return;
    }
if (password.length < 6) {
      setFormError('Mat khau toi thieu 6 ky tu.');
      return;
    }

    setSaving(true);
    try {
      await registerUser({
        username: username.trim(),
        password,
        full_name: fullName.trim(),
        roles: [role],
      });
      setIsModalOpen(false);
      resetForm();
      loadUsers();
    } catch {
      setFormError('Tao tai khoan that bai. Vui long thu lai.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(dashboardUser: DashboardUser) {
    if (dashboardUser.id === user?.id && dashboardUser.is_active) {
      window.alert('Khong duoc khoa chinh tai khoan dang dang nhap.');
      return;
    }

    const nextStatus = !dashboardUser.is_active;
    const action = nextStatus ? 'mo khoa' : 'khoa';
    if (!window.confirm(`Xac nhan ${action} tai khoan ${dashboardUser.username}?`)) return;

    try {
      await updateUserStatus(dashboardUser.id, nextStatus);
      loadUsers();
    } catch {
      setError('Cap nhat trang thai that bai. Vui long thu lai.');
    }
  }

  async function handleRoleChange(dashboardUser: DashboardUser, nextRole: UserRole) {
    const currentRole = getPrimaryRole(dashboardUser);
    if (nextRole === currentRole) return;
    if (!window.confirm(`Xac nhan doi role ${dashboardUser.username} tu ${currentRole} sang ${nextRole}?`)) return;

    try {
      await updateUserRole(dashboardUser.id, nextRole);
      loadUsers();
    } catch {
      setError('Doi role that bai. Vui long thu lai.');
    }
  }

  return (
    <DashboardPageFrame
      title="Quan ly Users"
      subtitle="Quan ly tai khoan va phan quyen nguoi dung"
      loading={loading}
      error={error}
    >
      <Section title="Danh sach users">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Tim theo ten hoac username"
              className="w-64 max-w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
            />
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as UserRole | 'All');
                setPage(1);
              }}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
            >
              <option value="All">All</option>
              {ROLES.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}
                </option>
              ))}
            </select>
          </div>

          <button
onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
          >
            Them tai khoan
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="border-b border-gray-700 text-xs uppercase text-gray-400">
              <tr>
                <th className="py-2 pr-3">Ten</th>
                <th className="py-2 pr-3">Username</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Trang thai</th>
                <th className="py-2 pr-3">Ngay tao</th>
                <th className="py-2">Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((dashboardUser) => {
                const primaryRole = getPrimaryRole(dashboardUser);
                return (
                  <tr key={dashboardUser.id} className="border-b border-gray-800">
                    <td className="py-2 pr-3 font-medium text-white">{dashboardUser.full_name ?? '-'}</td>
                    <td className="py-2 pr-3">{dashboardUser.username}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${roleBadgeClass(primaryRole)}`}>
                        {primaryRole}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          dashboardUser.is_active ? 'bg-green-600/20 text-green-300' : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {dashboardUser.is_active ? 'Hoat dong' : 'Bi khoa'}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{new Date(dashboardUser.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(dashboardUser)}
                          disabled={dashboardUser.id === user?.id && dashboardUser.is_active}
                          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {dashboardUser.is_active ? 'Khoa' : 'Mo khoa'}
                        </button>
                        <select
                          value={primaryRole}
                          onChange={(event) => handleRoleChange(dashboardUser, event.target.value as UserRole)}
className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-green-500"
                        >
                          {ROLES.map((roleOption) => (
                            <option key={roleOption} value={roleOption}>
                              {roleOption}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">
                    Khong co user phu hop.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
      </Section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Them tai khoan</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="rounded-md px-2 py-1 text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                X
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleCreateUser}>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Username</label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Mat khau</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Ho ten</label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Role</label>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
                >
                  {ROLES.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {roleOption}
                    </option>
                  ))}
                </select>
              </div>

              {formError && <div className="rounded-lg border border-red-800/40 bg-red-900/20 px-3 py-2 text-sm text-red-400">{formError}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  Huy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Dang tao...' : 'Tao tai khoan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardPageFrame>
  );
}
