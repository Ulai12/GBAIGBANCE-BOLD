/**
 * Client-side RBAC utilities.
 * Note: These provide UI display gating only. Database security is enforced
 * by PostgreSQL Row Level Security (RLS), triggers, and SECURITY DEFINER RPCs.
 */
import type { UserRole } from '@/types';

export type Permission =
  | 'events:read'
  | 'events:create'
  | 'events:update'
  | 'events:delete'
  | 'tickets:read'
  | 'tickets:book'
  | 'tickets:validate'
  | 'artists:read'
  | 'artists:update'
  | 'orgs:read'
  | 'orgs:create'
  | 'orgs:update'
  | 'orgs:verify'
  | 'admin:all';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  participant: ['events:read', 'tickets:read', 'tickets:book', 'artists:read', 'orgs:read'],
  organizer: ['events:read', 'events:create', 'events:update', 'events:delete', 'tickets:read', 'tickets:book', 'tickets:validate', 'artists:read', 'orgs:read', 'orgs:create', 'orgs:update'],
  artist: ['events:read', 'events:create', 'events:update', 'tickets:read', 'tickets:book', 'artists:read', 'artists:update', 'orgs:read'],
  admin: ['events:read', 'events:create', 'events:update', 'events:delete', 'tickets:read', 'tickets:book', 'tickets:validate', 'artists:read', 'artists:update', 'orgs:read', 'orgs:create', 'orgs:update', 'orgs:verify', 'admin:all'],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canManageEvents(role: UserRole): boolean {
  return hasPermission(role, 'events:create');
}

export function canValidateTickets(role: UserRole): boolean {
  return hasPermission(role, 'tickets:validate');
}

export function canVerifyOrganizations(role: UserRole): boolean {
  return hasPermission(role, 'orgs:verify');
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[0-9]{8,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

