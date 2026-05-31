import apiClient from './client';
import type { AdministrativeArea } from '../types';

export interface CreateAreaPayload {
  name: string;
}

export interface UpdateAreaPayload {
  name: string;
}

export async function createArea(payload: CreateAreaPayload): Promise<AdministrativeArea> {
  const { data } = await apiClient.post<AdministrativeArea>('/areas', payload);
  return data;
}

export async function updateArea(id: number, payload: UpdateAreaPayload): Promise<AdministrativeArea> {
  const { data } = await apiClient.patch<AdministrativeArea>(`/areas/${id}`, payload);
  return data;
}

export async function deleteArea(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/areas/${id}`);
  return data;
}
