import apiClient from './client';

export interface MaintenanceTask {
  id: number;
  tree_id: number;
  assigned_to: number;
  task_type: 'Cắt tỉa' | 'Bón phân' | 'Tưới nước' | 'Kiểm tra';
  status: 'Pending' | 'In_Progress' | 'Completed';
  scheduled_date: string;
  completed_at: string | null;
  evidence_image_url: string | null;
  notes: string | null;
  tree?: {
    id: number;
    tree_code: string;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
    species: {
      common_name: string;
    };
  };
}

export interface CompleteTaskRequest {
  latitude: number;
  longitude: number;
  notes?: string;
  evidence_image?: string; // Base64 encoded image
}

export async function getMyTasks(): Promise<MaintenanceTask[]> {
  try {
    const response = await apiClient.get<MaintenanceTask[]>('/maintenance/tasks/my-tasks');
    console.log('My tasks response:', response.data);
    
    // Ensure we return an array
    if (!Array.isArray(response.data)) {
      console.error('Invalid response format:', response.data);
      return [];
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    throw error;
  }
}

export async function completeTask(
  taskId: number,
  data: CompleteTaskRequest
): Promise<MaintenanceTask> {
  const response = await apiClient.post<MaintenanceTask>(
    `/maintenance/tasks/${taskId}/complete`,
    data
  );
  return response.data;
}
