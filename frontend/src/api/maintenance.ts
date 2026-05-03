import apiClient from './client';
import type { MaintenanceTask } from '../types';

export async function fetchAllTasks(): Promise<MaintenanceTask[]> {
  const { data } = await apiClient.get<MaintenanceTask[]>('/maintenance/tasks');
  return data;
}

export interface ExportTasksParams {
  format: 'xlsx' | 'pdf';
  from?: string;
  to?: string;
}

/**
 * Gọi export endpoint và trả về Blob để download.
 * Dùng fetch thay vì axios để xử lý binary response dễ hơn.
 */
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
