import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchActivityLogs } from '../api/activityLogs';
import type { ActivityLog, ActivityLogFilters, AuditAction } from '../types';

const ACTIONS: Array<AuditAction | ''> = [
  '',
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'CREATE_TASK',
  'UPDATE_TASK',
  'CHANGE_STATUS',
  'COMPLETE',
  'COMPLETE_TASK',
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'CHANGE_ROLE',
];
const ENTITY_TYPES = ['', 'auth', 'tree', 'task', 'maintenance', 'maintenance_task', 'user'];
const DEFAULT_LIMIT = 10;

const QUICK_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'tree', label: 'Cây xanh' },
  { value: 'task', label: 'Công việc' },
  { value: 'user', label: 'Người dùng' },
  { value: 'auth', label: 'Đăng nhập' },
];

const ACTION_BADGES: Partial<Record<AuditAction, string>> = {
  CREATE: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  CREATE_TASK: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  CREATE_USER: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  UPDATE: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  UPDATE_TASK: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  UPDATE_USER: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  DELETE: 'bg-red-500/15 text-red-300 ring-red-500/30',
  DELETE_USER: 'bg-red-500/15 text-red-300 ring-red-500/30',
  LOGIN: 'bg-blue-500/15 text-blue-300 ring-blue-500/30',
  LOGIN_FAILED: 'bg-red-500/15 text-red-300 ring-red-500/30',
  LOGOUT: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  COMPLETE: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
  COMPLETE_TASK: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
  CHANGE_STATUS: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  CHANGE_ROLE: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
};

const FIELD_LABELS: Record<string, string> = {
  tree_code: 'Tên cây',
  name: 'Tên cây',
  common_name: 'Tên cây',
  height: 'Chiều cao',
  height_m: 'Chiều cao',
  health_status: 'Tình trạng',
  trunk_diameter_cm: 'Đường kính thân',
  canopy_diameter_m: 'Đường kính tán',
  tilt_degree: 'Độ nghiêng',
  planting_year: 'Năm trồng',
  species_id: 'Loài cây',
  area_id: 'Khu vực',
  task_type: 'Loại bảo trì',
  status: 'Trạng thái',
  assigned_to: 'Người phụ trách',
  scheduled_date: 'Ngày hẹn',
  completed_at: 'Thời điểm hoàn thành',
  username: 'Tài khoản',
  roles: 'Vai trò',
  role: 'Vai trò',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

function getTreeName(log: ActivityLog): string {
  const source = log.new_value ?? log.old_value ?? {};
  const name =
    source.common_name ?? source.tree_name ?? source.name ?? source.tree_code ?? `Cây #${log.entity_id ?? '-'}`;
  return String(name);
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.map((item) => formatValue(key, item)).join(', ');
  if (value instanceof Date) return formatDate(value.toISOString());
  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    if ('coordinates' in objectValue && Array.isArray(objectValue.coordinates)) {
      return objectValue.coordinates.join(', ');
    }
    return Object.values(objectValue)
      .map((item) => formatValue(key, item))
      .filter(Boolean)
      .join(', ');
  }

  const text = String(value);
  if (key === 'height_m') return `${text}m`;
  if (key === 'trunk_diameter_cm') return `${text}cm`;
  if (key === 'canopy_diameter_m') return `${text}m`;
  if (key === 'tilt_degree') return `${text}°`;
  return text;
}

function getChangedKeys(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
): string[] {
  const keys = new Set([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})]);
  return [...keys].filter((key) => {
    const before = oldValue?.[key];
    const after = newValue?.[key];
    return JSON.stringify(before) !== JSON.stringify(after);
  });
}

function describeActivityLog(log: ActivityLog): string[] {
  const actor = log.user?.username ?? log.new_value?.username ?? `User #${log.user_id ?? '-'}`;

  if (log.action === 'LOGIN') return [`${actor} đăng nhập hệ thống`];
  if (log.action === 'LOGOUT') return [`${actor} đăng xuất hệ thống`];
  if (log.action === 'LOGIN_FAILED') return [`${actor} đăng nhập thất bại`];

  if (log.entity_type === 'tree' && log.action === 'CREATE') {
    return [`Tạo cây ${getTreeName(log)} (#${log.entity_id ?? '-'})`];
  }

  if (log.entity_type === 'tree' && log.action === 'DELETE') {
    return [`Xóa cây ${getTreeName(log)} (#${log.entity_id ?? '-'})`];
  }

  const changedKeys = getChangedKeys(log.old_value, log.new_value);
  if (changedKeys.length > 0) {
    return changedKeys.map((key) => {
      const label = FIELD_LABELS[key] ?? key;
      return `${label}: ${formatValue(key, log.old_value?.[key])} → ${formatValue(key, log.new_value?.[key])}`;
    });
  }

  if (log.action === 'CREATE_TASK' || (log.entity_type === 'task' && log.action === 'CREATE')) {
    return [`Tạo lịch bảo trì #${log.entity_id ?? '-'}`];
  }

  if (log.action === 'COMPLETE_TASK' || log.action === 'COMPLETE') {
    return [`Hoàn thành bảo trì #${log.entity_id ?? '-'}`];
  }

  return [`${log.action} ${log.entity_type} #${log.entity_id ?? '-'}`];
}

function getActionBadgeClass(action: AuditAction): string {
  return ACTION_BADGES[action] ?? 'bg-slate-500/15 text-slate-300 ring-slate-500/30';
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: DEFAULT_LIMIT, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityLogFilters>({
    page: 1,
    limit: DEFAULT_LIMIT,
    search: '',
    action: '',
    entityType: '',
    from: '',
    to: '',
  });

  const loadLogs = useCallback(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);

    fetchActivityLogs(filters)
      .then((result) => {
        if (!isActive) return;
        setLogs(result.data);
        setMeta(result.meta);
      })
      .catch(() => {
        if (!isActive) return;
        setError('Không thể tải nhật ký hoạt động');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [filters]);

  // The fetch effect owns the loading/error lifecycle for the table request.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => loadLogs(), [loadLogs]);

  const currentRange = useMemo(() => {
    if (meta.total === 0) return '0 / 0';
    const start = (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.page * meta.limit, meta.total);
    return `${start}-${end} / ${meta.total}`;
  }, [meta]);

  function updateFilter(next: Partial<ActivityLogFilters>) {
    setFilters((current) => ({ ...current, ...next, page: 1 }));
  }

  function goToPage(page: number) {
    setFilters((current) => ({ ...current, page }));
  }

  return (
    <section className="h-full overflow-auto bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/70 px-6 py-5">
        <h1 className="text-xl font-semibold">Nhật ký hoạt động</h1>
        <p className="mt-1 text-sm text-slate-400">
          Theo dõi thao tác quản trị, cây xanh, bảo trì và đăng nhập hệ thống.
        </p>
      </div>

      <div className="border-b border-slate-800 px-6 py-4">
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Bộ lọc nhanh nhật ký">
          {QUICK_FILTERS.map((quickFilter) => {
            const isActive = filters.entityType === quickFilter.value;
            return (
              <button
                key={quickFilter.value || 'all'}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`h-9 rounded-md px-4 text-sm font-medium transition ${
                  isActive
                    ? 'border-0 bg-[#16a34a] text-white'
                    : 'border border-slate-600 bg-transparent text-slate-400 hover:bg-slate-800'
                }`}
                onClick={() => updateFilter({ entityType: quickFilter.value })}
              >
                {quickFilter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-slate-800 px-6 py-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="text-xs font-medium text-slate-300 xl:col-span-2">
          Tìm kiếm
          <input
            aria-label="Tìm kiếm"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
            value={filters.search}
            onChange={(event) => updateFilter({ search: event.target.value })}
            placeholder="User, action, entity, nội dung"
          />
        </label>

        <label className="text-xs font-medium text-slate-300">
          User
          <input
            aria-label="User"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
            type="number"
            min="1"
            value={filters.userId ?? ''}
            onChange={(event) =>
              updateFilter({ userId: event.target.value ? Number(event.target.value) : undefined })
            }
            placeholder="User ID"
          />
        </label>

        <label className="text-xs font-medium text-slate-300">
          Action
          <select
            aria-label="Action"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
            value={filters.action}
            onChange={(event) => updateFilter({ action: event.target.value as AuditAction | '' })}
          >
            {ACTIONS.map((action) => (
              <option key={action || 'all'} value={action}>
                {action || 'Tất cả'}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-slate-300">
          Entity Type
          <select
            aria-label="Entity Type"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
            value={filters.entityType}
            onChange={(event) => updateFilter({ entityType: event.target.value })}
          >
            {ENTITY_TYPES.map((entityType) => (
              <option key={entityType || 'all'} value={entityType}>
                {entityType || 'Tất cả'}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-slate-300">
          Từ ngày
          <input
            aria-label="Từ ngày"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
            type="date"
            value={filters.from}
            onChange={(event) => updateFilter({ from: event.target.value })}
          />
        </label>

        <label className="text-xs font-medium text-slate-300">
          Đến ngày
          <input
            aria-label="Đến ngày"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
            type="date"
            value={filters.to}
            onChange={(event) => updateFilter({ to: event.target.value })}
          />
        </label>
      </div>

      {error ? <div className="mx-6 mt-4 rounded-md bg-red-950 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      <div className="px-6 py-4">
        <div className="overflow-x-auto rounded-md border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">Thời gian</th>
                <th className="px-3 py-3 text-left font-semibold">Người thực hiện</th>
                <th className="px-3 py-3 text-left font-semibold">Action</th>
                <th className="px-3 py-3 text-left font-semibold">Entity Type</th>
                <th className="px-3 py-3 text-left font-semibold">Entity ID</th>
                <th className="px-3 py-3 text-left font-semibold">Nội dung thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/60">
                  <td className="whitespace-nowrap px-3 py-3">{formatDate(log.created_at)}</td>
                  <td className="px-3 py-3">{log.user?.username ?? `User #${log.user_id ?? '-'}`}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded px-2 py-1 text-xs font-semibold ring-1 ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-3">{log.entity_type}</td>
                  <td className="px-3 py-3">{log.entity_id ?? '-'}</td>
                  <td className="max-w-xl px-3 py-3">
                    <div className="grid gap-1 text-sm text-slate-200">
                      {describeActivityLog(log).map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && logs.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-400" colSpan={6}>
                    Không có nhật ký phù hợp
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
          <span>{isLoading ? 'Đang tải...' : currentRange}</span>
          <div className="flex gap-2">
            <button
              className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40"
              disabled={meta.page <= 1 || isLoading}
              onClick={() => goToPage(meta.page - 1)}
            >
              Trước
            </button>
            <button
              className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40"
              disabled={meta.page >= meta.totalPages || isLoading}
              onClick={() => goToPage(meta.page + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
