import { useMemo, useState, type ReactNode } from 'react';
import type { HealthStatus, MaintenanceTask, OverdueTask, Tree } from '../../types';

export const HEALTH_COLORS: Record<HealthStatus, string> = {
  Tốt: '#22c55e',
  Yếu: '#eab308',
  'Sâu bệnh': '#f97316',
  Chết: '#ef4444',
};

export const BAR_COLOR = '#34d399';
export const PAGE_SIZE = 5;

export type TimeFilter = '7d' | '30d' | 'custom';
export type TrendDirection = 'up' | 'down' | 'flat';

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getRangeStart(days: number): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

export function formatDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function dateRange(from: Date, to: Date): string[] {
  const result: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

export function useTimeRange() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');
  const [customFrom, setCustomFrom] = useState(toDateInputValue(getRangeStart(7)));
  const [customTo, setCustomTo] = useState(toDateInputValue(new Date()));

  const rangeStart = useMemo(() => {
    if (timeFilter === '30d') return getRangeStart(30);
    if (timeFilter === 'custom') return new Date(`${customFrom}T00:00:00`);
    return getRangeStart(7);
  }, [timeFilter, customFrom]);

  const rangeEnd = useMemo(() => {
    if (timeFilter === 'custom') return new Date(`${customTo}T23:59:59`);
    return new Date(`${toDateInputValue(new Date())}T23:59:59`);
  }, [timeFilter, customTo]);

  const days = useMemo(() => {
    if (timeFilter === '30d') return dateRange(getRangeStart(30), new Date());
    if (timeFilter === 'custom') {
      const from = new Date(`${customFrom}T00:00:00`);
      const to = new Date(`${customTo}T00:00:00`);
      if (from > to) return [];
      return dateRange(from, to);
    }
    return dateRange(getRangeStart(7), new Date());
  }, [timeFilter, customFrom, customTo]);

  return {
    timeFilter,
    setTimeFilter,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    rangeStart,
    rangeEnd,
    days,
  };
}

export function filterTasksByRange(
  tasks: MaintenanceTask[],
  rangeStart: Date,
  rangeEnd: Date,
): MaintenanceTask[] {
  return tasks.filter((task) => {
    const scheduled = new Date(task.scheduled_date);
    return scheduled >= rangeStart && scheduled <= rangeEnd;
  });
}

export function normalizeOverdueTask(task: OverdueTask) {
  const fallbackOverdueDays = Math.max(
    0,
    Math.floor((new Date().getTime() - new Date(task.scheduled_date).getTime()) / (24 * 60 * 60 * 1000)),
  );

  return {
...task,
    tree_name: task.tree_name ?? task.tree?.tree_code ?? `Cay #${task.tree_id}`,
    staff_name:
      task.staff_name ??
      task.assignedUser?.full_name ??
      task.assignedUser?.username ??
      `User #${task.assigned_to}`,
    overdue_days: task.overdue_days ?? fallbackOverdueDays,
  };
}

export function isDangerTree(tree: Tree): boolean {
  return tree.health_status === 'Chết' || tree.health_status === 'Sâu bệnh';
}

export function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
  trend,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent: string;
  icon: ReactNode;
  trend?: {
    direction: TrendDirection;
    value: number;
  };
}) {
  const trendColor =
    trend?.direction === 'up' ? 'text-green-400' : trend?.direction === 'down' ? 'text-red-400' : 'text-gray-500';
  const trendIcon = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→';

  return (
    <div className="bg-gray-800 rounded-xl p-5 flex items-start gap-4 border border-gray-700">
      <div className={`p-2.5 rounded-lg ${accent} shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && (
            <span className={`text-xs font-semibold ${trendColor}`}>
              {trendIcon} {Math.abs(trend.value)}
            </span>
          )}
        </div>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

export function DashboardPageFrame({
  title,
  subtitle,
  loading,
  error,
  children,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  error: string;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-green-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm text-gray-400">Dang tai du lieu...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-950">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 px-6 py-6">
<div className="mb-6">
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function TimeFilterControls({
  timeFilter,
  setTimeFilter,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
}: ReturnType<typeof useTimeRange>) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Bo loc thoi gian</h3>
      <div className="flex flex-wrap items-end gap-3">
        <button
          onClick={() => setTimeFilter('7d')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
            timeFilter === '7d' ? 'bg-green-600 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
          }`}
        >
          7 ngay
        </button>
        <button
          onClick={() => setTimeFilter('30d')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
            timeFilter === '30d' ? 'bg-green-600 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
          }`}
        >
          30 ngay
        </button>
        <button
          onClick={() => setTimeFilter('custom')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
            timeFilter === 'custom' ? 'bg-green-600 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Tuy chon
        </button>

        {timeFilter === 'custom' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Tu ngay</label>
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Den ngay</label>
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 [color-scheme:dark]"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-gray-400 mb-1">{label}</p>}
{payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm text-gray-400">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-md bg-gray-900 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Truoc
      </button>
      <span>
        Trang {page}/{totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-3 py-1.5 rounded-md bg-gray-900 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Sau
      </button>
    </div>
  );
}
