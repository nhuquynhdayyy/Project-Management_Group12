import { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { fetchAllTasks, fetchOverdueTasks } from '../api/maintenance';
import { fetchTrees } from '../api/trees';
import { fetchStaffUsers } from '../api/auth';
import type { HealthStatus, MaintenanceTask, OverdueTask, Tree, DashboardUser } from '../types';
import CreateTreeForm from '../components/CreateTreeForm';
import CreateTaskForm from '../components/CreateTaskForm';
import Modal from '../components/Modal';
import {
  DashboardPageFrame,
  KpiCard,
  Section,
  TimeFilterControls,
  filterTasksByRange,
  getRangeStart,
  isDangerTree,
  normalizeOverdueTask,
  type TrendDirection,
  useTimeRange,
} from './dashboard/dashboardShared';

function compareTrend(current: number, previous: number): { direction: TrendDirection; value: number } {
  if (current > previous) return { direction: 'up', value: current - previous };
  if (current < previous) return { direction: 'down', value: current - previous };
  return { direction: 'flat', value: 0 };
}

function isInRange(dateValue: string, from: Date, to: Date): boolean {
  const date = new Date(dateValue);
  return date >= from && date <= to;
}

function countTreesCreatedInRange(trees: Tree[], from: Date, to: Date, healthStatus?: HealthStatus): number {
  return trees.filter((tree) => {
    const matchesStatus = healthStatus ? tree.health_status === healthStatus : true;
    return matchesStatus && isInRange(tree.created_at, from, to);
  }).length;
}

function getHealthyGaugeColor(value: number): string {
  if (value > 70) return '#22c55e';
  if (value >= 40) return '#eab308';
  return '#ef4444';
}

function getHealthyStatusLabel(value: number): string {
  if (value > 70) return 'Tot';
  if (value >= 40) return 'Can theo doi';
  return 'Nguy co cao';
}

export default function DashboardPage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timeRange = useTimeRange();

  // Modal states
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  useEffect(() => {
    Promise.all([fetchTrees(), fetchAllTasks(), fetchOverdueTasks(), fetchStaffUsers()])
      .then(([treeData, taskData, overdueData, userData]) => {
        setTrees(treeData);
        setTasks(taskData);
        setOverdueTasks(overdueData);
        setUsers(userData);
      })
      .catch(() => setError('Khong the tai du lieu. Vui long thu lai.'))
      .finally(() => setLoading(false));
  }, []);

  // Refresh data after creating tree or task
  const refreshData = async () => {
    try {
      const [treeData, taskData, overdueData] = await Promise.all([
        fetchTrees(),
        fetchAllTasks(),
        fetchOverdueTasks(),
      ]);
      setTrees(treeData);
      setTasks(taskData);
      setOverdueTasks(overdueData);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  // Filter staff users for task assignment
  const staffUsers = useMemo(
    () => users.filter((user) => user.roles.some((role) => role.role_name === 'Staff')),
    [users]
  );

  const filteredTasks = useMemo(
    () => filterTasksByRange(tasks, timeRange.rangeStart, timeRange.rangeEnd),
    [tasks, timeRange.rangeStart, timeRange.rangeEnd],
  );

  const goodTrees = trees.filter((tree) => tree.health_status === 'Tốt').length;
  const sickTrees = trees.filter((tree) => tree.health_status === 'Sâu bệnh').length;
  const deadTrees = trees.filter((tree) => tree.health_status === 'Chết').length;
  const pendingTasks = filteredTasks.filter((task) => task.status === 'Pending').length;
  const completedTasks = filteredTasks.filter((task) => task.status === 'Completed').length;
const dangerTrees = trees.filter(isDangerTree);
  const currentWeekStart = getRangeStart(7);
  const currentWeekEnd = new Date(`${new Date().toISOString().slice(0, 10)}T23:59:59`);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(currentWeekStart);
  previousWeekEnd.setMilliseconds(previousWeekEnd.getMilliseconds() - 1);
  const previousWeekTasks = filterTasksByRange(tasks, previousWeekStart, previousWeekEnd);
  const currentWeekTasks = filterTasksByRange(tasks, currentWeekStart, currentWeekEnd);
  const healthyPercent = trees.length > 0 ? Math.round((goodTrees / trees.length) * 100) : 0;
  const gaugeColor = getHealthyGaugeColor(healthyPercent);
  const unhealthyTrees = Math.max(0, trees.length - goodTrees);
  const healthyDonutData =
    trees.length > 0
      ? [
          { name: 'Cay khoe manh', value: goodTrees, fill: gaugeColor },
          { name: 'Can theo doi', value: unhealthyTrees, fill: '#374151' },
        ]
      : [{ name: 'Chua co du lieu', value: 1, fill: '#374151' }];
  const healthyStatusLabel = getHealthyStatusLabel(healthyPercent);
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
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowTreeModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-green-600/20"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Thêm cây mới
        </button>

        <button
          onClick={() => setShowTaskModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Giao nhiệm vụ
        </button>
      </div>

      <TimeFilterControls {...timeRange} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 mb-6">
        <KpiCard
          label="Tong cay"
          value={trees.length}
          sub="So voi tuan truoc"
          accent="bg-green-600/20"
          icon={<span className="text-green-400">T</span>}
          trend={compareTrend(
            countTreesCreatedInRange(trees, currentWeekStart, currentWeekEnd),
            countTreesCreatedInRange(trees, previousWeekStart, previousWeekEnd),
          )}
        />
        <KpiCard
          label="Cay tot"
          value={goodTrees}
          sub="So voi tuan truoc"
          accent="bg-emerald-600/20"
          icon={<span className="text-emerald-400">OK</span>}
          trend={compareTrend(
            countTreesCreatedInRange(trees, currentWeekStart, currentWeekEnd, 'Tốt'),
            countTreesCreatedInRange(trees, previousWeekStart, previousWeekEnd, 'Tốt'),
          )}
        />
        <KpiCard
          label="Cay benh"
          value={sickTrees}
          sub="So voi tuan truoc"
          accent="bg-orange-600/20"
          icon={<span className="text-orange-400">B</span>}
          trend={compareTrend(
            countTreesCreatedInRange(trees, currentWeekStart, currentWeekEnd, 'Sâu bệnh'),
countTreesCreatedInRange(trees, previousWeekStart, previousWeekEnd, 'Sâu bệnh'),
          )}
        />
        <KpiCard
          label="Cay chet"
          value={deadTrees}
          sub="So voi tuan truoc"
          accent="bg-red-600/20"
          icon={<span className="text-red-400">X</span>}
          trend={compareTrend(
            countTreesCreatedInRange(trees, currentWeekStart, currentWeekEnd, 'Chết'),
            countTreesCreatedInRange(trees, previousWeekStart, previousWeekEnd, 'Chết'),
          )}
        />
        <KpiCard
          label="Task dang cho"
          value={pendingTasks}
          sub="So voi tuan truoc"
          accent="bg-amber-600/20"
          icon={<span className="text-amber-300">P</span>}
          trend={compareTrend(
            currentWeekTasks.filter((task) => task.status === 'Pending').length,
            previousWeekTasks.filter((task) => task.status === 'Pending').length,
          )}
        />
        <KpiCard
          label="Task hoan thanh"
          value={completedTasks}
          sub="So voi tuan truoc"
          accent="bg-blue-600/20"
          icon={<span className="text-blue-400">C</span>}
          trend={compareTrend(
            currentWeekTasks.filter((task) => task.status === 'Completed').length,
            previousWeekTasks.filter((task) => task.status === 'Completed').length,
          )}
        />
      </div>

      <Section title="Ty le cay khoe manh">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-center">
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthyDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={102}
                  paddingAngle={trees.length > 0 ? 3 : 0}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {healthyDonutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold text-white">{healthyPercent}%</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">{healthyStatusLabel}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-900 px-4 py-3 border border-gray-700">
              <p className="text-xs uppercase tracking-wider text-gray-500">Cay khoe manh</p>
              <p className="mt-2 text-2xl font-bold text-white">{goodTrees}</p>
              <div className="mt-3 h-1.5 rounded-full bg-gray-800">
<div className="h-1.5 rounded-full" style={{ width: `${healthyPercent}%`, backgroundColor: gaugeColor }} />
              </div>
            </div>
            <div className="rounded-lg bg-gray-900 px-4 py-3 border border-gray-700">
              <p className="text-xs uppercase tracking-wider text-gray-500">Can theo doi</p>
              <p className="mt-2 text-2xl font-bold text-white">{unhealthyTrees}</p>
              <p className="mt-3 text-xs text-gray-500">Yeu + sau benh + chet</p>
            </div>
            <div className="rounded-lg bg-gray-900 px-4 py-3 border border-gray-700">
              <p className="text-xs uppercase tracking-wider text-gray-500">Nguong danh gia</p>
              <p className="mt-2 text-sm font-semibold" style={{ color: gaugeColor }}>
                {healthyPercent > 70 ? 'Xanh > 70%' : healthyPercent >= 40 ? 'Vang 40-70%' : 'Do < 40%'}
              </p>
              <p className="mt-3 text-xs text-gray-500">Tong {trees.length} cay</p>
            </div>
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
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

      {/* Create Tree Modal */}
      <Modal isOpen={showTreeModal} onClose={() => setShowTreeModal(false)}>
        <CreateTreeForm
          onSuccess={(tree) => {
            setShowTreeModal(false);
            refreshData();
            // Show success message (you can add a toast notification here)
            alert(`Đã tạo cây ${tree.tree_code} thành công!`);
          }}
          onCancel={() => setShowTreeModal(false)}
        />
      </Modal>

      {/* Create Task Modal */}
      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)}>
        <CreateTaskForm
          staffUsers={staffUsers}
          onSuccess={() => {
            setShowTaskModal(false);
            refreshData();
            // Show success message (you can add a toast notification here)
            alert(`Đã tạo nhiệm vụ thành công!`);
          }}
          onCancel={() => setShowTaskModal(false)}
        />
      </Modal>
    </DashboardPageFrame>
  );
}
