import apiClient from './client';

export type NotificationSeverity = 'normal' | 'urgent';

export interface NotificationItem {
  id: number;
  notification_id: number;
  user_id: number;
  read_at: string | null;
  notification: {
    id: number;
    title: string;
    content: string;
    severity: NotificationSeverity;
    created_at: string;
  };
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const response = await apiClient.get<NotificationItem[]>('/notifications');
  return response.data;
}

export async function markNotificationRead(notificationId: number): Promise<NotificationItem> {
  const response = await apiClient.patch<NotificationItem>(`/notifications/${notificationId}/read`);
  return response.data;
}
