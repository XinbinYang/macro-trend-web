// Simplified schema for type compatibility
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export type InsertUser = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

export const users = {
  id: 'id',
  email: 'email',
  name: 'name',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
} as const;
