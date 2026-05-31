import apiClient from './client';
import type { CreateNotificationPayload, NotificationItem } from '../types';

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const { data } = await apiClient.get<NotificationItem[]>('/notifications');
  return data;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}

export async function createNotification(payload: CreateNotificationPayload) {
  const { data } = await apiClient.post('/notifications', payload);
  return data;
}

export async function markNotificationRead(id: number) {
  const { data } = await apiClient.patch(`/notifications/${id}/read`);
  return data;
}
