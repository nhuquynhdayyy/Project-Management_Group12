export interface LoginResponse {
  access_token: string;
  id: number;
  username: string;
  roles: string[];
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

export type HealthStatus = 'Tốt' | 'Yếu' | 'Sâu bệnh' | 'Chết';

export interface Tree {
  id: number;
  tree_code: string;
  qr_code: string | null;
  species_id: number;
  area_id: number;
  species: TreeSpecies;
  area: AdministrativeArea;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  planting_year: number | null;
  height_m: number | null;
  trunk_diameter_cm: number | null;
  health_status: HealthStatus;
  last_maintained_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'Pending' | 'In_Progress' | 'Completed';
export type TaskType = 'Cắt tỉa' | 'Bón phân' | 'Tưới nước' | 'Kiểm tra';

export interface MaintenanceTask {
  id: number;
  tree_id: number;
  assigned_to: number;
  task_type: TaskType;
  status: TaskStatus;
  scheduled_date: string;
  completed_at: string | null;
  evidence_image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
