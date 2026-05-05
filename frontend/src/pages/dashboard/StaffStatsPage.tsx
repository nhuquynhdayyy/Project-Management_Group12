import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchAllTasks, fetchStaffPerformance } from '../../api/maintenance';
import { useAuth } from '../../context/AuthContext';
import type { MaintenanceTask, OverdueTask, StaffPerformance } from '../../types';
import {
  ChartTooltip,
  DashboardPageFrame,
  Section,
  TimeFilterControls,
  filterTasksByRange,
  getRangeStart,
  useTimeRange,
} from './dashboardShared';

const RANK_COLORS = ['#047857', '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
const LINE_COLORS = ['#34d399', '#60a5fa', '#f59e0b', '#f87171', '#a78bfa', '#22d3ee'];

interface StaffChartItem {
  username: string;
  completed: number;
}

interface RadarMetric {
  metric: string;
  value: number;
}

type WeeklyTrendRow = {
  week: string;
} & Record<string, string | number>;

function getTaskStaffName(task: MaintenanceTask): string {
  const taskWithUser = task as OverdueTask;
  return taskWithUser.assignedUser?.username ?? `User #${task.assigned_to}`;
}

function getTaskStaffAreaId(task: MaintenanceTask): number | null {
  const taskWithUser = task as OverdueTask;
  return taskWithUser.assignedUser?.assigned_area_id ?? null;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isCompletedOnTime(task: MaintenanceTask): boolean {
  return (
    task.status === 'Completed' &&
    !!task.completed_at &&
    task.completed_at.slice(0, 10) <= task.scheduled_date.slice(0, 10)
  );
}

function isTaskOverdue(task: MaintenanceTask): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (task.status === 'Completed') {
    if (!task.completed_at) return false;
    return task.completed_at.slice(0, 10) > task.scheduled_date.slice(0, 10);
  }

  return new Date(task.scheduled_date) < today;
}

function countWorkingDays(days: string[]): number {
  return Math.max(
    1,
    days.filter((day) => {
      const dayOfWeek = new Date(`${day}T00:00:00`).getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    }).length,
  );
}

function getOnTimeRateClass(rate: number): string {
  if (rate > 80) return 'text-green-400';
  if (rate >= 50) return 'text-amber-300';
  return 'text-red-400';
}

export default function StaffStatsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const timeRange = useTimeRange();

  useEffect(() => {
    Promise.all([fetchAllTasks(), fetchStaffPerformance()])
      .then(([taskData, staffData]) => {
setTasks(taskData);
        setStaffPerformance(staffData);
      })
      .catch(() => setError('Khong the tai du lieu nhan vien. Vui long thu lai.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredTasks = useMemo(
    () => filterTasksByRange(tasks, timeRange.rangeStart, timeRange.rangeEnd),
    [tasks, timeRange.rangeStart, timeRange.rangeEnd],
  );

  const staffChartData = useMemo<StaffChartItem[]>(() => {
    const completedByStaffMap = new Map<string, number>();
    for (const task of filteredTasks) {
      if (task.status !== 'Completed') continue;
      const username = getTaskStaffName(task);
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

  const visibleStaffChartData = useMemo(() => {
    if (user?.roles.includes('Admin')) return staffChartData;
    if (!user?.roles.includes('Manager') || user.assigned_area_id === null || user.assigned_area_id === undefined) {
      return staffChartData;
    }

    const staffInManagerArea = new Set(
      tasks
        .filter((task) => getTaskStaffAreaId(task) === user.assigned_area_id)
        .map((task) => getTaskStaffName(task)),
    );

    return staffChartData.filter((staff) => staffInManagerArea.has(staff.username));
  }, [staffChartData, tasks, user?.assigned_area_id, user?.roles]);

  const visibleStaffNames = useMemo(
    () => new Set(visibleStaffChartData.map((staff) => staff.username)),
    [visibleStaffChartData],
  );

  const visibleStaffPerformance = useMemo(() => {
    const visibleRows = staffPerformance.filter((staff) => visibleStaffNames.has(staff.username));
    return visibleRows.length > 0 ? visibleRows : staffPerformance;
  }, [staffPerformance, visibleStaffNames]);

  useEffect(() => {
    if (!selectedStaff && visibleStaffChartData.length > 0) {
      setSelectedStaff(visibleStaffChartData[0].username);
    }
  }, [selectedStaff, visibleStaffChartData]);

  const selectedPerformance = useMemo(
    () => staffPerformance.find((staff) => staff.username === selectedStaff),
    [staffPerformance, selectedStaff],
  );

  const selectedStaffTasks = useMemo(
    () => tasks.filter((task) => getTaskStaffName(task) === selectedStaff),
    [tasks, selectedStaff],
  );

  const radarData = useMemo<RadarMetric[]>(() => {
    const completed = selectedPerformance?.completed ?? selectedStaffTasks.filter((task) => task.status === 'Completed').length;
    const pending = selectedPerformance?.pending ?? selectedStaffTasks.filter((task) => task.status !== 'Completed').length;
const totalAssigned = Math.max(1, completed + pending);
    const activeDays = selectedPerformance?.activeDays ?? new Set(
      selectedStaffTasks
        .filter((task) => task.status === 'Completed' && task.completed_at)
        .map((task) => task.completed_at?.slice(0, 10) ?? ''),
    ).size;
    const workingDays = countWorkingDays(timeRange.days);
    const diversityScore = selectedPerformance?.diversityScore ?? new Set(
      selectedStaffTasks.filter((task) => task.status === 'Completed').map((task) => task.task_type),
    ).size;

    return [
      { metric: 'Toc do', value: clampScore(100 - (selectedPerformance?.avgDaysLate ?? 0) * 10) },
      { metric: 'So luong', value: clampScore((completed / totalAssigned) * 100) },
      { metric: 'Dung han', value: clampScore(selectedPerformance?.onTimeRate ?? 0) },
      { metric: 'Chuyen can', value: clampScore((activeDays / workingDays) * 100) },
      { metric: 'Da dang', value: clampScore(diversityScore * 20) },
    ];
  }, [selectedPerformance, selectedStaffTasks, timeRange.days]);

  const lastFourWeeks = useMemo(() => {
    const result: { label: string; start: Date; end: Date }[] = [];
    const currentStart = getRangeStart(7);
    for (let index = 3; index >= 0; index -= 1) {
      const start = new Date(currentStart);
      start.setDate(start.getDate() - index * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      result.push({ label: `T-${index}`, start, end });
    }
    return result;
  }, []);

  const weeklyTrendData = useMemo<WeeklyTrendRow[]>(() => {
    const staffNames = visibleStaffChartData.map((staff) => staff.username);
    return lastFourWeeks.map((week) => {
      const row: WeeklyTrendRow = { week: week.label };
      for (const staffName of staffNames) {
        row[staffName] = tasks.filter((task) => {
          const scheduled = new Date(task.scheduled_date);
          return getTaskStaffName(task) === staffName && task.status === 'Completed' && scheduled >= week.start && scheduled <= week.end;
        }).length;
      }
      return row;
    });
  }, [lastFourWeeks, tasks, visibleStaffChartData]);

  const overdueByStaffToday = useMemo(() => {
    const result = new Map<string, number>();
    for (const task of tasks) {
      const staffName = getTaskStaffName(task);
      if (!visibleStaffNames.has(staffName) || !isTaskOverdue(task)) continue;
      result.set(staffName, (result.get(staffName) ?? 0) + 1);
    }
    return result;
  }, [tasks, visibleStaffNames]);

  const totalTeamOverdue = useMemo(
    () => [...overdueByStaffToday.values()].reduce((sum, count) => sum + count, 0),
    [overdueByStaffToday],
  );

  const topOverdueStaff = useMemo(() => {
    const rows = [...overdueByStaffToday.entries()].sort((a, b) => b[1] - a[1]);
    return rows[0] ?? null;
  }, [overdueByStaffToday]);

  const averageOnTimeRate = useMemo(() => {
    if (visibleStaffPerformance.length === 0) return 0;
const total = visibleStaffPerformance.reduce((sum, staff) => sum + (staff.onTimeRate ?? 0), 0);
    return Math.round(total / visibleStaffPerformance.length);
  }, [visibleStaffPerformance]);

  const groupedBarData = useMemo(
    () =>
      visibleStaffChartData.map((staff) => {
        const staffTasks = tasks.filter((task) => getTaskStaffName(task) === staff.username);
        return {
          username: staff.username,
          onTime: staffTasks.filter(isCompletedOnTime).length,
          overdue: staffTasks.filter(isTaskOverdue).length,
        };
      }),
    [tasks, visibleStaffChartData],
  );

  const rankingRows = useMemo(
    () =>
      visibleStaffPerformance
        .map((staff) => ({
          ...staff,
          total: staff.completed + staff.pending,
        }))
        .sort((a, b) => b.completed - a.completed),
    [visibleStaffPerformance],
  );

  const inactiveRows = useMemo(() => {
    const lastSevenDays = getRangeStart(7);
    const activeStaff = new Set<string>();

    for (const task of tasks) {
      const scheduled = new Date(task.scheduled_date);
      if (scheduled < lastSevenDays) continue;
      const taskWithUser = task as OverdueTask;
      activeStaff.add(taskWithUser.assignedUser?.username ?? `User #${task.assigned_to}`);
    }

    return staffPerformance.filter((staff) => !activeStaff.has(staff.username));
  }, [tasks, staffPerformance]);

  return (
    <DashboardPageFrame
      title="Hieu suat Nhan vien"
      subtitle="Theo doi hieu suat hoan thanh va canh bao phan cong"
      loading={loading}
      error={error}
    >
      <TimeFilterControls {...timeRange} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className={`rounded-xl border p-5 ${totalTeamOverdue > 0 ? 'border-red-700 bg-red-950/30' : 'border-gray-700 bg-gray-800'}`}>
          <p className="text-xs uppercase tracking-wider text-gray-400">Tong task tre hom nay</p>
          <p className={`mt-2 text-3xl font-bold ${totalTeamOverdue > 0 ? 'text-red-400' : 'text-white'}`}>{totalTeamOverdue}</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400">Nhan vien tre nhieu nhat</p>
          <p className="mt-2 text-xl font-bold text-white">{topOverdueStaff ? topOverdueStaff[0] : '-'}</p>
          <p className="mt-1 text-sm text-red-400">{topOverdueStaff ? `${topOverdueStaff[1]} task tre` : 'Khong co task tre'}</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400">Ti le dung han TB</p>
          <p className={`mt-2 text-3xl font-bold ${getOnTimeRateClass(averageOnTimeRate)}`}>{averageOnTimeRate}%</p>
        </div>
      </div>

      <Section title="Hieu suat tung nhan vien">
        <ResponsiveContainer width="100%" height={Math.max(260, visibleStaffChartData.length * 42)}>
<BarChart data={visibleStaffChartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="username" tick={{ fill: '#9ca3af', fontSize: 11 }} width={110} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="completed" name="Task hoan thanh" radius={[0, 4, 4, 0]}>
              {visibleStaffChartData.map((entry, index) => (
                <Cell key={entry.username} fill={RANK_COLORS[index] ?? RANK_COLORS[RANK_COLORS.length - 1]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <div className="mt-4">
        <Section title="Dung han va tre han theo nhan vien">
          <ResponsiveContainer width="100%" height={Math.max(280, groupedBarData.length * 44)}>
            <BarChart data={groupedBarData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="username" tick={{ fill: '#9ca3af', fontSize: 11 }} width={110} />
              <Tooltip content={<ChartTooltip />} />
              <Legend formatter={(value) => <span className="text-xs text-gray-300">{value}</span>} />
              <Bar dataKey="onTime" name="Dung han" fill="#22c55e" radius={[0, 4, 4, 0]} />
              <Bar dataKey="overdue" name="Tre han" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <Section title="Danh gia da chieu">
          <div className="mb-3 flex justify-end">
            <select
              value={selectedStaff}
              onChange={(event) => setSelectedStaff(event.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
            >
              {visibleStaffChartData.map((staff) => (
                <option key={staff.username} value={staff.username}>
                  {staff.username}
                </option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#d1d5db', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Radar dataKey="value" name={selectedStaff} stroke="#34d399" fill="#34d399" fillOpacity={0.35} />
<Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Xu huong 4 tuan gan nhat">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={weeklyTrendData} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="week" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend formatter={(value) => <span className="text-xs text-gray-300">{value}</span>} />
              {visibleStaffChartData.map((staff, index) => (
                <Line
                  key={staff.username}
                  type="monotone"
                  dataKey={staff.username}
                  name={staff.username}
                  stroke={LINE_COLORS[index % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Section title="Bang xep hang nhan vien">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs uppercase text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="py-2 pr-3">Hang</th>
                  <th className="py-2 pr-3">Nhan vien</th>
                  <th className="py-2 pr-3">Hoan thanh</th>
                  <th className="py-2 pr-3">Dang cho</th>
                  <th className="py-2 pr-3">Task tre</th>
                  <th className="py-2 pr-3">Dung han %</th>
                  <th className="py-2 pr-3">Tre TB</th>
                  <th className="py-2">TB gio</th>
                </tr>
              </thead>
              <tbody>
                {rankingRows.map((staff, index) => (
                  <tr key={staff.username} className="border-b border-gray-800">
                    <td className="py-2 pr-3 text-gray-500">#{index + 1}</td>
                    <td className="py-2 pr-3 font-medium text-white">{staff.username}</td>
                    <td className="py-2 pr-3 text-green-400">{staff.completed}</td>
                    <td className="py-2 pr-3 text-amber-300">{staff.pending}</td>
                    <td className={`py-2 pr-3 font-semibold ${(staff.overdueCount ?? 0) > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {staff.overdueCount ?? 0}
                    </td>
                    <td className={`py-2 pr-3 font-semibold ${getOnTimeRateClass(staff.onTimeRate ?? 0)}`}>
                      {(staff.onTimeRate ?? 0).toFixed(0)}%
                    </td>
<td className="py-2 pr-3 text-gray-300">{(staff.avgDaysLate ?? 0).toFixed(1)}</td>
                    <td className="py-2">{staff.avg_completion_hours?.toFixed(1) ?? '-'}</td>
                  </tr>
                ))}
                {rankingRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-gray-500">
                      Chua co du lieu nhan vien.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Canh bao khong co task trong 7 ngay">
          <div className="space-y-2">
            {inactiveRows.map((staff) => (
              <div key={staff.username} className="flex items-center justify-between rounded-lg bg-gray-900 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-white">{staff.username}</p>
                  <p className="text-xs text-gray-500">Khong co task moi trong 7 ngay gan nhat</p>
                </div>
                <span className="text-sm font-semibold text-red-400">Can kiem tra</span>
              </div>
            ))}
            {inactiveRows.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500">Tat ca nhan vien deu co task trong 7 ngay.</p>
            )}
          </div>
        </Section>
      </div>
    </DashboardPageFrame>
  );
}
