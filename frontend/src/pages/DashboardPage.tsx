import { useEffect, useMemo, useState } from 'react';
import { fetchAllTasks, fetchOverdueTasks } from '../api/maintenance';
import { fetchTrees } from '../api/trees';
import type { MaintenanceTask, OverdueTask, Tree } from '../types';
import {
  DashboardPageFrame,
  KpiCard,
  Section,
  TimeFilterControls,
  filterTasksByRange,
  isDangerTree,
  normalizeOverdueTask,
  useTimeRange,
} from './dashboard/dashboardShared';

export default function DashboardPage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timeRange = useTimeRange();

  useEffect(() => {
    Promise.all([fetchTrees(), fetchAllTasks(), fetchOverdueTasks()])
      .then(([treeData, taskData, overdueData]) => {
        setTrees(treeData);
        setTasks(taskData);
        setOverdueTasks(overdueData);
      })
      .catch(() => setError('Khong the tai du lieu. Vui long thu lai.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredTasks = useMemo(
    () => filterTasksByRange(tasks, timeRange.rangeStart, timeRange.rangeEnd),
    [tasks, timeRange.rangeStart, timeRange.rangeEnd],
  );

  const goodTrees = trees.filter((tree) => tree.health_status === 'Tốt').length;
  const pendingTasks = filteredTasks.filter((task) => task.status === 'Pending').length;
  const completedTasks = filteredTasks.filter((task) => task.status === 'Completed').length;
  const dangerTrees = trees.filter(isDangerTree);
  const overdueRows = overdueTasks
    .filter((task) => {
      const scheduled = new Date(task.scheduled_date);
      return scheduled >= timeRange.rangeStart && scheduled <= timeRange.rangeEnd;
    })
    .map(normalizeOverdueTask)
    .sort((a, b) => (b.overdue_days ?? 0) - (a.overdue_days ?? 0));

  return (
    <DashboardPageFrame
      title="Tong quan"
      subtitle="Tong quan he thong quan ly cay xanh do thi - Da Nang"
      loading={loading}
      error={error}
    >
      <TimeFilterControls {...timeRange} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Tong cay"
          value={trees.length}
          sub="Trong toan he thong"
          accent="bg-green-600/20"
          icon={<span className="text-green-400">T</span>}
        />
        <KpiCard
          label="Cay tot"
          value={goodTrees}
          sub="Suc khoe on dinh"
          accent="bg-emerald-600/20"
          icon={<span className="text-emerald-400">OK</span>}
        />
        <KpiCard
          label="Task dang cho"
          value={pendingTasks}
          sub="Trong khoang thoi gian"
          accent="bg-amber-600/20"
          icon={<span className="text-amber-300">P</span>}
        />
        <KpiCard
          label="Task hoan thanh"
          value={completedTasks}
sub="Trong khoang thoi gian"
          accent="bg-blue-600/20"
          icon={<span className="text-blue-400">C</span>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Canh bao cay chet / sau benh">
          <div className="space-y-2">
            {dangerTrees.slice(0, 8).map((tree) => (
              <div key={tree.id} className="flex items-center justify-between rounded-lg bg-gray-900 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-white">{tree.tree_code}</p>
                  <p className="text-xs text-gray-500">{tree.species?.common_name ?? 'Khong ro'}</p>
                </div>
                <span className="text-sm font-semibold text-red-400">{tree.health_status}</span>
              </div>
            ))}
            {dangerTrees.length === 0 && <p className="py-4 text-center text-sm text-gray-500">Khong co canh bao cay.</p>}
          </div>
        </Section>

        <Section title="Canh bao task tre">
          <div className="space-y-2">
            {overdueRows.slice(0, 8).map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg bg-gray-900 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-white">{task.tree_name}</p>
                  <p className="text-xs text-gray-500">{task.staff_name}</p>
                </div>
                <span className="text-sm font-semibold text-amber-300">{task.overdue_days ?? 0} ngay</span>
              </div>
            ))}
            {overdueRows.length === 0 && <p className="py-4 text-center text-sm text-gray-500">Khong co task tre.</p>}
          </div>
        </Section>
      </div>
    </DashboardPageFrame>
  );
}
