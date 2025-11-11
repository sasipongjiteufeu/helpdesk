// src/auth/role.utils.ts
import { RoleEnum } from 'src/role/entities/role.enum';

export function hasRole(user: { roles?: { name?: RoleEnum }[] }, role: RoleEnum) {
  return Array.isArray(user?.roles) && user.roles.some(r => r?.name === role);
}

export function hasAnyRole(user: { roles?: { name?: RoleEnum }[] }, roles: RoleEnum[]) {
  return roles.some(r => hasRole(user, r));
}
