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

export async function downloadAgeStatsExcel(areaId?: number): Promise<void> {
  const response = await apiClient.get<Blob>('/stats/age/export', {
    params: { areaId },
    responseType: 'blob',
  });
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'thong-ke-cay-theo-do-tuoi.xlsx';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ageStatsExportUrl(areaId?: number): string {
  const query = areaId ? `?areaId=${areaId}` : '';
  return `/api/stats/age/export${query}`;
}
