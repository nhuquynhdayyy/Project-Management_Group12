import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { exportTasks, fetchAllTasks, fetchOverdueTasks } from '../../api/maintenance';
import { useAuth } from '../../context/AuthContext';
import type { MaintenanceTask, OverdueTask, TaskType } from '../../types';
import {
  ChartTooltip,
  DashboardPageFrame,
  PAGE_SIZE,
  PaginationControls,
  Section,
  TimeFilterControls,
  filterTasksByRange,
  formatDate,
  normalizeOverdueTask,
  useTimeRange,
} from './dashboardShared';

const TASK_COLORS = ['#34d399', '#60a5fa', '#f59e0b', '#f87171'];

export default function TaskStatsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState('');
  const timeRange = useTimeRange();

  const canExport = user?.roles.some((role) => role === 'Admin' || role === 'Manager') ?? false;

  useEffect(() => {
    Promise.all([fetchAllTasks(), fetchOverdueTasks()])
      .then(([taskData, overdueData]) => {
        setTasks(taskData);
        setOverdueTasks(overdueData);
      })
      .catch(() => setError('Khong the tai du lieu bao tri. Vui long thu lai.'))
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

  const filteredTasks = useMemo(
    () => filterTasksByRange(tasks, timeRange.rangeStart, timeRange.rangeEnd),
    [tasks, timeRange.rangeStart, timeRange.rangeEnd],
  );

  const completedByDay = useMemo(
    () =>
      timeRange.days.map((day) => ({
        date: formatDate(day),
        completed: filteredTasks.filter(
(task) => task.status === 'Completed' && task.completed_at?.slice(0, 10) === day,
        ).length,
      })),
    [timeRange.days, filteredTasks],
  );

  const taskTypeData = useMemo(() => {
    const taskTypes = [...new Set(tasks.map((task) => task.task_type))] as TaskType[];
    return taskTypes.map((taskType) => ({
      name: taskType,
      value: filteredTasks.filter((task) => task.task_type === taskType).length,
    }));
  }, [tasks, filteredTasks]);

  const overdueRows = useMemo(
    () =>
      overdueTasks
        .filter((task) => {
          const scheduled = new Date(task.scheduled_date);
          return scheduled >= timeRange.rangeStart && scheduled <= timeRange.rangeEnd;
        })
        .map(normalizeOverdueTask)
        .sort((a, b) => (b.overdue_days ?? 0) - (a.overdue_days ?? 0)),
    [overdueTasks, timeRange.rangeStart, timeRange.rangeEnd],
  );
  const totalPages = Math.max(1, Math.ceil(overdueRows.length / PAGE_SIZE));
  const visibleTasks = overdueRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <DashboardPageFrame
      title="Thong ke Bao tri"
      subtitle="Theo doi tien do task, task qua han va bao cao xuat file"
      loading={loading}
      error={error}
    >
      <TimeFilterControls {...timeRange} />

      {canExport && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Xuat bao cao bao tri</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Tu ngay</label>
              <input
                type="date"
                value={exportFrom}
                onChange={(event) => setExportFrom(event.target.value)}
                className="bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Den ngay</label>
              <input
                type="date"
                value={exportTo}
                onChange={(event) => setExportTo(event.target.value)}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
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

        <Section title="Phan loai task">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={taskTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                {taskTypeData.map((entry, index) => (
                  <Cell key={entry.name} fill={TASK_COLORS[index % TASK_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend formatter={(value) => <span className="text-xs text-gray-300">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section title="Task qua han">
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
              {visibleTasks.map((task) => (
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
              {visibleTasks.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">
                    Khong co task qua han trong khoang thoi gian da chon.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
      </Section>
    </DashboardPageFrame>
  );
}
