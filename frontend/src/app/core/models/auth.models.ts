export interface Role {
  id: string;
  name: string;
  description: string;
  permissions?: string[];
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  roles: string[];
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  roles?: string[];
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface DashboardStats {
  usersCount: number;
  activeUsersCount: number;
  assetsCount: number;
  scansCount: number;
  vulnerabilitiesCount: number;
  criticalAlertsCount: number;
  vulnerabilitiesBySeverity: Record<string, number>;
  assetsByType: Record<string, number>;
  vulnerabilitiesByStatus: Record<string, number>;
  recentActivity: AuditLog[];
}
