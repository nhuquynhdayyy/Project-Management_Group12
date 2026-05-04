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
    const maxCompleted = Math.max(1, ...staffPerformance.map((staff) => staff.completed));
    const completed = selectedPerformance?.completed ?? selectedStaffTasks.filter((task) => task.status === 'Completed').length;
    const pending = selectedPerformance?.pending ?? selectedStaffTasks.filter((task) => task.status !== 'Completed').length;
    const total = Math.max(1, completed + pending);
    const avgHours = selectedPerformance?.avg_completion_hours ?? null;
    const onTimeCompleted = selectedStaffTasks.filter((task) => {
      if (task.status !== 'Completed' || !task.completed_at) return false;
      return new Date(task.completed_at) <= new Date(task.scheduled_date);
    }).length;
    const completedTasks = Math.max(1, selectedStaffTasks.filter((task) => task.status === 'Completed').length);
    const activeRecentTasks = selectedStaffTasks.filter((task) => new Date(task.scheduled_date) >= getRangeStart(7)).length;

    return [
      { metric: 'Toc do', value: clampScore(avgHours === null ? 60 : 100 - avgHours * 4) },
      { metric: 'So luong', value: clampScore((completed / maxCompleted) * 100) },
      { metric: 'Dung han', value: clampScore((onTimeCompleted / completedTasks) * 100) },
      { metric: 'Chat luong', value: clampScore((completed / total) * 100) },
      { metric: 'Chuyen can', value: clampScore((activeRecentTasks / 5) * 100) },
    ];
  }, [selectedPerformance, selectedStaffTasks, staffPerformance]);

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

  const rankingRows = useMemo(
    () =>
      staffPerformance
        .map((staff) => ({
          ...staff,
          total: staff.completed + staff.pending,
        }))
        .sort((a, b) => b.completed - a.completed),
    [staffPerformance],
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
                    <td className="py-2">{staff.avg_completion_hours?.toFixed(1) ?? '-'}</td>
                  </tr>
                ))}
                {rankingRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500">
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
