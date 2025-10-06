export interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}
