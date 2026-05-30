import apiClient from './client';

export interface Tree {
  id: number;
  tree_code: string;
  qr_code: string | null;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  species: {
    id: number;
    common_name: string;
    scientific_name: string;
  };
  area: {
    id: number;
    area_name: string;
  };
  planting_year: number | null;
  height_m: number | null;
  trunk_diameter_cm: number | null;
  health_status: 'Tốt' | 'Yếu' | 'Sâu bệnh' | 'Chết';
  last_maintained_at: string | null;
}

export async function getAllTrees(): Promise<Tree[]> {
  const response = await apiClient.get<Tree[]>('/trees');
  return response.data;
}

export async function getTreeById(treeId: number): Promise<Tree> {
  const response = await apiClient.get<Tree>(`/trees/${treeId}`);
  return response.data;
}

export async function getTreeByCode(treeCode: string): Promise<Tree> {
  const response = await apiClient.get<Tree>(`/trees/code/${treeCode}`);
  return response.data;
}

export interface NearbyTree extends Tree {
  distance: number; // Khoảng cách tính bằng mét
}

/**
 * Tìm cây xung quanh vị trí hiện tại
 * @param latitude Vĩ độ
 * @param longitude Kinh độ
 * @param radiusMeters Bán kính tìm kiếm (mét), mặc định 1000m
 * @returns Danh sách cây xung quanh, sắp xếp theo khoảng cách
 */
export async function findTreesNearby(
  latitude: number,
  longitude: number,
  radiusMeters: number = 1000,
): Promise<NearbyTree[]> {
  const response = await apiClient.get<NearbyTree[]>('/trees/nearby', {
    params: {
      latitude,
      longitude,
      radius_meters: radiusMeters,
    },
  });
  return response.data;
}

/**
 * Update tree health status
 */
export async function updateTreeHealth(
  treeId: number,
  healthStatus: 'Tốt' | 'Yếu' | 'Sâu bệnh' | 'Chết'
): Promise<Tree> {
  const response = await apiClient.patch<Tree>(`/trees/${treeId}/health`, {
    health_status: healthStatus,
  });
  return response.data;
}
