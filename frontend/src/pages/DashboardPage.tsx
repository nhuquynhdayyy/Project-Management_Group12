import { useEffect, useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { fetchTrees } from '../api/trees';
import {
  fetchAllTasks,
  fetchOverdueTasks,
  fetchStaffPerformance,
  exportTasks,
} from '../api/maintenance';
import { useAuth } from '../context/AuthContext';
import type {
  Tree,
  MaintenanceTask,
  HealthStatus,
  OverdueTask,
  StaffPerformance,
} from '../types';

const HEALTH_COLORS: Record<HealthStatus, string> = {
  'Tốt': '#22c55e',
  'Yếu': '#eab308',
  'Sâu bệnh': '#f97316',
  'Chết': '#ef4444',
};

const BAR_COLOR = '#34d399';

type TimeFilter = '7d' | '30d' | 'custom';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getRangeStart(days: number): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function dateRange(from: Date, to: Date): string[] {
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

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-5 flex items-start gap-4 border border-gray-700">
      <div className={`p-2.5 rounded-lg ${accent} shrink-0`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function ChartTooltip({
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
export default function DashboardPage() {
  const { user } = useAuth();
  const [trees, setTrees] = useState<Tree[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');
  const [customFrom, setCustomFrom] = useState(toDateInputValue(getRangeStart(7)));
  const [customTo, setCustomTo] = useState(toDateInputValue(new Date()));

  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState('');

  const canExport = user?.roles.some((r) => r === 'Admin' || r === 'Manager') ?? false;

  useEffect(() => {
    Promise.all([fetchTrees(), fetchAllTasks(), fetchStaffPerformance(), fetchOverdueTasks()])
      .then(([treeData, taskData, staffData, overdueData]) => {
        setTrees(treeData);
        setTasks(taskData);
        setStaffPerformance(staffData);
        setOverdueTasks(overdueData);
      })
      .catch(() => setError('Khong the tai du lieu. Vui long thu lai.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleExport(format: 'xlsx' | 'pdf') {
    setExportError('');
    const setExporting = format === 'xlsx' ? setExportingXlsx : setExportingPdf;
    setExporting(true);

    try {
      const blob = await exportTasks({
        format,
        from: exportFrom || undefined,
        to: exportTo || undefined,
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `maintenance-report-${Date.now()}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Xuat file that bai. Vui long thu lai.';
      setExportError(message);
    } finally {
      setExporting(false);
    }
  }

  const totalTrees = trees.length;
  const activeTasks = tasks.filter((t) => t.status === 'Pending' || t.status === 'In_Progress').length;
  const dangerCount = trees.filter((t) => t.health_status === 'Chết' || t.health_status === 'Sâu bệnh').length;

  const rangeStart = useMemo(() => {
    if (timeFilter === '30d') return getRangeStart(30);
    if (timeFilter === 'custom') return new Date(`${customFrom}T00:00:00`);
    return getRangeStart(7);
  }, [timeFilter, customFrom]);

  const rangeEnd = useMemo(() => {
    if (timeFilter === 'custom') return new Date(`${customTo}T23:59:59`);
    return new Date(`${toDateInputValue(new Date())}T23:59:59`);
}, [timeFilter, customTo]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const scheduled = new Date(task.scheduled_date);
        return scheduled >= rangeStart && scheduled <= rangeEnd;
      }),
    [tasks, rangeStart, rangeEnd],
  );

  const healthData = useMemo(
    () =>
      (['Tốt', 'Yếu', 'Sâu bệnh', 'Chết'] as HealthStatus[]).map((status) => ({
        name: status,
        value: trees.filter((t) => t.health_status === status).length,
      })),
    [trees],
  );

  const speciesData = useMemo(() => {
    const speciesMap = new Map<string, number>();
    for (const tree of trees) {
      const name = tree.species?.common_name ?? 'Khong ro';
      speciesMap.set(name, (speciesMap.get(name) ?? 0) + 1);
    }
    return [...speciesMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [trees]);

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

  const completedByDay = useMemo(
    () =>
      days.map((day) => ({
        date: formatDate(day),
        completed: filteredTasks.filter(
          (t) => t.status === 'Completed' && t.completed_at?.slice(0, 10) === day,
        ).length,
      })),
    [days, filteredTasks],
  );

  const staffChartData = useMemo(() => {
    const completedByStaffMap = new Map<string, number>();
    for (const task of filteredTasks) {
      if (task.status !== 'Completed') continue;
      const taskWithUser = task as OverdueTask;
      const username = taskWithUser.assignedUser?.username ?? `User #${task.assigned_to}`;
      completedByStaffMap.set(username, (completedByStaffMap.get(username) ?? 0) + 1);
    }

    const localData = [...completedByStaffMap.entries()]
      .map(([username, completed]) => ({ username, completed }))
      .sort((a, b) => b.completed - a.completed);

    if (localData.length > 0) return localData;

    return staffPerformance
      .map((item) => ({ username: item.username, completed: item.completed }))
      .sort((a, b) => b.completed - a.completed);
  }, [filteredTasks, staffPerformance]);

  const overdueRows = useMemo(() => {
    return overdueTasks
      .filter((task) => {
        const scheduled = new Date(task.scheduled_date);
        return scheduled >= rangeStart && scheduled <= rangeEnd;
      })
      .map((task) => {
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
      })
      .sort((a, b) => (b.overdue_days ?? 0) - (a.overdue_days ?? 0));
  }, [overdueTasks, rangeStart, rangeEnd]);

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
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tong quan he thong quan ly cay xanh do thi - Da Nang</p>
      </div>

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
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 [color-scheme:dark]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Den ngay</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 [color-scheme:dark]"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {canExport && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Xuat bao cao bao tri</h3>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Tu ngay</label>
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className="bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent [color-scheme:dark]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Den ngay</label>
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className="bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent [color-scheme:dark]"
              />
            </div>

            <button
              onClick={() => handleExport('xlsx')}
              disabled={exportingXlsx || exportingPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {exportingXlsx ? 'Dang xuat...' : 'Xuat Excel'}
            </button>

            <button
              onClick={() => handleExport('pdf')}
              disabled={exportingXlsx || exportingPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
{exportingPdf ? 'Dang xuat...' : 'Xuat PDF'}
            </button>
          </div>

          {exportError && (
            <div className="mt-3 text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              {exportError}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Tong so cay"
          value={totalTrees}
          sub="Trong toan he thong"
          accent="bg-green-600/20"
          icon={<span className="text-green-400">T</span>}
        />
        <KpiCard
          label="Cong viec dang xu ly"
          value={activeTasks}
          sub="Pending + In Progress"
          accent="bg-blue-600/20"
          icon={<span className="text-blue-400">CV</span>}
        />
        <KpiCard
          label="Canh bao nguy hiem"
          value={dangerCount}
          sub="Sau benh + Chet"
          accent="bg-red-600/20"
          icon={<span className="text-red-400">!</span>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Section title="Phan bo tinh trang suc khoe">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={healthData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                label={({ percent }) => (percent && percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : '')}
                labelLine={false}
              >
                {healthData.map((entry) => (
                  <Cell key={entry.name} fill={HEALTH_COLORS[entry.name as HealthStatus] ?? '#6b7280'} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend formatter={(value) => <span className="text-xs text-gray-300">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Cong viec hoan thanh theo ngay">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={completedByDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="completed"
                name="Hoan thanh"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ fill: '#34d399', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Section>
      </div>
<Section title="So luong cay theo loai">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={speciesData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} interval={0} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="So cay" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Section title="Hieu suat Nhan vien">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={staffChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="username" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="completed" name="Task hoan thanh" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Task Qua Han">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs uppercase text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="py-2 pr-3">Ten cay</th>
                  <th className="py-2 pr-3">Nhan vien phu trach</th>
                  <th className="py-2 pr-3">Ngay hen</th>
                  <th className="py-2">So ngay tre</th>
                </tr>
              </thead>
              <tbody>
                {overdueRows.map((task) => (
                  <tr
                    key={task.id}
                    className={`border-b border-gray-800 ${(task.overdue_days ?? 0) > 7 ? 'bg-red-950/30' : ''}`}
                  >
                    <td className="py-2 pr-3">{task.tree_name}</td>
                    <td className="py-2 pr-3">{task.staff_name}</td>
                    <td className="py-2 pr-3">{new Date(task.scheduled_date).toLocaleDateString('vi-VN')}</td>
                    <td className={`py-2 font-semibold ${(task.overdue_days ?? 0) > 7 ? 'text-red-400' : 'text-amber-300'}`}>
                      {task.overdue_days ?? 0}
                    </td>
                  </tr>
                ))}
                {overdueRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">
                      Khong co task qua han trong khoang thoi gian da chon.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
</Section>
      </div>
    </div>
  );
}
