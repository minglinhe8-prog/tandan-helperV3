import { apiClient } from './client';

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  username: string;
  role: string;
}

export const login = async (username: string, password: string): Promise<string> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', { username, password });
  const token = response.data.access_token;
  localStorage.setItem('access_token', token);
  return token;
};

export const logout = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('current_user');
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/me');
  localStorage.setItem('current_user', JSON.stringify(response.data));
  return response.data;
};

export const getStoredUser = (): User | null => {
  const raw = localStorage.getItem('current_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
