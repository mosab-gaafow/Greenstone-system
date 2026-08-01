import type { Capability } from '../../generated/prisma/client.js';
import type { GreenstoneRole } from '../../shared/auth/permissions.js';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: GreenstoneRole;
  isActive: boolean;
  createdAt: string;
  capabilities: Capability[];
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: GreenstoneRole;
}

export interface UpdateUserRoleInput {
  userId: string;
  role: GreenstoneRole;
}

export interface SetUserActiveInput {
  userId: string;
  reason?: string | undefined;
}

export interface CapabilityInput {
  userId: string;
  capability: Capability;
}

export interface ListUsersFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
}

export interface ListUsersResult {
  users: UserSummary[];
  totalRecords: number;
}
