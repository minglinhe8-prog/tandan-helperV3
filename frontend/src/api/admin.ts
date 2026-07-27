import { apiClient } from './client';
import type { User, Resource } from '../types';

export const getStats = async () => {
  const res = await apiClient.get('/admin/stats');
  return res.data;
};

export const getUsers = async (): Promise<User[]> => {
  const res = await apiClient.get('/admin/users');
  return res.data;
};

export const updateUser = async (userId: number, data: Record<string, unknown>) => {
  await apiClient.put(`/admin/users/${userId}`, data);
};

export const deleteUser = async (userId: number) => {
  await apiClient.delete(`/admin/users/${userId}`);
};

// --- 资源管理（增强版） ---
export const getAllResources = async (params?: {
  category?: string;
  grade?: string;
  keyword?: string;
}): Promise<Resource[]> => {
  const res = await apiClient.get('/admin/resources', { params });
  return res.data;
};

export const updateResource = async (resourceId: number, data: Record<string, unknown>) => {
  await apiClient.put(`/admin/resources/${resourceId}`, data);
};

export const deleteResource = async (resourceId: number) => {
  await apiClient.delete(`/admin/resources/${resourceId}`);
};

export const bulkDeleteResources = async (ids: number[]) => {
  await apiClient.delete('/admin/resources', {
    params: { ids: ids.join(',') },
    paramsSerializer: (params) => {
      const p = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => p.append(k, String(v)));
      return p.toString();
    },
  });
};
