import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createTree,
  fetchAreas,
  fetchTreeSpecies,
  fetchTrees,
  updateTreeHealth,
  fetchTasksByTreeId,
  fetchTreeHistory,
  getTreeQRCodeBlobUrl,
  downloadTreeQRCode,
  checkTreeCodeExists,
  checkLocationExists,
  type CreateTreePayload,
} from '../../api/trees';
import { createTask, type CreateTaskPayload } from '../../api/maintenance';
import { fetchStaffUsers } from '../../api/auth';
import type {
  ActivityLog,
  AdministrativeArea,
  DashboardUser,
  HealthStatus,
  MaintenanceTask,
  TaskType,
  Tree,
  TreeSpecies,
} from '../../types';
import {
  DashboardPageFrame,
  PAGE_SIZE,
  PaginationControls,
  Section,
} from './dashboardShared';

// ─── Constants ────────────────────────────────────────────────────────────────────────────

const HEALTH_OPTIONS: HealthStatus[] = ['Tốt', 'Yếu', 'Sâu bệnh', 'Chết'];

const HEALTH_CLASSES: Record<HealthStatus, string> = {
  'Tốt': 'bg-green-500/20 text-green-300 border-green-600/40',
  'Yếu': 'bg-amber-500/20 text-amber-300 border-amber-600/40',
  'Sâu bệnh': 'bg-orange-500/20 text-orange-300 border-orange-600/40',
  'Chết': 'bg-red-500/20 text-red-300 border-red-600/40',
};

const TASK_TYPES: TaskType[] = ['Cắt tỉa', 'Bón phân', 'Tưới nước', 'Kiểm tra'];

const STATUS_LABELS: Record<string, string> = {
  Pending: 'Chờ xử lý',
  In_Progress: 'Đang thực hiện',
  Completed: 'Hoàn thành',
};

const STATUS_CLASSES: Record<string, string> = {
  Pending: 'bg-amber-500/20 text-amber-300 border-amber-600/40',
  In_Progress: 'bg-blue-500/20 text-blue-300 border-blue-600/40',
  Completed: 'bg-green-500/20 text-green-300 border-green-600/40',
};

// ─── Row helper ────────────────────────────────────────────────────────────────────────────

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs text-right ${accent ?? 'text-gray-200'}`}>{value}</span>
    </div>
  );
}

// ─── Utility: Translate tree changes to Vietnamese ────────────────────────────────────────

function translateTreeChanges(oldValue: Record<string, any> | null, newValue: Record<string, any> | null): string[] {
  if (!oldValue || !newValue) return [];
  
  const changes: string[] = [];
  
  const fieldLabels: Record<string, string> = {
    health_status: 'Sức khỏe',
    height_m: 'Chiều cao',
    trunk_diameter_cm: 'Đường kính thân',
    planting_year: 'Năm trồng',
    area_id: 'Khu vực',
    species_id: 'Loài cây',
    tree_code: 'Mã cây',
  };
  
  const healthLabels: Record<string, string> = {
    'Tốt': 'Tốt',
    'Yếu': 'Yếu',
    'Sâu bệnh': 'Sâu bệnh',
    'Chết': 'Chết',
  };
  
  for (const key in newValue) {
    if (oldValue[key] !== newValue[key] && oldValue[key] !== undefined) {
      const label = fieldLabels[key] || key;
      const oldVal = oldValue[key];
      const newVal = newValue[key];
      
      if (key === 'health_status') {
        const oldHealth = healthLabels[oldVal] || oldVal;
        const newHealth = healthLabels[newVal] || newVal;
        changes.push(`${label} thay đổi từ "${oldHealth}" sang "${newHealth}"`);
      } else if (key === 'height_m') {
        changes.push(`${label} thay đổi từ ${oldVal}m sang ${newVal}m`);
      } else if (key === 'trunk_diameter_cm') {
        changes.push(`${label} thay đổi từ ${oldVal}cm sang ${newVal}cm`);
      } else if (key === 'planting_year') {
        changes.push(`${label} thay đổi từ năm ${oldVal} sang năm ${newVal}`);
      } else {
        changes.push(`${label} thay đổi từ "${oldVal}" sang "${newVal}"`);
      }
    }
  }
  
  return changes;
}

// ─── TreeDetailModal ────────────────────────────────────────────────────────────────────────────

function TreeDetailModal({
  tree,
  tasks,
  users,
  staffUsers,
  onClose,
  onTaskCreated,
  onHealthUpdated,
}: {
  tree: Tree;
  tasks: MaintenanceTask[];
  users: DashboardUser[];
  staffUsers: DashboardUser[];
  onClose: () => void;
  onTaskCreated: () => void;
  onHealthUpdated?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'history' | 'qrcode'>('info');
  const [healthValue, setHealthValue] = useState<HealthStatus>(tree.health_status);
  const [savingHealth, setSavingHealth] = useState(false);
  const [healthMsg, setHealthMsg] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('Cắt tỉa');
  const [scheduledDate, setScheduledDate] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [taskMsg, setTaskMsg] = useState('');
  const [taskMsgType, setTaskMsgType] = useState<'success' | 'error'>('error');
  const [downloadingQR, setDownloadingQR] = useState(false);
  const [qrDownloadMsg, setQrDownloadMsg] = useState('');
  const [qrCodeBlobUrl, setQrCodeBlobUrl] = useState<string | null>(null);
  const [loadingQRCode, setLoadingQRCode] = useState(false);
  const [qrCodeError, setQrCodeError] = useState(false);
  
  // History tab states
  const [historyLogs, setHistoryLogs] = useState<ActivityLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);

  async function handleHealthUpdate() {
    setSavingHealth(true);
    setHealthMsg('');
    try {
      await updateTreeHealth(tree.id, healthValue);
      setHealthMsg('Đã cập nhật!');
      
      // Gọi callback để refresh data trong component cha
      if (onHealthUpdated) {
        onHealthUpdated();
      }
      
      // Cập nhật giá trị tree.health_status ngay lập tức
      tree.health_status = healthValue;
      
      // Reset history để reload khi user mở lại tab history
      setHasLoadedHistory(false);
      setHistoryLogs([]);
    } catch {
      setHealthMsg('Cập nhật thất bại.');
    } finally {
      setSavingHealth(false);
    }
  }

  async function handleTaskSubmit(e: FormEvent) {
    e.preventDefault();
    setTaskMsg('');
    if (!assignedTo || !scheduledDate) {
      setTaskMsg('Vui lòng điền đầy đủ các trường bắt buộc.');
      setTaskMsgType('error');
      return;
    }
    const payload: CreateTaskPayload = {
      tree_id: tree.id,
      assigned_to: Number(assignedTo),
      task_type: taskType,
      scheduled_date: scheduledDate,
      notes: taskNotes.trim() || undefined,
    };
    setSavingTask(true);
    try {
      await createTask(payload);
      setTaskMsg('Tạo task thành công!');
      setTaskMsgType('success');
      setAssignedTo('');
      setScheduledDate('');
      setTaskNotes('');
      onTaskCreated();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Tạo task thất bại.';
      setTaskMsg(Array.isArray(msg) ? msg.join(', ') : msg);
      setTaskMsgType('error');
    } finally {
      setSavingTask(false);
    }
  }

  async function handleDownloadQRCode() {
    setDownloadingQR(true);
    setQrDownloadMsg('');
    try {
      await downloadTreeQRCode(tree.id, `${tree.tree_code}-qrcode.png`);
      setQrDownloadMsg('✅ Đã tải QR code thành công!');
      setTimeout(() => setQrDownloadMsg(''), 3000);
    } catch (error) {
      setQrDownloadMsg('❌ Không thể tải QR code. Vui lòng thử lại.');
    } finally {
      setDownloadingQR(false);
    }
  }

  // Load QR code when QR tab is active
  useEffect(() => {
    if (activeTab === 'qrcode' && !qrCodeBlobUrl && !loadingQRCode) {
      setLoadingQRCode(true);
      setQrCodeError(false);
      getTreeQRCodeBlobUrl(tree.id)
        .then((url) => {
          setQrCodeBlobUrl(url);
          setQrCodeError(false);
        })
        .catch((error) => {
          console.error('Failed to load QR code:', error);
          setQrCodeError(true);
        })
        .finally(() => {
          setLoadingQRCode(false);
        });
    }
  }, [activeTab, tree.id, qrCodeBlobUrl, loadingQRCode]);

  // Load history when history tab is active (only once)
  useEffect(() => {
    if (activeTab === 'history' && !hasLoadedHistory) {
      setLoadingHistory(true);
      setHasLoadedHistory(true);
      fetchTreeHistory(tree.id)
        .then((logs) => {
          setHistoryLogs(logs);
        })
        .catch((error) => {
          console.error('Failed to load tree history:', error);
          setHistoryLogs([]);
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    }
  }, [activeTab, tree.id, hasLoadedHistory]);

  // Cleanup blob URL when modal closes
  useEffect(() => {
    return () => {
      if (qrCodeBlobUrl) {
        URL.revokeObjectURL(qrCodeBlobUrl);
      }
    };
  }, [qrCodeBlobUrl]);

  const coords = tree.location?.coordinates;
  const lat = coords ? coords[1].toFixed(5) : '—';
  const lng = coords ? coords[0].toFixed(5) : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl border border-gray-700 bg-gray-800 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${HEALTH_CLASSES[tree.health_status]}`}>
              {tree.health_status}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white font-mono">{tree.tree_code}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{tree.species?.common_name ?? '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'info' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Thông tin cây
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'tasks' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Lịch sử task ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Lịch sử biến động ({historyLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'qrcode' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Mã QR
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto">
          {activeTab === 'info' && (
            <div className="px-5 py-4 space-y-4">
              <div className="bg-gray-900 rounded-lg p-4 space-y-2.5">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Thông tin cây</h4>
                <Row label="Mã cây" value={tree.tree_code} accent="text-green-400 font-mono" />
                <Row label="Loài cây" value={tree.species?.common_name ?? '—'} />
                <Row label="Khu vực" value={tree.area?.area_name ?? '—'} />
                <Row label="Sức khỏe" value={tree.health_status} accent={HEALTH_CLASSES[tree.health_status].split(' ').find((c) => c.startsWith('text-')) ?? 'text-gray-200'} />
                {tree.planting_year != null && <Row label="Năm trồng" value={String(tree.planting_year)} />}
                {tree.height_m != null && <Row label="Chiều cao" value={`${tree.height_m} m`} />}
                {tree.trunk_diameter_cm != null && <Row label="Đường kính thân" value={`${tree.trunk_diameter_cm} cm`} />}
                <Row label="Tọa độ" value={`${lat}, ${lng}`} accent="text-gray-400 font-mono" />
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cập nhật sức khỏe</h4>
                <div className="flex items-center gap-2">
                  <select
                    value={healthValue}
                    onChange={(e) => setHealthValue(e.target.value as HealthStatus)}
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
                  >
                    {HEALTH_OPTIONS.map((h) => (<option key={h} value={h}>{h}</option>))}
                  </select>
                  <button
                    onClick={handleHealthUpdate}
                    disabled={savingHealth}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
                  >
                    {savingHealth ? 'Đang lưu...' : 'Cập nhật'}
                  </button>
                </div>
                {healthMsg && (
                  <p className={`mt-2 text-xs ${healthMsg.includes('!') ? 'text-green-400' : 'text-red-400'}`}>{healthMsg}</p>
                )}
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tạo task bảo trì</h4>
                <form onSubmit={handleTaskSubmit} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Nhân viên <span className="text-red-400">*</span></label>
                    <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500">
                      <option value="">-- Chọn nhân viên --</option>
                      {staffUsers.map((u) => (<option key={u.id} value={u.id}>{u.full_name ?? u.username} (@{u.username})</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Loại công việc <span className="text-red-400">*</span></label>
                    <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500">
                      {TASK_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Ngày hẹn <span className="text-red-400">*</span></label>
                    <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500 [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Ghi chú</label>
                    <textarea value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)} rows={2} placeholder="Mô tả công việc..." className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500 resize-none" />
                  </div>
                  {taskMsg && (
                    <p className={`text-xs ${taskMsgType === 'success' ? 'text-green-400' : 'text-red-400'}`}>{taskMsg}</p>
                  )}
                  <div className="flex justify-end">
                    <button type="submit" disabled={savingTask} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 transition-colors">
                      {savingTask ? 'Đang tạo...' : 'Tạo task'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="px-5 py-4">
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-8">Chưa có task nào cho cây này</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="border-b border-gray-700 text-xs uppercase text-gray-400">
                      <tr>
                        <th className="py-2 pr-3">Loại</th>
                        <th className="py-2 pr-3">Nhân viên</th>
                        <th className="py-2 pr-3">Ngày hẹn</th>
                        <th className="py-2 pr-3">Trạng thái</th>
                        <th className="py-2">Ảnh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => {
                        const u = users.find((x) => x.id === task.assigned_to);
                        return (
                          <tr key={task.id} className="border-b border-gray-800">
                            <td className="py-2.5 pr-3"><span className="rounded-md bg-gray-700/60 px-2 py-0.5 text-xs">{task.task_type}</span></td>
                            <td className="py-2.5 pr-3 text-xs">{u?.full_name ?? u?.username ?? `#${task.assigned_to}`}</td>
                            <td className="py-2.5 pr-3 text-xs">{new Date(task.scheduled_date).toLocaleDateString('vi-VN')}</td>
                            <td className="py-2.5 pr-3">
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSES[task.status] ?? ''}`}>
                                {STATUS_LABELS[task.status] ?? task.status}
                              </span>
                            </td>
                            <td className="py-2.5">{task.evidence_image_url ? <span title="Có ảnh">📷</span> : <span className="text-gray-600 text-xs">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="px-5 py-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-2"></div>
                    <p className="text-sm text-gray-400">Đang tải lịch sử...</p>
                  </div>
                </div>
              ) : historyLogs.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-8">
                  Chưa có thay đổi nào được ghi nhận
                </p>
              ) : (
                <div className="space-y-3">
                  {historyLogs.map((log) => {
                    const changes = translateTreeChanges(log.old_value, log.new_value);
                    if (changes.length === 0) return null;
                    
                    return (
                      <div key={log.id} className="bg-gray-900 rounded-lg p-4 border-l-4 border-blue-500">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs text-gray-400">
                            {new Date(log.created_at).toLocaleString('vi-VN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-xs text-green-400 font-medium">
                            {log.user?.username || 'Hệ thống'}
                          </span>
                        </div>
                        <ul className="space-y-1.5">
                          {changes.map((change, idx) => (
                            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                              <span className="text-blue-400 mt-1">•</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'qrcode' && (
            <div className="px-5 py-4">
              <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                <div className="text-center">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Mã QR cho cây {tree.tree_code}</h4>
                  <p className="text-xs text-gray-500 mb-4">
                    Quét mã QR này bằng ứng dụng di động để xem thông tin cây nhanh chóng
                  </p>
                </div>

                {/* QR Code Preview */}
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg shadow-lg">
                    {loadingQRCode ? (
                      <div className="w-64 h-64 flex items-center justify-center">
                        <div className="text-center">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                          <p className="text-sm text-gray-600">Đang tải QR code...</p>
                        </div>
                      </div>
                    ) : qrCodeError ? (
                      <div className="w-64 h-64 flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-gray-600">Không thể tải QR code</p>
                          <button
                            onClick={() => {
                              setQrCodeError(false);
                              setLoadingQRCode(false);
                              setQrCodeBlobUrl(null);
                            }}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                          >
                            Thử lại
                          </button>
                        </div>
                      </div>
                    ) : qrCodeBlobUrl ? (
                      <img
                        src={qrCodeBlobUrl}
                        alt={`QR Code for ${tree.tree_code}`}
                        className="w-64 h-64 object-contain"
                      />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center">
                        <p className="text-sm text-gray-600">Chưa tải QR code</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code Info */}
                <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs text-gray-500">Mã cây:</span>
                    <span className="text-xs text-green-400 font-mono font-semibold">{tree.tree_code}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs text-gray-500">QR Data:</span>
                    <span className="text-xs text-gray-300 font-mono">cayxanh://tree/{tree.id}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs text-gray-500">Loài cây:</span>
                    <span className="text-xs text-gray-300">{tree.species?.common_name ?? '—'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs text-gray-500">Khu vực:</span>
                    <span className="text-xs text-gray-300">{tree.area?.area_name ?? '—'}</span>
                  </div>
                </div>

                {/* Download Button */}
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleDownloadQRCode}
                    disabled={downloadingQR || loadingQRCode}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {downloadingQR ? 'Đang tải...' : 'Tải mã QR (PNG)'}
                  </button>
                  
                  {qrDownloadMsg && (
                    <p className={`text-xs ${qrDownloadMsg.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
                      {qrDownloadMsg}
                    </p>
                  )}

                  <div className="text-center mt-2">
                    <p className="text-xs text-gray-500">
                      💡 <strong>Hướng dẫn:</strong> Tải file PNG này và in ra để dán lên cây. 
                      Nhân viên có thể quét mã QR bằng ứng dụng di động để xem thông tin và tạo task bảo trì.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CreateTreeModal ────────────────────────────────────────────────────────────────────────────

function CreateTreeModal({
  species,
  areas,
  onClose,
  onCreated,
}: {
  species: TreeSpecies[];
  areas: AdministrativeArea[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [treeCode, setTreeCode] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('Tốt');
  const [plantingYear, setPlantingYear] = useState('');
  const [heightM, setHeightM] = useState('');
  const [trunkDiameter, setTrunkDiameter] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Validation states
  const [treeCodeError, setTreeCodeError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [checkingTreeCode, setCheckingTreeCode] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);

  // Kiểm tra mã cây khi người dùng nhập xong (onBlur)
  async function handleTreeCodeBlur() {
    const code = treeCode.trim();
    if (!code) {
      setTreeCodeError('');
      return;
    }

    setCheckingTreeCode(true);
    setTreeCodeError('');
    try {
      const exists = await checkTreeCodeExists(code);
      if (exists) {
        setTreeCodeError('⚠️ Mã cây này đã tồn tại trong hệ thống');
      }
    } catch (err) {
      console.error('Error checking tree code:', err);
    } finally {
      setCheckingTreeCode(false);
    }
  }

  // Kiểm tra tọa độ
  async function checkLocation(lat: string, lng: string) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (!lat || !lng || isNaN(latNum) || isNaN(lngNum)) {
      setLocationError('');
      return;
    }

    setCheckingLocation(true);
    setLocationError('');
    try {
      const result = await checkLocationExists(latNum, lngNum);
      if (result.exists && result.tree) {
        setLocationError(
          `⚠️ Vị trí này đã được đăng ký cho cây ${result.tree.tree_code}. Vui lòng kiểm tra lại.`
        );
      }
    } catch (err) {
      console.error('Error checking location:', err);
    } finally {
      setCheckingLocation(false);
    }
  }

  // Kiểm tra tọa độ khi người dùng nhập xong
  function handleLocationBlur() {
    if (latitude && longitude) {
      checkLocation(latitude, longitude);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    
    // Kiểm tra lỗi validation trước khi submit
    if (treeCodeError || locationError) {
      setFormError('Vui lòng sửa các lỗi trước khi lưu');
      return;
    }
    
    if (!treeCode.trim() || !speciesId || !areaId || !latitude || !longitude) {
      setFormError('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }
    const payload: CreateTreePayload = {
      tree_code: treeCode.trim(),
      species_id: Number(speciesId),
      area_id: Number(areaId),
      latitude: Number(latitude),
      longitude: Number(longitude),
      health_status: healthStatus,
      planting_year: plantingYear ? Number(plantingYear) : undefined,
      height_m: heightM ? Number(heightM) : undefined,
      trunk_diameter_cm: trunkDiameter ? Number(trunkDiameter) : undefined,
    };
    setSaving(true);
    try {
      await createTree(payload);
      onCreated();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Tạo cây thất bại. Vui lòng thử lại.';
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Thêm cây mới</h3>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Mã cây <span className="text-red-400">*</span></label>
            <input 
              type="text" 
              value={treeCode} 
              onChange={(e) => {
                setTreeCode(e.target.value);
                setTreeCodeError(''); // Xóa lỗi khi người dùng đang nhập
              }}
              onBlur={handleTreeCodeBlur}
              required 
              className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-200 outline-none ${
                treeCodeError
                  ? 'border-red-600 bg-red-900/20 focus:border-red-500'
                  : 'border-gray-700 bg-gray-900 focus:border-green-500'
              }`}
            />
            {checkingTreeCode && (
              <p className="mt-1 text-xs text-blue-400">Đang kiểm tra...</p>
            )}
            {treeCodeError && (
              <p className="mt-1 text-xs text-red-400">{treeCodeError}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Loài cây <span className="text-red-400">*</span></label>
            <select value={speciesId} onChange={(e) => setSpeciesId(e.target.value)} required className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500">
              <option value="">-- Chọn loài cây --</option>
              {species.map((s) => (<option key={s.id} value={s.id}>{s.common_name} ({s.scientific_name})</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Khu vực <span className="text-red-400">*</span></label>
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)} required className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500">
              <option value="">-- Chọn khu vực --</option>
              {areas.map((a) => (<option key={a.id} value={a.id}>{a.area_name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Vĩ độ <span className="text-red-400">*</span></label>
              <input 
                type="number" 
                step="any" 
                value={latitude} 
                onChange={(e) => {
                  setLatitude(e.target.value);
                  setLocationError(''); // Xóa lỗi khi người dùng đang nhập
                }}
                onBlur={handleLocationBlur}
                required 
                placeholder="10.7769" 
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-200 outline-none ${
                  locationError
                    ? 'border-red-600 bg-red-900/20 focus:border-red-500'
                    : 'border-gray-700 bg-gray-900 focus:border-green-500'
                }`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Kinh độ <span className="text-red-400">*</span></label>
              <input 
                type="number" 
                step="any" 
                value={longitude} 
                onChange={(e) => {
                  setLongitude(e.target.value);
                  setLocationError(''); // Xóa lỗi khi người dùng đang nhập
                }}
                onBlur={handleLocationBlur}
                required 
                placeholder="106.7009" 
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-200 outline-none ${
                  locationError
                    ? 'border-red-600 bg-red-900/20 focus:border-red-500'
                    : 'border-gray-700 bg-gray-900 focus:border-green-500'
                }`}
              />
            </div>
          </div>
          {(checkingLocation || locationError) && (
            <div>
              {checkingLocation && (
                <p className="text-xs text-blue-400">Đang kiểm tra vị trí...</p>
              )}
              {locationError && (
                <p className="text-xs text-red-400">{locationError}</p>
              )}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Sức khỏe</label>
            <select value={healthStatus} onChange={(e) => setHealthStatus(e.target.value as HealthStatus)} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500">
              {HEALTH_OPTIONS.map((h) => (<option key={h} value={h}>{h}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Năm trồng</label>
              <input type="number" min={1900} max={2100} value={plantingYear} onChange={(e) => setPlantingYear(e.target.value)} placeholder="2020" className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Chiều cao (m)</label>
              <input type="number" step="any" min={0} value={heightM} onChange={(e) => setHeightM(e.target.value)} placeholder="5.0" className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Đường kính (cm)</label>
              <input type="number" step="any" min={0} value={trunkDiameter} onChange={(e) => setTrunkDiameter(e.target.value)} placeholder="30" className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500" />
            </div>
          </div>
          {formError && (
            <div className="rounded-lg border border-red-800/40 bg-red-900/20 px-3 py-2 text-sm text-red-400">{formError}</div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors">Hủy</button>
            <button 
              type="submit" 
              // Thêm điều kiện disable nút nếu đang check hoặc đang có lỗi
              disabled={saving || checkingTreeCode || checkingLocation || !!treeCodeError || !!locationError} 
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Đang lưu...' : 'Thêm cây'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── KpiMini ────────────────────────────────────────────────────────────────────────────

function KpiMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 px-4 py-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────────────────

export default function TreeManagementPage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [species, setSpecies] = useState<TreeSpecies[]>([]);
  const [areas, setAreas] = useState<AdministrativeArea[]>([]);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [healthFilter, setHealthFilter] = useState<'All' | HealthStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTreeTasks, setSelectedTreeTasks] = useState<MaintenanceTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  function loadData() {
    setLoading(true);
    setError('');
    Promise.all([fetchTrees(), fetchTreeSpecies(), fetchAreas(), fetchStaffUsers()])
      .then(([treeData, speciesData, areaData, userData]) => {
        setTrees(treeData);
        setSpecies(speciesData);
        setAreas(areaData);
        setUsers(userData);
      })
      .catch(() => setError('Không thể tải dữ liệu. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedTree) {
      setSelectedTreeTasks([]);
      return;
    }
    setLoadingTasks(true);
    fetchTasksByTreeId(selectedTree.id)
      .then(setSelectedTreeTasks)
      .catch(() => setSelectedTreeTasks([]))
      .finally(() => setLoadingTasks(false));
  }, [selectedTree]);

  const staffUsers = useMemo(
    () => users.filter((u) => u.roles.some((r) => r.role_name === 'Staff') && u.is_active),
    [users],
  );

  const filteredTrees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trees.filter((tree) => {
      if (healthFilter !== 'All' && tree.health_status !== healthFilter) return false;
      if (q) {
        const haystack = [
          tree.tree_code,
          tree.species?.common_name ?? '',
          tree.area?.area_name ?? '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [trees, healthFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTrees.length / PAGE_SIZE));
  const visibleTrees = filteredTrees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => ({
    total: trees.length,
    good: trees.filter((t) => t.health_status === 'Tốt').length,
    warning: trees.filter((t) => t.health_status === 'Yếu' || t.health_status === 'Sâu bệnh').length,
    dead: trees.filter((t) => t.health_status === 'Chết').length,
  }), [trees]);

  return (
    <DashboardPageFrame
      title="Quản lý Cây Xanh"
      subtitle="Xem, thêm và theo dõi toàn bộ cây xanh"
      loading={loading}
      error={error}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiMini label="Tổng cây" value={counts.total} color="text-white" />
        <KpiMini label="Tốt" value={counts.good} color="text-green-400" />
        <KpiMini label="Yếu + Sâu bệnh" value={counts.warning} color="text-amber-400" />
        <KpiMini label="Chết" value={counts.dead} color="text-red-400" />
      </div>

      <Section title="Danh sách cây">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Tìm theo mã cây, loài, khu vực..."
              className="w-56 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
            />
            <select
              value={healthFilter}
              onChange={(e) => { setHealthFilter(e.target.value as 'All' | HealthStatus); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500"
            >
              <option value="All">Tất cả sức khỏe</option>
              {HEALTH_OPTIONS.map((h) => (<option key={h} value={h}>{h}</option>))}
            </select>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Thêm cây mới
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="border-b border-gray-700 text-xs uppercase text-gray-400">
              <tr>
                <th className="py-2 pr-3">Mã cây</th>
                <th className="py-2 pr-3">Loài cây</th>
                <th className="py-2 pr-3">Khu vực</th>
                <th className="py-2 pr-3">Sức khỏe</th>
                <th className="py-2 pr-3">Chiều cao</th>
                <th className="py-2 pr-3">Năm trồng</th>
                <th className="py-2 pr-3">Bảo trì cuối</th>
                <th className="py-2">Task</th>
              </tr>
            </thead>
            <tbody>
              {visibleTrees.map((tree) => (
                <tr
                  key={tree.id}
                  onClick={() => setSelectedTree(tree)}
                  className="border-b border-gray-800 cursor-pointer hover:bg-gray-700/40 transition-colors"
                >
                  <td className="py-2.5 pr-3">
                    <span className="font-mono text-green-400 text-xs font-medium">{tree.tree_code}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-sm">{tree.species?.common_name ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-sm">{tree.area?.area_name ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${HEALTH_CLASSES[tree.health_status]}`}>
                      {tree.health_status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-sm">{tree.height_m != null ? `${tree.height_m} m` : '—'}</td>
                  <td className="py-2.5 pr-3 text-sm">{tree.planting_year ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-sm">
                    {tree.last_maintained_at
                      ? new Date(tree.last_maintained_at).toLocaleDateString('vi-VN')
                      : 'Chưa có'}
                  </td>
                  <td className="py-2.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedTree(tree); }}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                      title="Xem task"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {visibleTrees.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    Không có cây nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
      </Section>

      {/* Tree Detail Modal */}
      {selectedTree && (
        <TreeDetailModal
          tree={selectedTree}
          tasks={loadingTasks ? [] : selectedTreeTasks}
          users={users}
          staffUsers={staffUsers}
          onClose={() => setSelectedTree(null)}
          onTaskCreated={() => {
            fetchTasksByTreeId(selectedTree.id).then(setSelectedTreeTasks).catch(() => {});
          }}
          onHealthUpdated={() => {
            loadData();
          }}
        />
      )}

      {/* Create Tree Modal */}
      {showCreateModal && (
        <CreateTreeModal
          species={species}
          areas={areas}
          onClose={() => setShowCreateModal(false)}
          onCreated={loadData}
        />
      )}
    </DashboardPageFrame>
  );
}

