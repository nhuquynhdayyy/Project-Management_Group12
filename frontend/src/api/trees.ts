import apiClient from './client';
import type { AdministrativeArea, CreateTreePayload, Tree, TreeSpecies } from '../types';

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
export async function fetchTreeSpecies() {
  const { data } = await apiClient.get('/trees/species');
  return data;
}

export async function fetchAdministrativeAreas() {
  const { data } = await apiClient.get('/trees/areas');
  return data;
}
