import apiClient from './client';
import type { HealthStatus, Tree, TreeSpecies } from '../types';

export interface TreeFilters {
  species?: number[];
  healthStatus?: HealthStatus | 'danger';
}

export async function fetchTrees(filters: TreeFilters = {}): Promise<Tree[]> {
  const { data } = await apiClient.get<Tree[]>('/trees', {
    params: {
      species: filters.species?.length ? filters.species.join(',') : undefined,
      health_status: filters.healthStatus || undefined,
    },
  });
  return data;
}

export async function fetchTreeSpecies(): Promise<TreeSpecies[]> {
  const { data } = await apiClient.get<TreeSpecies[]>('/trees/species');
  return data;
}
