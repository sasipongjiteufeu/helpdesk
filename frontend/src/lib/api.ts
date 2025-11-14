export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export type RoleEnum = 'USER' | 'AGENT' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  roles?: { name?: RoleEnum }[]; // adjust to your backend
}

export async function me() {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  if (res.ok) return res.json();
  if (res.status === 401 || res.status === 403) return null;
  return null;
}

export function hasAnyRole(user: User | null, required: RoleEnum[]): boolean {
  if (!user?.roles?.length) return false;
  const names = user.roles.map(r => r?.name).filter(Boolean) as RoleEnum[];
  return required.some(r => names.includes(r));
}
