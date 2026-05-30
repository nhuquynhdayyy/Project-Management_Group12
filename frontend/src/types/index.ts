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
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';
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

export interface CreateRecurringMaintenancePayload {
  tree_id?: number;
  area_id?: number;
  assigned_to: number;
  task_type: TaskType;
  start_date: string;
  frequency: RecurrenceFrequency;
  occurrences: number;
  reminder_minutes?: number;
  notes?: string;
}

export interface HealthStats {
  healthy: number;
  weak: number;
  dead: number;
}

export interface AgeStatsItem {
  label: string;
  count: number;
}

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'CHANGE_STATUS'
  | 'COMPLETE'
  | 'COMPLETE_TASK'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DELETE_USER'
  | 'CHANGE_ROLE';

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

export type NotificationSeverity = 'normal' | 'urgent';
export type NotificationAudience = 'all' | 'roles';

export interface NotificationItem {
  id: number;
  notification_id: number;
  user_id: number;
  read_at: string | null;
  notification: {
    id: number;
    title: string;
    content: string;
    severity: NotificationSeverity;
    audience: NotificationAudience;
    target_roles: string[] | null;
    created_by: number | null;
    created_at: string;
  };
}

export interface CreateNotificationPayload {
  title: string;
  content: string;
  audience: NotificationAudience;
  severity: NotificationSeverity;
  roles?: string[];
}

export type IncidentStatus = 'new' | 'in_progress' | 'resolved';

export interface CreateIncidentPayload {
  tree_id: number;
  incident_type: string;
  description: string;
  image_url?: string;
}
