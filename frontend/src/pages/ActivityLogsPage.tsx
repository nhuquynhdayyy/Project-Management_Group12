import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchActivityLogs } from '../api/activityLogs';
import type { ActivityLog, ActivityLogFilters, AuditAction } from '../types';

const ACTIONS: Array<AuditAction | ''> = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'COMPLETE'];
const ENTITY_TYPES = ['', 'auth', 'tree', 'task'];
const DEFAULT_LIMIT = 10;

function formatJson(value: Record<string, unknown> | null): string {
  if (!value) return '-';
  return JSON.stringify(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
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
      <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/70">
        <h1 className="text-xl font-semibold">Nhật ký hoạt động</h1>
        <p className="mt-1 text-sm text-slate-400">
          Theo dõi thao tác quản trị, cây xanh, bảo trì và đăng nhập hệ thống.
        </p>
      </div>

      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 border-b border-slate-800">
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
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="px-3 py-3">{log.user?.username ?? `User #${log.user_id ?? '-'}`}</td>
                  <td className="px-3 py-3">
                    <span className="rounded bg-green-500/15 px-2 py-1 text-xs font-semibold text-green-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-3">{log.entity_type}</td>
                  <td className="px-3 py-3">{log.entity_id ?? '-'}</td>
                  <td className="px-3 py-3 max-w-xl">
                    <div className="grid gap-1 font-mono text-xs text-slate-300">
                      <span>Before: {formatJson(log.old_value)}</span>
                      <span>After: {formatJson(log.new_value)}</span>
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
