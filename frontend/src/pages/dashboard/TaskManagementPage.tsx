import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createTask, fetchAllTasks, type CreateTaskPayload } from '../../api/maintenance';
import { fetchStaffUsers } from '../../api/auth';
import { fetchTrees } from '../../api/trees';
import type { DashboardUser, MaintenanceTask, TaskStatus, TaskType, Tree } from '../../types';
import {
  DashboardPageFrame,
  PAGE_SIZE,
  PaginationControls,
  Section,
} from './dashboardShared';

// ─── Constants ───────────────────────────────────────────────────────────────

const TASK_TYPES: TaskType[] = ['Cắt tỉa', 'Bón phân', 'Tưới nước', 'Kiểm tra'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  Pending: 'Chờ xử lý',
  In_Progress: 'Đang thực hiện',
  Completed: 'Hoàn thành',
};

const STATUS_CLASSES: Record<TaskStatus, string> = {
  Pending: 'bg-amber-500/20 text-amber-300 border-amber-600/40',
  In_Progress: 'bg-blue-500/20 text-blue-300 border-blue-600/40',
  Completed: 'bg-green-500/20 text-green-300 border-green-600/40',
};

// ─── Task Detail Modal ────────────────────────────────────────────────────────

function TaskDetailModal({
  task,
  trees,
  users,
  onClose,
}: {
  task: MaintenanceTask;
  trees: Tree[];
  users: DashboardUser[];
  onClose: () => void;
}) {
  const tree = trees.find((t) => t.id === task.tree_id);
  const assignedUser = users.find((u) => u.id === task.assigned_to);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-white">Chi tiết Task #{task.id}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{task.task_type}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Trạng thái</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[task.status]}`}>
              {STATUS_LABELS[task.status]}
            </span>
          </div>

          {/* Task info */}
          <div className="bg-gray-900 rounded-lg p-4 space-y-2.5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Thông tin task</h4>
            <Row label="Loại công việc" value={task.task_type} />
            <Row
              label="Ngày hẹn"
              value={new Date(task.scheduled_date).toLocaleDateString('vi-VN')}
            />
            {task.completed_at && (
              <Row
                label="Hoàn thành lúc"
                value={new Date(task.completed_at).toLocaleString('vi-VN')}
                accent="text-green-400"
              />
            )}
            {task.notes && <Row label="Ghi chú" value={task.notes} />}
          </div>

          {/* Tree info */}
          {tree && (
            <div className="bg-gray-900 rounded-lg p-4 space-y-2.5">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Thông tin cây</h4>
              <Row label="Mã cây" value={tree.tree_code} accent="text-green-400 font-mono" />
              <Row label="Loài cây" value={tree.species?.common_name ?? '—'} />
              <Row label="Khu vực" value={tree.area?.area_name ?? '—'} />
              <Row
                label="Sức khỏe"
                value={tree.health_status}
                accent={
                  tree.health_status === 'Tốt'
                    ? 'text-green-400'
                    : tree.health_status === 'Yếu'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }
              />
              {tree.height_m && <Row label="Chiều cao" value={`${tree.height_m} m`} />}
              {tree.trunk_diameter_cm && (
                <Row label="Đường kính thân" value={`${tree.trunk_diameter_cm} cm`} />
              )}
              {tree.planting_year && <Row label="Năm trồng" value={String(tree.planting_year)} />}
              <Row
                label="Tọa độ"
                value={`${tree.location.coordinates[1].toFixed(5)}, ${tree.location.coordinates[0].toFixed(5)}`}
                accent="text-gray-400 font-mono text-xs"
              />
            </div>
          )}

          {/* Assigned staff */}
          {assignedUser && (
            <div className="bg-gray-900 rounded-lg p-4 space-y-2.5">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Nhân viên phụ trách</h4>
              <Row label="Họ tên" value={assignedUser.full_name ?? assignedUser.username} />
              <Row label="Username" value={assignedUser.username} accent="font-mono text-gray-400" />
            </div>
          )}

          {/* Evidence image */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ảnh bằng chứng</h4>
            {task.evidence_image_url ? (
              <a href={task.evidence_image_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={task.evidence_image_url}
                  alt="Ảnh bằng chứng"
                  className="w-full rounded-lg object-cover max-h-56 hover:opacity-90 transition-opacity cursor-zoom-in"
                />
                <p className="text-xs text-blue-400 mt-2 text-center">Nhấn để xem ảnh gốc</p>
              </a>
            ) : (
              <p className="text-sm text-gray-500 italic text-center py-4">Chưa có ảnh bằng chứng</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs text-right ${accent ?? 'text-gray-200'}`}>{value}</span>
    </div>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({
  trees,
  staffUsers,
  onClose,
  onCreated,
}: {
  trees: Tree[];
  staffUsers: DashboardUser[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [treeId, setTreeId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('Cắt tỉa');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!treeId || !assignedTo || !scheduledDate) {
      setFormError('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }

    const payload: CreateTaskPayload = {
      tree_id: Number(treeId),
      assigned_to: Number(assignedTo),
      task_type: taskType,
      scheduled_date: scheduledDate,
      notes: notes.trim() || undefined,
    };

    setSaving(true);
    try {
      await createTask(payload);
      onCreated();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'Tạo task thất bại. Vui lòng thử lại.';
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Tạo task bảo trì mới</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Tree */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              Cây <span className="text-red-400">*</span>
            </label>
            <select
              value={treeId}
              onChange={(e) => setTreeId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
            >
              <option value="">-- Chọn cây --</option>
              {trees.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tree_code} — {t.species?.common_name ?? '?'} ({t.area?.area_name ?? '?'})
                </option>
              ))}
            </select>
          </div>

          {/* Assigned staff */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              Nhân viên phụ trách <span className="text-red-400">*</span>
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
            >
              <option value="">-- Chọn nhân viên --</option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.username} (@{u.username})
                </option>
              ))}
            </select>
          </div>

          {/* Task type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              Loại công việc <span className="text-red-400">*</span>
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Scheduled date */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              Ngày hẹn <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500 [color-scheme:dark]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Ghi chú</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Mô tả công việc cần thực hiện..."
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500 resize-none"
            />
          </div>

          {formError && (
            <div className="rounded-lg border border-red-800/40 bg-red-900/20 px-3 py-2 text-sm text-red-400">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Đang tạo...' : 'Tạo task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TaskManagementPage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<TaskType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  function loadData() {
    setLoading(true);
    setError('');
    Promise.all([fetchAllTasks(), fetchTrees(), fetchStaffUsers()])
      .then(([taskData, treeData, userData]) => {
        setTasks(taskData);
        setTrees(treeData);
        setUsers(userData);
      })
      .catch(() => setError('Không thể tải dữ liệu. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  // Staff users only (for create form)
  const staffUsers = useMemo(
    () => users.filter((u) => u.roles.some((r) => r.role_name === 'Staff') && u.is_active),
    [users],
  );

  // Build lookup maps for display
  const treeMap = useMemo(
    () => new Map(trees.map((t) => [t.id, t])),
    [trees],
  );
  const userMap = useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users],
  );

  // Filtered + sorted tasks
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((task) => {
        if (statusFilter !== 'All' && task.status !== statusFilter) return false;
        if (typeFilter !== 'All' && task.task_type !== typeFilter) return false;
        if (q) {
          const tree = treeMap.get(task.tree_id);
          const user = userMap.get(task.assigned_to);
          const haystack = [
            tree?.tree_code ?? '',
            tree?.species?.common_name ?? '',
            user?.username ?? '',
            user?.full_name ?? '',
            task.task_type,
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
  }, [tasks, statusFilter, typeFilter, searchQuery, treeMap, userMap]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const visibleTasks = filteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPI counts
  const counts = useMemo(
    () => ({
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'Pending').length,
      inProgress: tasks.filter((t) => t.status === 'In_Progress').length,
      completed: tasks.filter((t) => t.status === 'Completed').length,
    }),
    [tasks],
  );

  function handleFilterChange<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <DashboardPageFrame
      title="Quản lý Task Bảo trì"
      subtitle="Xem, tạo và theo dõi toàn bộ công việc bảo trì cây xanh"
      loading={loading}
      error={error}
    >
      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiMini label="Tổng task" value={counts.total} color="text-white" />
        <KpiMini label="Chờ xử lý" value={counts.pending} color="text-amber-400" />
        <KpiMini label="Đang thực hiện" value={counts.inProgress} color="text-blue-400" />
        <KpiMini label="Hoàn thành" value={counts.completed} color="text-green-400" />
      </div>

      <Section title="Danh sách task">
        {/* ── Toolbar ── */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo cây, nhân viên..."
              className="w-52 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
            />

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value as TaskStatus | 'All')}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
            >
              <option value="All">Tất cả trạng thái</option>
              <option value="Pending">Chờ xử lý</option>
              <option value="In_Progress">Đang thực hiện</option>
              <option value="Completed">Hoàn thành</option>
            </select>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => handleFilterChange(setTypeFilter)(e.target.value as TaskType | 'All')}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
            >
              <option value="All">Tất cả loại</option>
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Create button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tạo task mới
          </button>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="border-b border-gray-700 text-xs uppercase text-gray-400">
              <tr>
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Cây</th>
                <th className="py-2 pr-3">Loại</th>
                <th className="py-2 pr-3">Nhân viên</th>
                <th className="py-2 pr-3">Ngày hẹn</th>
                <th className="py-2 pr-3">Trạng thái</th>
                <th className="py-2">Ảnh</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => {
                const tree = treeMap.get(task.tree_id);
                const user = userMap.get(task.assigned_to);
                const isOverdue =
                  task.status !== 'Completed' &&
                  new Date(task.scheduled_date) < new Date(new Date().toDateString());

                return (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`border-b border-gray-800 cursor-pointer hover:bg-gray-700/40 transition-colors ${
                      isOverdue ? 'bg-red-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 pr-3 text-gray-500 font-mono text-xs">#{task.id}</td>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-white">
                        {tree?.tree_code ?? `Cây #${task.tree_id}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {tree?.species?.common_name ?? '—'}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-md bg-gray-700/60 px-2 py-0.5 text-xs">
                        {task.task_type}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="text-sm">{user?.full_name ?? user?.username ?? `#${task.assigned_to}`}</div>
                      {user?.full_name && (
                        <div className="text-xs text-gray-500">@{user.username}</div>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className={isOverdue ? 'text-red-400 font-medium' : ''}>
                        {new Date(task.scheduled_date).toLocaleDateString('vi-VN')}
                      </div>
                      {isOverdue && (
                        <div className="text-xs text-red-500">Quá hạn</div>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[task.status]}`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {task.evidence_image_url ? (
                        <span className="text-base" title="Có ảnh bằng chứng">📷</span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visibleTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Không có task nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
      </Section>

      {/* ── Task Detail Modal ── */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          trees={trees}
          users={users}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* ── Create Task Modal ── */}
      {showCreateModal && (
        <CreateTaskModal
          trees={trees}
          staffUsers={staffUsers}
          onClose={() => setShowCreateModal(false)}
          onCreated={loadData}
        />
      )}
    </DashboardPageFrame>
  );
}

// ─── Small KPI card ───────────────────────────────────────────────────────────

function KpiMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 px-4 py-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
