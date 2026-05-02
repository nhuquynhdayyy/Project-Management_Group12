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

export async function getTreeByCode(treeCode: string): Promise<Tree> {
  const response = await apiClient.get<Tree>(`/trees/code/${treeCode}`);
  return response.data;
}
