import apiClient from './client';
import type { Tree } from '../types';

export async function fetchTrees(): Promise<Tree[]> {
  const { data } = await apiClient.get<Tree[]>('/trees');
  return data;
}
