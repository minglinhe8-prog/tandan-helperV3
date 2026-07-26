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

export const getAllResources = async (): Promise<Resource[]> => {
  const res = await apiClient.get('/admin/resources');
  return res.data;
};

export const updateResource = async (resourceId: number, data: Record<string, unknown>) => {
  await apiClient.put(`/admin/resources/${resourceId}`, data);
};

export const deleteResource = async (resourceId: number) => {
  await apiClient.delete(`/admin/resources/${resourceId}`);
};
