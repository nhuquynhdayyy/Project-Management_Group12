import apiClient from './client';
import type { AdministrativeArea, Tree, TreeSpecies, MaintenanceTask } from '../types';

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

// Bổ sung dòng này để sửa lỗi "fetchAdministrativeAreas"
export const fetchAdministrativeAreas = fetchAreas;

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

export async function fetchTasksByTreeId(treeId: number): Promise<MaintenanceTask[]> {
  const { data } = await apiClient.get<MaintenanceTask[]>(`/maintenance/tasks?tree_id=${treeId}`);
  return data;
}

/**
 * Fetch QR code image as Blob with authentication
 * @param treeId Tree ID
 * @returns Blob of QR code image
 */
export async function fetchTreeQRCodeBlob(treeId: number): Promise<Blob> {
  const response = await apiClient.get(`/trees/${treeId}/qrcode`, {
    responseType: 'blob',
  });
  return new Blob([response.data], { type: 'image/png' });
}

/**
 * Get QR code image URL for a tree (creates temporary blob URL)
 * Note: Caller must revoke the URL after use with URL.revokeObjectURL()
 * @param treeId Tree ID
 * @returns Promise of temporary blob URL
 */
export async function getTreeQRCodeBlobUrl(treeId: number): Promise<string> {
  const blob = await fetchTreeQRCodeBlob(treeId);
  return URL.createObjectURL(blob);
}

/**
 * Download QR code image for a tree
 * @param treeId Tree ID
 * @param filename Optional filename for download
 */
export async function downloadTreeQRCode(treeId: number, filename?: string): Promise<void> {
  const blob = await fetchTreeQRCodeBlob(treeId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `tree-${treeId}-qrcode.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}