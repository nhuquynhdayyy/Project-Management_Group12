import apiClient from './client';
import type { CreateIncidentPayload } from '../types';

export async function createIncident(payload: CreateIncidentPayload) {
  const { data } = await apiClient.post('/incidents', payload);
  return data;
}
