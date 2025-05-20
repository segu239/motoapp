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
  sucursalesPermitidas?: number[]; // Array de IDs (value) de sucursales permitidas
}

export enum UserRole {
  SUPER = 'super',
  ADMIN = 'admin',
  USER = 'user',
  NONE = 'none'
} 