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
// --- INTERFACES ---
export interface UpdatePhysicalPayload {
  height_m?: number;
  trunk_diameter_cm?: number;
  canopy_diameter_m?: number;
  tilt_degree?: number;
  notes?: string;
}

export interface NearbyTree extends Tree {
  distance: number; // Khoảng cách tính bằng mét
}

export interface TreeSpecies {
  id: number;
  common_name: string;
  scientific_name: string;
}

export interface AdministrativeArea {
  id: number;
  area_name: string;
}

export interface CreateTreeData {
  tree_code: string;
  species_id: number;
  area_id: number;
  latitude: number;
  longitude: number;
  planting_year?: number;
  height_m?: number;
  trunk_diameter_cm?: number;
  canopy_diameter_m?: number;
  tilt_degree?: number;
}

// --- FUNCTIONS ---

/** Tìm cây xung quanh vị trí hiện tại */
export async function findTreesNearby(
  latitude: number,
  longitude: number,
  radiusMeters: number = 1000,
): Promise<NearbyTree[]> {
  const response = await apiClient.get<NearbyTree[]>('/trees/nearby', {
    params: { latitude, longitude, radius_meters: radiusMeters },
  });
  return response.data;
}

/** Cập nhật trạng thái sức khỏe */
export async function updateTreeHealth(
  treeId: number,
  healthStatus: 'Tốt' | 'Yêu' | 'Sâu bệnh' | 'Chết' | string
): Promise<Tree> {
  const response = await apiClient.patch<Tree>(`/trees/${treeId}/health`, {
    health_status: healthStatus,
  });
  return response.data;
}

/** Cập nhật chỉ số vật lý (ngyn) */
export async function updatePhysicalMeasurements(
  treeId: number,
  payload: UpdatePhysicalPayload
): Promise<{ tree: Tree; log: any }> {
  const response = await apiClient.patch(`/trees/${treeId}/physical`, payload);
  return response.data;
}

/** Lấy danh sách loài cây */
export async function getAllSpecies(): Promise<TreeSpecies[]> {
  const response = await apiClient.get<TreeSpecies[]>('/trees/species');
  return response.data;
}

/** Lấy danh sách khu vực */
export async function getAllAreas(): Promise<AdministrativeArea[]> {
  const response = await apiClient.get<AdministrativeArea[]>('/trees/areas');
  return response.data;
}

/** Tạo cây mới */
export async function createTree(data: CreateTreeData): Promise<Tree> {
  const response = await apiClient.post<Tree>('/trees', data);
  return response.data;
}