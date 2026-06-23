const rawApiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  'http://localhost:3000';

const normalizedApiBase = rawApiBase.replace(/\/+$/, '');

export const API_BASE = normalizedApiBase.endsWith('/api')
  ? normalizedApiBase
  : `${normalizedApiBase}/api`;

export type RoleEnum = 'USER' | 'AGENT' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  roles?: { name?: RoleEnum }[]; // adjust to your backend
}

export interface TicketMessageAttachment {
  id: string;
  originalName: string;
  filename?: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface TicketMessage {
  id: string;
  message: string | null;
  createdAt: string;
  updatedAt?: string;
  sender: User;
  attachments: TicketMessageAttachment[];
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

export async function getTicketMessages(ticketId: string | number) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/messages`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Failed to load messages (${res.status})`);
  }

  return res.json() as Promise<TicketMessage[]>;
}

export async function createTicketMessage(
  ticketId: string | number,
  formData: FormData,
) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/messages`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to send message (${res.status})`);
  }

  return res.json() as Promise<TicketMessage>;
}

export function getAttachmentUrl(
  ticketId: string | number,
  messageId: string,
  attachmentId: string,
) {
  return `${API_BASE}/tickets/${ticketId}/messages/${messageId}/attachments/${attachmentId}`;
}
