import apiClient from './client';
import type { DashboardUser, LoginResponse, RegisterUserPayload, UserRole, ProfileData, UpdateProfilePayload, ChangePasswordPayload } from '../types';

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

export async function fetchUsersByRole(role: string): Promise<DashboardUser[]> {
  const { data } = await apiClient.post<DashboardUser[]>('/auth/users/by-role', { role });
  return data;
}

export async function fetchStaffUsers(): Promise<DashboardUser[]> {
  return fetchUsersByRole('Staff');
}

export async function registerUser(payload: RegisterUserPayload): Promise<DashboardUser> {
  const { data } = await apiClient.post<DashboardUser>('/auth/register', payload);
  return data;
}

export async function updateUserStatus(id: number, isActive: boolean, reason?: string): Promise<DashboardUser> {
  const { data } = await apiClient.patch<DashboardUser>(`/auth/users/${id}/status`, {
    is_active: isActive,
    reason,
  });
  return data;
}

export async function updateUserRole(id: number, role: UserRole): Promise<DashboardUser> {
  const { data } = await apiClient.patch<DashboardUser>(`/auth/users/${id}/role`, {
    role,
  });
  return data;
}

// Profile management
export async function getProfile(): Promise<ProfileData> {
  const { data } = await apiClient.get<ProfileData>('/auth/profile');
  return data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileData> {
  const { data } = await apiClient.patch<ProfileData>('/auth/profile', payload);
  return data;
}

export async function updateAvatar(file: File): Promise<ProfileData> {
  const formData = new FormData();
  formData.append('avatar', file);

  const { data } = await apiClient.patch<ProfileData>('/auth/profile/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  const { data } = await apiClient.patch<{ message: string }>('/auth/profile/password', payload);
  return data;
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', {
    email,
  });
  return data;
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', {
    token,
    new_password: newPassword,
  });
  return data;
}
