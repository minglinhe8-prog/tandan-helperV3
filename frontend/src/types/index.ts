export interface User {
  id: number;
  username: string;
  role: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Resource {
  id: number;
  name: string;
  path: string;
  category: string;
  grade: string | null;
  subject: string | null;
  course_type: string | null;
  semester: string | null;
  teacher: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ResourceListResponse {
  total: number;
  page: number;
  size: number;
  items: Resource[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface SearchParams {
  category?: string;
  grade?: string;
  subject?: string;
  course_type?: string;
  semester?: string;
  teacher?: string;
  keyword?: string;
  page?: number;
  size?: number;
}
