import apiClient from './client';
import type { MaintenanceTask, OverdueTask, StaffPerformance, CreateMaintenanceTaskPayload, CreateRecurringMaintenancePayload, } from '../types';

// Export type alias for backward compatibility
export type CreateTaskPayload = CreateMaintenanceTaskPayload;

/**
 * LẤY DANH SÁCH CÔNG VIỆC
 */
export async function fetchAllTasks(): Promise<MaintenanceTask[]> {
  const { data } = await apiClient.get<MaintenanceTask[]>('/maintenance/tasks');
  return data;
}

export async function createRecurringMaintenanceSchedule(
  payload: CreateRecurringMaintenancePayload,
): Promise<{ created: number; tasks: MaintenanceTask[] }> {
  const { data } = await apiClient.post<{ created: number; tasks: MaintenanceTask[] }>(
    '/maintenance/schedules',
    payload,
  );
  return data;
}
// Tạo bí danh fetchTasks để các component cũ không bị lỗi
export const fetchTasks = fetchAllTasks;

export async function fetchTaskById(id: number): Promise<MaintenanceTask> {
  const { data } = await apiClient.get<MaintenanceTask>(`/maintenance/tasks/${id}`);
  return data;
}

/**
 * TẠO MỚI CÔNG VIỆC
 */
export async function createMaintenanceTask(payload: CreateMaintenanceTaskPayload): Promise<MaintenanceTask> {
  const { data } = await apiClient.post<MaintenanceTask>('/maintenance/tasks', payload);
  return data;
}

// SỬA LỖI: Tạo bí danh createTask để sửa lỗi ở TaskManagementPage.tsx
export const createTask = createMaintenanceTask;

/**
 * CẬP NHẬT & XÓA
 */
export async function updateTaskStatus(id: number, status: string): Promise<MaintenanceTask> {
  const { data } = await apiClient.patch<MaintenanceTask>(`/maintenance/tasks/${id}/status`, {
    status: status,
  });
  return data;
}

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/maintenance/tasks/${id}`);
}

/**
 * THỐNG KÊ
 */
export async function fetchStaffPerformance(): Promise<StaffPerformance[]> {
  const { data } = await apiClient.get<StaffPerformance[]>('/maintenance/stats/by-staff');
  return data;
}

export async function fetchOverdueTasks(): Promise<OverdueTask[]> {
  const { data } = await apiClient.get<OverdueTask[]>('/maintenance/stats/overdue');
  return data;
}

/**
 * XUẤT FILE (EXCEL/PDF)
 */
export interface ExportTasksParams {
  format: 'xlsx' | 'pdf';
  from?: string;
  to?: string;
}

export async function exportTasks(params: ExportTasksParams): Promise<Blob> {
  // Sử dụng trực tiếp apiClient để tận dụng cấu hình baseURL và Interceptors
  const response = await apiClient.get('/maintenance/tasks/export', {
    params: params,
    responseType: 'blob', // Quan trọng để nhận dữ liệu file
  });

  return response.data;
}
