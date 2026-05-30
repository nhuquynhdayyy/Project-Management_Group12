import { useEffect, useMemo, useState } from 'react';
import { createRecurringMaintenanceSchedule } from '../api/maintenance';
import { fetchTrees } from '../api/trees';
import type { RecurrenceFrequency, TaskType, Tree } from '../types';

const TASK_TYPES: TaskType[] = ['Cắt tỉa', 'Bón phân', 'Tưới nước', 'Kiểm tra'];
const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Hằng ngày' },
  { value: 'weekly', label: 'Hằng tuần' },
  { value: 'monthly', label: 'Hằng tháng' },
];

export default function MaintenanceSchedulePage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [scope, setScope] = useState<'tree' | 'area'>('tree');
  const [treeId, setTreeId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [taskType, setTaskType] = useState<TaskType>(TASK_TYPES[2]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly');
  const [occurrences, setOccurrences] = useState(8);
  const [reminderMinutes, setReminderMinutes] = useState(60);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTrees().then(setTrees).catch(() => setError('Không thể tải danh sách cây.'));
  }, []);

  const areas = useMemo(() => {
    const map = new Map<number, string>();
    trees.forEach((tree) => {
      if (tree.area) map.set(tree.area_id, tree.area.area_name);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [trees]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      const result = await createRecurringMaintenanceSchedule({
        tree_id: scope === 'tree' ? Number(treeId) : undefined,
        area_id: scope === 'area' ? Number(areaId) : undefined,
        assigned_to: Number(assignedTo),
        task_type: taskType,
        start_date: startDate,
        frequency,
        occurrences,
        reminder_minutes: reminderMinutes,
        notes: notes || undefined,
      });
      setMessage(`Đã tạo ${result.created} công việc bảo trì và gửi thông báo nhắc việc.`);
    } catch {
      setError('Không thể tạo lịch. Kiểm tra cây/khu vực, nhân viên phụ trách và dữ liệu nhập.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Tạo lịch bảo trì</h1>
        <p className="mt-1 text-sm text-gray-400">Sinh công việc tưới nước, bón phân, cắt tỉa theo chu kỳ.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl rounded-lg border border-gray-800 bg-gray-900 p-5">
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-md bg-gray-950 p-1">
          {(['tree', 'area'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setScope(item)}
              className={`rounded px-3 py-2 text-sm font-medium ${
                scope === item ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              {item === 'tree' ? 'Theo cây' : 'Theo khu vực'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {scope === 'tree' ? (
            <label className="text-sm text-gray-300">
              Cây
              <select value={treeId} onChange={(event) => setTreeId(event.target.value)} required className="mt-1 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white">
                <option value="">Chọn cây</option>
                {trees.map((tree) => (
                  <option key={tree.id} value={tree.id}>{tree.tree_code}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="text-sm text-gray-300">
              Khu vực
              <select value={areaId} onChange={(event) => setAreaId(event.target.value)} required className="mt-1 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white">
                <option value="">Chọn khu vực</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="text-sm text-gray-300">
            Nhân viên phụ trách (ID)
            <input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} required min={1} type="number" className="mt-1 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white" />
          </label>

          <label className="text-sm text-gray-300">
            Loại công việc
            <select value={taskType} onChange={(event) => setTaskType(event.target.value as TaskType)} className="mt-1 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white">
              {TASK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>

          <label className="text-sm text-gray-300">
            Ngày bắt đầu
            <input value={startDate} onChange={(event) => setStartDate(event.target.value)} required type="date" className="mt-1 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white" />
          </label>

          <label className="text-sm text-gray-300">
            Tần suất lặp
            <select value={frequency} onChange={(event) => setFrequency(event.target.value as RecurrenceFrequency)} className="mt-1 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white">
              {FREQUENCIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label className="text-sm text-gray-300">
            Số lần lặp
            <input value={occurrences} onChange={(event) => setOccurrences(Number(event.target.value))} min={1} max={52} type="number" className="mt-1 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white" />
          </label>

          <label className="text-sm text-gray-300">
            Nhắc trước (phút)
            <input value={reminderMinutes} onChange={(event) => setReminderMinutes(Number(event.target.value))} min={0} type="number" className="mt-1 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white" />
          </label>
        </div>

        <label className="mt-4 block text-sm text-gray-300">
          Ghi chú
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white" />
        </label>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {message && <p className="mt-4 text-sm text-green-400">{message}</p>}

        <button disabled={submitting} type="submit" className="mt-5 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60">
          {submitting ? 'Đang tạo...' : 'Tạo lịch'}
        </button>
      </form>
    </div>
  );
}
