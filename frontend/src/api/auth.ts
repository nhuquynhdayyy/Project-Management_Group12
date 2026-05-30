import apiClient from './client';
import type { DashboardUser, LoginResponse, RegisterUserPayload, UserRole } from '../types';

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', {
    username,
    password,
  });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
export async function fetchUsers(): Promise<DashboardUser[]> {
  const { data } = await apiClient.get<DashboardUser[]>('/auth/users');
  return data;
}

export async function registerUser(payload: RegisterUserPayload): Promise<DashboardUser> {
  const { data } = await apiClient.post<DashboardUser>('/auth/register', payload);
  return data;
}

export async function updateUserStatus(id: number, isActive: boolean): Promise<DashboardUser> {
  const { data } = await apiClient.patch<DashboardUser>(`/auth/users/${id}/status`, {
    is_active: isActive,
  });
  return data;
}

export async function updateUserRole(id: number, role: UserRole): Promise<DashboardUser> {
  const { data } = await apiClient.patch<DashboardUser>(`/auth/users/${id}/role`, {
    role,
  });
  return data;
}
