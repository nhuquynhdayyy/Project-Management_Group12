import apiClient from './client';

export interface CreateIncidentRequest {
  tree_id: number;
  incident_type: string;
  description: string;
  image_url?: string;
}

export async function createIncident(data: CreateIncidentRequest) {
  const response = await apiClient.post('/incidents', data);
  return response.data;
}
