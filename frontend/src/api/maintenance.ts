import apiClient from './client';
import type { CreateRecurringMaintenancePayload, MaintenanceTask } from '../types';

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
