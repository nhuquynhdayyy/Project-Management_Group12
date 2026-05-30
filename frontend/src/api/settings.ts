import apiClient from './client';

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface UpdateSettingPayload {
  value: string;
  description?: string;
}

export async function fetchAllSettings(): Promise<SystemSetting[]> {
  const { data } = await apiClient.get<SystemSetting[]>('/settings');
  return data;
}

export async function fetchSetting(key: string): Promise<{ key: string; value: string }> {
  const { data } = await apiClient.get<{ key: string; value: string }>(`/settings/${key}`);
  return data;
}

export async function updateSetting(key: string, payload: UpdateSettingPayload): Promise<SystemSetting> {
  const { data } = await apiClient.patch<SystemSetting>(`/settings/${key}`, payload);
  return data;
}
