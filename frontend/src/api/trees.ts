import apiClient from './client';
import type { Tree, CreateTreePayload } from '../types';

export async function fetchTrees(): Promise<Tree[]> {
  const { data } = await apiClient.get<Tree[]>('/trees');
  return data;
}

export async function createTree(payload: CreateTreePayload): Promise<Tree> {
  const { data } = await apiClient.post<Tree>('/trees', payload);
  return data;
}

export async function fetchTreeSpecies() {
  const { data } = await apiClient.get('/trees/species');
  return data;
}

export async function fetchAdministrativeAreas() {
  const { data } = await apiClient.get('/trees/areas');
  return data;
}
