import apiClient from './client';
import type { AdministrativeArea, AgeStatsItem, HealthStats } from '../types';

export async function fetchHealthStats(areaId?: number): Promise<HealthStats> {
  const { data } = await apiClient.get<HealthStats>('/stats/health', {
    params: { areaId },
  });
  return data;
}

export async function fetchAgeStats(areaId?: number): Promise<AgeStatsItem[]> {
  const { data } = await apiClient.get<AgeStatsItem[]>('/stats/age', {
    params: { areaId },
  });
  return data;
}

export async function fetchStatsAreas(): Promise<AdministrativeArea[]> {
  const { data } = await apiClient.get<AdministrativeArea[]>('/stats/areas');
  return data;
}

export function ageStatsExportUrl(areaId?: number): string {
  const query = areaId ? `?areaId=${areaId}` : '';
  return `/api/stats/age/export${query}`;
}
