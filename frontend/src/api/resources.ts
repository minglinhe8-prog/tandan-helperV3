import { apiClient } from './client';
import type { ResourceListResponse, SearchParams, Resource } from '../types';

export async function searchResources(params: SearchParams): Promise<ResourceListResponse> {
  const { data } = await apiClient.get<ResourceListResponse>('/resources/', { params });
  return data;
}

export async function getResource(id: number): Promise<Resource> {
  const { data } = await apiClient.get<Resource>(`/resources/${id}`);
  return data;
}

export async function addFavorite(resourceId: number): Promise<void> {
  await apiClient.post(`/favorites/${resourceId}`);
}

export async function removeFavorite(resourceId: number): Promise<void> {
  await apiClient.delete(`/favorites/${resourceId}`);
}

export async function getFavorites(): Promise<Resource[]> {
  const { data } = await apiClient.get<Resource[]>('/favorites/');
  return data;
}

export async function addHistory(resourceId: number): Promise<void> {
  await apiClient.post(`/history/${resourceId}`);
}

export async function getHistory(): Promise<Resource[]> {
  const { data } = await apiClient.get<Resource[]>('/history/');
  return data;
}
