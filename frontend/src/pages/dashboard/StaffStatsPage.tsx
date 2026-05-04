import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchAllTasks, fetchStaffPerformance } from '../../api/maintenance';
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

export default function StaffStatsPage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={staffChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="username" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="completed" name="Task hoan thanh" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

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
