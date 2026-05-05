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
  imageUri?: string; // Local file URI
}

export async function getMyTasks(): Promise<MaintenanceTask[]> {
  const response = await apiClient.get<MaintenanceTask[]>('/maintenance/tasks/my-tasks');
  return response.data;
}

export async function getTaskById(taskId: number): Promise<MaintenanceTask> {
  const response = await apiClient.get<MaintenanceTask>(`/maintenance/tasks/${taskId}`);
  return response.data;
}

export async function completeTask(
  taskId: number,
  data: CompleteTaskRequest
): Promise<MaintenanceTask> {
  // Create FormData for multipart/form-data request
  const formData = new FormData();
  
  // Add required fields
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());
  
  // Add optional notes
  if (data.notes) {
    formData.append('notes', data.notes);
  }
  
  // Add optional image
  if (data.imageUri) {
    const filename = data.imageUri.split('/').pop() || 'evidence.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('image', {
      uri: data.imageUri,
      name: filename,
      type: type,
    } as any);
  }
  
  const response = await apiClient.post<MaintenanceTask>(
    `/maintenance/tasks/${taskId}/complete`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  
  return response.data;
}
