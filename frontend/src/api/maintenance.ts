import apiClient from './client';
import type { MaintenanceTask, OverdueTask, StaffPerformance, CreateMaintenanceTaskPayload } from '../types';

export async function fetchAllTasks(): Promise<MaintenanceTask[]> {
  const { data } = await apiClient.get<MaintenanceTask[]>('/maintenance/tasks');
  return data;
}

export async function fetchTaskById(id: number): Promise<MaintenanceTask> {
  const { data } = await apiClient.get<MaintenanceTask>(`/maintenance/tasks/${id}`);
  return data;
}

export async function createMaintenanceTask(payload: CreateMaintenanceTaskPayload): Promise<MaintenanceTask> {
  const { data } = await apiClient.post<MaintenanceTask>('/maintenance/tasks', payload);
  return data;
}

export async function fetchStaffPerformance(): Promise<StaffPerformance[]> {
  const { data } = await apiClient.get<StaffPerformance[]>('/maintenance/stats/by-staff');
  return data;
}

export async function fetchOverdueTasks(): Promise<OverdueTask[]> {
  const { data } = await apiClient.get<OverdueTask[]>('/maintenance/stats/overdue');
  return data;
}

export interface ExportTasksParams {
  format: 'xlsx' | 'pdf';
  from?: string;
  to?: string;
}

export async function exportTasks(params: ExportTasksParams): Promise<Blob> {
  const token = localStorage.getItem('access_token');

  const query = new URLSearchParams({ format: params.format });
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);

  const response = await fetch(`/api/maintenance/tasks/export?${query.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => 'Lỗi không xác định');
    throw new Error(`Export thất bại (${response.status}): ${message}`);
  }

  return response.blob();
}
