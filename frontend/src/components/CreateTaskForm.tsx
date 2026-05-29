import { useState, useEffect, type FormEvent } from 'react';
import { createMaintenanceTask } from '../api/maintenance';
import { fetchTrees } from '../api/trees';
import type { CreateMaintenanceTaskPayload, MaintenanceTask, Tree, TaskType, DashboardUser } from '../types';

interface CreateTaskFormProps {
  onSuccess: (task: MaintenanceTask) => void;
  onCancel: () => void;
  staffUsers: DashboardUser[];
}

export default function CreateTaskForm({ onSuccess, onCancel, staffUsers }: CreateTaskFormProps) {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateMaintenanceTaskPayload>({
    tree_id: 0,
    assigned_to: 0,
    task_type: '' as TaskType,
    scheduled_date: '',
    notes: '',
  });

  useEffect(() => {
    async function loadTrees() {
      try {
        const treesData = await fetchTrees();
        setTrees(treesData);
      } catch (err) {
        setError('Không thể tải danh sách cây');
      }
    }
    loadTrees();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Build payload
      const payload: CreateMaintenanceTaskPayload = {
        tree_id: formData.tree_id,
        assigned_to: formData.assigned_to,
        task_type: formData.task_type,
        scheduled_date: formData.scheduled_date,
      };

      // Add notes if provided
      if (formData.notes && formData.notes.trim()) {
        payload.notes = formData.notes;
      }

      const createdTask = await createMaintenanceTask(payload);
      onSuccess(createdTask);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Không thể tạo nhiệm vụ. Vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateMaintenanceTaskPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-6 rounded-lg border border-gray-800">
      <h2 className="text-xl font-semibold text-white mb-4">Tạo nhiệm vụ bảo trì</h2>

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Tree Selection - Required */}
        <div>
          <label htmlFor="tree_id" className="block text-sm font-medium text-gray-300 mb-1">
            Cây cần bảo trì <span className="text-red-500">*</span>
          </label>
          <select
            id="tree_id"
            required
            value={formData.tree_id}
            onChange={(e) => handleInputChange('tree_id', parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value={0}>-- Chọn cây --</option>
            {trees.map((tree) => (
              <option key={tree.id} value={tree.id}>
                {tree.tree_code} - {tree.species.common_name} ({tree.area.area_name})
              </option>
            ))}
          </select>
        </div>

        {/* Staff Assignment - Required */}
        <div>
          <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-300 mb-1">
            Nhân viên phụ trách <span className="text-red-500">*</span>
          </label>
          <select
            id="assigned_to"
            required
            value={formData.assigned_to}
            onChange={(e) => handleInputChange('assigned_to', parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value={0}>-- Chọn nhân viên --</option>
            {staffUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.username} ({user.username})
              </option>
            ))}
          </select>
        </div>

        {/* Task Type - Required */}
        <div>
          <label htmlFor="task_type" className="block text-sm font-medium text-gray-300 mb-1">
            Loại công việc <span className="text-red-500">*</span>
          </label>
          <select
            id="task_type"
            required
            value={formData.task_type}
            onChange={(e) => handleInputChange('task_type', e.target.value as TaskType)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="">-- Chọn loại công việc --</option>
            <option value="Cắt tỉa">Cắt tỉa</option>
            <option value="Bón phân">Bón phân</option>
            <option value="Tưới nước">Tưới nước</option>
            <option value="Kiểm tra">Kiểm tra</option>
          </select>
        </div>

        {/* Scheduled Date - Required */}
        <div>
          <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-300 mb-1">
            Ngày hẹn <span className="text-red-500">*</span>
          </label>
          <input
            id="scheduled_date"
            type="date"
            required
            min={today}
            value={formData.scheduled_date}
            onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <p className="text-xs text-gray-500 mt-1">Ngày hẹn phải từ hôm nay trở đi</p>
        </div>

        {/* Notes - Optional */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">
            Ghi chú
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="Ghi chú thêm về nhiệm vụ (tùy chọn)"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Đang tạo...' : 'Tạo nhiệm vụ'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
