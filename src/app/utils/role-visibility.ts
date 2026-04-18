import { UserRole } from '../interfaces/user';

export interface RoleOption {
  label: string;
  value: UserRole;
}

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER]: 'Super',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.USER]: 'User',
  [UserRole.NONE]: 'Sin rol'
};

export function normalizeRole(role: string | null | undefined): UserRole {
  const normalized = (role || '').trim().toLowerCase();

  if (normalized === UserRole.SUPER) return UserRole.SUPER;
  if (normalized === UserRole.ADMIN) return UserRole.ADMIN;
  if (normalized === UserRole.USER) return UserRole.USER;

  return UserRole.USER;
}

export function getVisibleRoles(role: string | null | undefined): UserRole[] {
  const currentRole = normalizeRole(role);

  if (currentRole === UserRole.SUPER) {
    return [UserRole.SUPER, UserRole.ADMIN, UserRole.USER];
  }

  if (currentRole === UserRole.ADMIN) {
    return [UserRole.ADMIN, UserRole.USER];
  }

  return [UserRole.USER];
}

export function getAssignableRoleOptions(role: string | null | undefined): RoleOption[] {
  return getVisibleRoles(role).map((visibleRole) => ({
    label: ROLE_LABELS[visibleRole],
    value: visibleRole
  }));
}

export function canManageCashCatalogs(role: string | null | undefined): boolean {
  const currentRole = normalizeRole(role);
  return currentRole === UserRole.SUPER || currentRole === UserRole.ADMIN;
}

export function formatRoleLabel(role: string | null | undefined): string {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] || ROLE_LABELS[UserRole.USER];
}
