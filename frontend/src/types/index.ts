export interface LoginResponse {
  access_token: string;
  id: number;
  username: string;
  roles: string[];
  assigned_area_id?: number | null;
}

export type UserRole = 'Admin' | 'Manager' | 'Staff';

export interface DashboardUser {
  id: number;
  username: string;
  email: string | null;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  roles: {
    id: number;
    role_name: UserRole;
    description: string | null;
  }[];
}

export interface RegisterUserPayload {
  username: string;
  password: string;
  full_name: string;
  roles: UserRole[];
}

// Profile management types
export interface ProfileData {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  roles: string[];
  created_at: string;
}

export interface UpdateProfilePayload {
  full_name?: string;
  email?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface TreeSpecies {
  id: number;
  common_name: string;
  scientific_name: string;
}

export interface AdministrativeArea {
  id: number;
  area_name: string;
  parent_id?: number | null;
  children?: AdministrativeArea[];
  trees?: Tree[];
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

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'COMPLETE';

export interface AuditUser {
  id: number;
  username: string;
}

export interface ActivityLog {
  id: number;
  created_at: string;
  user_id: number | null;
  user: AuditUser | null;
  action: AuditAction;
  entity_type: string;
  entity_id: number | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address?: string | null;
}

export interface ActivityLogFilters {
  page?: number;
  limit?: number;
  search?: string;
  userId?: number;
  action?: AuditAction | '';
  entityType?: string;
  from?: string;
  to?: string;
}

export interface PaginatedActivityLogs {
  data: ActivityLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StaffPerformance {
  username: string;
  completed: number;
  pending: number;
  avg_completion_hours: number | null;
  overdueCount: number;
  onTimeRate: number;
  avgDaysLate: number;
  diversityScore: number;
  activeDays: number;
}

export interface OverdueTask extends MaintenanceTask {
  tree_name?: string | null;
  staff_name?: string | null;
  overdue_days?: number;
  tree?: {
    tree_code?: string;
  };
  assignedUser?: {
    id?: number;
    full_name?: string | null;
    username?: string;
    assigned_area_id?: number | null;
  };
}

export interface CreateTreePayload {
  tree_code: string;
  qr_code?: string;
  species_id: number;
  area_id: number;
  latitude: number;
  longitude: number;
  planting_year?: number;
  height_m?: number;
  trunk_diameter_cm?: number;
  canopy_diameter_m?: number;
  tilt_degree?: number;
  health_status?: HealthStatus;
  created_by?: number;
}

export interface CreateMaintenanceTaskPayload {
  tree_id: number;
  assigned_to: number;
  task_type: TaskType;
  scheduled_date: string;
  notes?: string;
}
