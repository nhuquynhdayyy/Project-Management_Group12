import apiClient from './client';
import type { ActivityLogFilters, PaginatedActivityLogs } from '../types';

export async function fetchActivityLogs(
  filters: ActivityLogFilters = {},
): Promise<PaginatedActivityLogs> {
  const { data } = await apiClient.get<PaginatedActivityLogs>('/audit-logs/activity', {
    params: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search || undefined,
      user_id: filters.userId || undefined,
      action: filters.action || undefined,
      entity_type: filters.entityType || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
  });
  return data;
}
