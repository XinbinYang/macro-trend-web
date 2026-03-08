// Simplified schema for type compatibility
export interface User {
  id: string;
  openId: string;
  email: string;
  name: string | null;
  role: string;
  loginMethod: string | null;
  lastSignedIn: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type InsertUser = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

export const users = {
  id: 'id',
  openId: 'openId',
  email: 'email',
  name: 'name',
  role: 'role',
  loginMethod: 'loginMethod',
  lastSignedIn: 'lastSignedIn',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
} as const;
