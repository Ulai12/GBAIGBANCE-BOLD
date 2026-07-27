import type { UserRole } from '@/types';

export type Permission =
  | 'events:read'
  | 'events:create'
  | 'events:update'
  | 'events:delete'
  | 'tickets:read'
  | 'tickets:create'
  | 'artists:read'
  | 'artists:update'
  | 'orgs:read'
  | 'orgs:create'
  | 'orgs:update'
  | 'admin:all';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  participant: ['events:read', 'tickets:read', 'tickets:create', 'artists:read', 'orgs:read'],
  organizer: ['events:read', 'events:create', 'events:update', 'events:delete', 'tickets:read', 'artists:read', 'orgs:read', 'orgs:create', 'orgs:update'],
  artist: ['events:read', 'events:create', 'events:update', 'tickets:read', 'artists:read', 'artists:update', 'orgs:read'],
  admin: ['events:read', 'events:create', 'events:update', 'events:delete', 'tickets:read', 'tickets:create', 'artists:read', 'artists:update', 'orgs:read', 'orgs:create', 'orgs:update', 'admin:all'],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canManageEvents(role: UserRole): boolean {
  return hasPermission(role, 'events:create');
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
