import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { MaintenanceTask, TaskStatus, TaskType } from '../../types';
import { DashboardPageFrame, Section } from './dashboardShared';
import apiClient from '../../api/client';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  Pending: 'Cần bảo trì',
  In_Progress: 'Đang thực hiện',
  Completed: 'Đã xong',
};

const STATUS_CLASSES: Record<TaskStatus, string> = {
  Pending: 'bg-amber-500/20 text-amber-300 border-amber-600/40',
  In_Progress: 'bg-blue-500/20 text-blue-300 border-blue-600/40',
  Completed: 'bg-green-500/20 text-green-300 border-green-600/40',
};

const TASK_TYPE_ICONS: Record<TaskType, string> = {
  'Cắt tỉa': '✂️',
  'Bón phân': '🌱',
  'Tưới nước': '💧',
  'Kiểm tra': '🔍',
};

// ─── API Functions ────────────────────────────────────────────────────────────

async function fetchMyTasks(): Promise<MaintenanceTask[]> {
  const { data } = await apiClient.get<MaintenanceTask[]>('/maintenance/tasks/my-tasks');
  return data;
}

async function startTask(taskId: number): Promise<MaintenanceTask> {
  const { data } = await apiClient.patch<MaintenanceTask>(
    `/maintenance/tasks/${taskId}/status`,
    { status: 'In_Progress' }
  );
  return data;
}

async function completeTask(
  taskId: number,
  formData: FormData
): Promise<MaintenanceTask> {
  const { data } = await apiClient.post<MaintenanceTask>(
    `/maintenance/tasks/${taskId}/complete`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return data;
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────

function TaskDetailModal({
  task,
  onClose,
  onTaskUpdated,
}: {
  task: MaintenanceTask;
  onClose: () => void;
  onTaskUpdated: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleStartWork() {
    if (task.status !== 'Pending') return;

    setLoading(true);
    setError('');
    try {
      await startTask(task.id);
      onTaskUpdated();
      alert('✅ Đã bắt đầu làm việc!');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Không thể bắt đầu công việc';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    if (task.status === 'Completed') {
      alert('Công việc này đã hoàn thành');
      return;
    }

    if (!imageFile && !task.evidence_image_url) {
      const confirmed = confirm(
        'Bạn chưa chụp ảnh bằng chứng. Bạn có muốn tiếp tục không?'
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setError('');

    try {
      // Get current location
      if (!navigator.geolocation) {
        throw new Error('Trình duyệt không hỗ trợ định vị GPS');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const formData = new FormData();
      formData.append('latitude', position.coords.latitude.toString());
      formData.append('longitude', position.coords.longitude.toString());
      
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }
      
      if (imageFile) {
        formData.append('evidence_image', imageFile);
      }

      await completeTask(task.id, formData);
      onTaskUpdated();
      alert('✅ Đã hoàn thành công việc thành công!');
      onClose();
    } catch (err: any) {
      console.error('Error completing task:', err);
      
      let errorMessage = 'Không thể hoàn thành công việc';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      // Check for specific errors
      if (errorMessage.includes('geofence') || errorMessage.includes('bán kính') || errorMessage.includes('xa')) {
        setError('📍 Bạn đang ở quá xa cây (>10m). Vui lòng di chuyển đến gần cây hơn.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('quyền')) {
        setError('⚠️ Không thể truy cập vị trí. Vui lòng cho phép truy cập vị trí trong trình duyệt.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-white">Chi tiết công việc</h3>
            <p className="text-sm text-gray-400 mt-0.5">{task.task_type}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 font-medium">Trạng thái</span>
            <span className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${STATUS_CLASSES[task.status]}`}>
              {STATUS_LABELS[task.status]}
            </span>
          </div>

          {/* Task info */}
          <div className="bg-gray-900 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">📋 Thông tin task</h4>
            <Row label="Loại công việc" value={`${TASK_TYPE_ICONS[task.task_type]} ${task.task_type}`} />
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

          {/* Evidence image */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">📷 Ảnh bằng chứng</h4>
            {task.evidence_image_url ? (
              <a href={task.evidence_image_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={task.evidence_image_url}
                  alt="Ảnh bằng chứng"
                  className="w-full rounded-lg object-cover max-h-64 hover:opacity-90 transition-opacity cursor-zoom-in"
                />
                <p className="text-xs text-blue-400 mt-2 text-center">Nhấn để xem ảnh gốc</p>
              </a>
            ) : (
              <p className="text-sm text-gray-500 italic text-center py-4">Chưa có ảnh bằng chứng</p>
            )}
          </div>

          {/* Complete task form - only shown when not yet completed */}
          {task.status !== 'Completed' && (
            <div className="bg-gray-900 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-semibold text-gray-300">✅ Hoàn thành công việc</h4>
              
              <div className="bg-amber-900/20 border-l-4 border-amber-600 p-3 rounded">
                <p className="text-sm text-amber-300 font-medium">⚠️ Lưu ý quan trọng:</p>
                <ul className="text-xs text-amber-200 mt-2 space-y-1 ml-4 list-disc">
                  <li>Bạn phải ở trong bán kính 10m từ cây</li>
                  <li>Nên chụp ảnh bằng chứng để xác nhận công việc</li>
                  <li>Kiểm tra GPS đã được bật</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ghi chú công việc:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Nhập ghi chú về công việc đã thực hiện (tùy chọn)"
                  className="w-full rounded-lg border-2 border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {imagePreview ? 'Thay đổi ảnh bằng chứng:' : 'Chụp ảnh bằng chứng:'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  📷 {imagePreview ? 'Thay đổi ảnh' : 'Chụp ảnh bằng chứng'}
                </label>
              </div>

              {imagePreview && (
                <div className="relative rounded-lg overflow-hidden border-2 border-green-600">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-800/40 bg-red-900/20 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {task.status === 'Pending' && (
                  <button
                    onClick={handleStartWork}
                    disabled={loading}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Đang xử lý...' : '▶️ Bắt đầu làm việc'}
                  </button>
                )}
                {task.status === 'In_Progress' && (
                  <button
                    onClick={handleComplete}
                    disabled={loading}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-4 text-base font-bold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                  >
                    {loading ? 'Đang xử lý...' : '✓ XÁC NHẬN HOÀN THÀNH'}
                  </button>
                )}
              </div>
            </div>
          )}
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
      <span className="text-sm text-gray-400 shrink-0">{label}</span>
      <span className={`text-sm text-right ${accent ?? 'text-gray-200'}`}>{value}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<TaskType | 'All'>('All');

  // Modal
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);

  function loadData() {
    setLoading(true);
    setError('');
    fetchMyTasks()
      .then(setTasks)
      .catch(() => setError('Không thể tải danh sách công việc. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered + sorted tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (statusFilter !== 'All' && task.status !== statusFilter) return false;
        if (typeFilter !== 'All' && task.task_type !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => {
        // Priority: Pending > In_Progress > Completed
        const priorityOrder = { 'Pending': 0, 'In_Progress': 1, 'Completed': 2 };
        const aPriority = priorityOrder[a.status] ?? 3;
        const bPriority = priorityOrder[b.status] ?? 3;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Same priority, sort by date
        return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
      });
  }, [tasks, statusFilter, typeFilter]);

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

  return (
    <DashboardPageFrame
      title="Công việc của tôi"
      subtitle={`Xin chào ${user?.full_name || user?.username}! Đây là danh sách công việc được giao cho bạn.`}
      loading={loading}
      error={error}
    >
      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiMini label="Tổng công việc" value={counts.total} color="text-white" />
        <KpiMini label="Cần bảo trì" value={counts.pending} color="text-amber-400" />
        <KpiMini label="Đang thực hiện" value={counts.inProgress} color="text-blue-400" />
        <KpiMini label="Đã xong" value={counts.completed} color="text-green-400" />
      </div>

      <Section title="Danh sách công việc">
        {/* ── Filters ── */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'All'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Tất cả trạng thái
            </button>
            <button
              onClick={() => setStatusFilter('Pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'Pending'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              ⏳ Cần bảo trì
            </button>
            <button
              onClick={() => setStatusFilter('In_Progress')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'In_Progress'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              🔄 Đang thực hiện
            </button>
            <button
              onClick={() => setStatusFilter('Completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'Completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              ✅ Đã xong
            </button>
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TaskType | 'All')}
            className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
          >
            <option value="All">Tất cả loại công việc</option>
            <option value="Cắt tỉa">✂️ Cắt tỉa</option>
            <option value="Bón phân">🌱 Bón phân</option>
            <option value="Tưới nước">💧 Tưới nước</option>
            <option value="Kiểm tra">🔍 Kiểm tra</option>
          </select>
        </div>

        {/* ── Task Cards ── */}
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isOverdue =
              task.status !== 'Completed' &&
              new Date(task.scheduled_date) < new Date(new Date().toDateString());

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`bg-gray-800 rounded-xl border-2 p-4 cursor-pointer hover:border-green-600 transition-all ${
                  isOverdue ? 'border-red-600/40 bg-red-950/10' : 'border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{TASK_TYPE_ICONS[task.task_type]}</span>
                      <h3 className="text-lg font-bold text-white">{task.task_type}</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                      📅 {new Date(task.scheduled_date).toLocaleDateString('vi-VN')}
                      {isOverdue && <span className="text-red-400 font-medium ml-2">• Quá hạn</span>}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${STATUS_CLASSES[task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>

                {task.notes && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{task.notes}</p>
                )}

                {/* Quick action buttons */}
                {task.status !== 'Completed' && (
                  <div className="flex gap-2 mt-3">
                    {task.status === 'Pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm"
                      >
                        ▶️ Bắt đầu làm việc
                      </button>
                    )}
                    {task.status === 'In_Progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm"
                      >
                        ✅ Hoàn thành
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-2">📋 Không có công việc nào</p>
              <p className="text-gray-500 text-sm">
                {statusFilter !== 'All' || typeFilter !== 'All'
                  ? 'Thử điều chỉnh bộ lọc'
                  : 'Bạn chưa được giao công việc nào'}
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* ── Task Detail Modal ── */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => {
            loadData();
            setSelectedTask(null);
          }}
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
