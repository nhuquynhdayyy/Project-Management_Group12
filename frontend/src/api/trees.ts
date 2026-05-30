import apiClient from './client';
import type { AdministrativeArea, Tree, TreeSpecies } from '../types';

export async function fetchTrees(): Promise<Tree[]> {
  const { data } = await apiClient.get<Tree[]>('/trees');
  return data;
}

export async function fetchTreeById(id: number): Promise<Tree> {
  const { data } = await apiClient.get<Tree>(`/trees/${id}`);
  return data;
}

export async function fetchTreeSpecies(): Promise<TreeSpecies[]> {
  const { data } = await apiClient.get<TreeSpecies[]>('/trees/species');
  return data;
}

export async function fetchAreas(): Promise<AdministrativeArea[]> {
  const { data } = await apiClient.get<AdministrativeArea[]>('/trees/areas');
  return data;
}

export interface CreateTreePayload {
  tree_code: string;
  species_id: number;
  area_id: number;
  latitude: number;
  longitude: number;
  health_status?: string;
  planting_year?: number;
  height_m?: number;
  trunk_diameter_cm?: number;
  notes?: string;
}

export async function createTree(payload: CreateTreePayload): Promise<Tree> {
  const { data } = await apiClient.post<Tree>('/trees', payload);
  return data;
}

export async function updateTreeHealth(id: number, healthStatus: string): Promise<Tree> {
  const { data } = await apiClient.patch<Tree>(`/trees/${id}/health`, {
    health_status: healthStatus,
  });
  return data;
}

export async function fetchTasksByTreeId(treeId: number): Promise<import('../types').MaintenanceTask[]> {
  const { data } = await apiClient.get(`/maintenance/tasks?tree_id=${treeId}`);
  return data;
}

export interface PhysicalLog {
  id: number;
  tree_id: number;
  user_id: number;
  height_m: number | null;
  trunk_diameter_cm: number | null;
  canopy_diameter_m: number | null;
  tilt_degree: number | null;
  old_values: {
    height_m?: number;
    trunk_diameter_cm?: number;
    canopy_diameter_m?: number;
    tilt_degree?: number;
  };
  new_values: {
    height_m?: number;
    trunk_diameter_cm?: number;
    canopy_diameter_m?: number;
    tilt_degree?: number;
  };
  notes: string | null;
  measured_at: string;
}

export interface PhysicalHistoryResponse {
  data: PhysicalLog[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchPhysicalHistory(
  treeId: number,
  page: number = 1,
  limit: number = 10
): Promise<PhysicalHistoryResponse> {
  const { data } = await apiClient.get<PhysicalHistoryResponse>(
    `/trees/${treeId}/physical-history?page=${page}&limit=${limit}`
  );
  return data;
}

export interface UpdatePhysicalPayload {
  height_m?: number;
  trunk_diameter_cm?: number;
  canopy_diameter_m?: number;
  tilt_degree?: number;
  notes?: string;
}

export async function updatePhysicalMeasurements(
  treeId: number,
  payload: UpdatePhysicalPayload
): Promise<{ tree: Tree; log: PhysicalLog }> {
  const { data } = await apiClient.patch(`/trees/${treeId}/physical`, payload);
  return data;
}
