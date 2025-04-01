export interface User {
  uid?: string;
  email: string;
  nombre: string;
  apellido: string;
  password?: string;
  telefono?: string;
  nivel: UserRole;
  emailVerified?: boolean;
  photoURL?: string;
  createdAt?: Date;
  lastLoginAt?: Date;
  username?: string;
}

export enum UserRole {
  SUPER = 'super',
  ADMIN = 'admin',
  USER = 'user',
  NONE = 'none'
} 