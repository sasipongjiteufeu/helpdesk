const rawApiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  'http://localhost:3000';

const normalizedApiBase = rawApiBase.replace(/\/+$/, '');

export const API_BASE = normalizedApiBase.endsWith('/api')
  ? normalizedApiBase
  : `${normalizedApiBase}/api`;

interface FrontendCacheEntry<T> {
  value: T;
  expiresAt: number;
}

const frontendCache = new Map<string, FrontendCacheEntry<unknown>>();

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

export function buildFrontendCacheKey(
  url: string,
  init: Pick<RequestInit, 'method' | 'body'> = {},
) {
  return `${init.method ?? 'GET'}:${url}:${typeof init.body === 'string' ? init.body : stableStringify(init.body ?? null)}`;
}

export function getFrontendCache<T>(key: string): T | undefined {
  const entry = frontendCache.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    frontendCache.delete(key);
    return undefined;
  }

  return entry.value as T;
}

export function setFrontendCache<T>(key: string, value: T, ttlSeconds: number) {
  if (ttlSeconds <= 0) return value;
  frontendCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return value;
}

export function invalidateFrontendCache(prefix?: string) {
  if (!prefix) {
    frontendCache.clear();
    return;
  }

  for (const key of frontendCache.keys()) {
    if (key.includes(prefix)) {
      frontendCache.delete(key);
    }
  }
}

export async function cachedJsonFetch<T>(
  url: string,
  init: RequestInit = {},
  ttlSeconds = 15,
): Promise<{ data: T; fromCache: boolean }> {
  const key = buildFrontendCacheKey(url, init);
  const cached = getFrontendCache<T>(key);
  if (cached !== undefined) {
    return { data: cached, fromCache: true };
  }

  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }

  const data = (await res.json()) as T;
  setFrontendCache(key, data, ttlSeconds);
  return { data, fromCache: false };
}

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

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListTicketMessagesPayload {
  page?: number;
  limit?: number;
  search?: string;
  sort?: 'ASC' | 'DESC';
}

export interface ListMessageAttachmentsPayload {
  page?: number;
  limit?: number;
}

export interface TicketParticipant {
  id: string;
  agent: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'> | null;
  joinedAt: string;
  isPrimary: boolean;
}

export interface TicketParticipantsResponse {
  items: TicketParticipant[];
  primaryAgent: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'> | null;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TicketMessage {
  id: string;
  message: string | null;
  createdAt: string;
  updatedAt?: string;
  sender: Omit<User, 'roles'> & { roles?: RoleEnum[] };
  attachments: TicketMessageAttachment[];
}

export interface TicketUnreadMeta {
  unreadMessageCount?: number;
  hasUnreadMessages?: boolean;
  lastMessageAt?: string | null;
}

export interface TicketTag {
  id: string;
  name: string;
  displayName?: string;
  createdAt: string;
  createdBy?: Pick<User, 'id' | 'name' | 'email'> | null;
  canDelete?: boolean;
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

export async function postTicketMessagesList(
  ticketId: string | number,
  payload: ListTicketMessagesPayload = {},
) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/messages/list`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page: payload.page ?? 1,
      limit: payload.limit ?? 50,
      search: payload.search ?? '',
      sort: payload.sort ?? 'ASC',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to load messages (${res.status})`);
  }

  return res.json() as Promise<PaginatedResponse<TicketMessage>>;
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

  invalidateFrontendCache('/tickets/');
  return res.json() as Promise<TicketMessage>;
}

export async function markTicketMessagesAsRead(ticketId: string | number) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/messages/read`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Failed to mark messages as read (${res.status})`);
  }

  invalidateFrontendCache('/tickets/');
  return res.json() as Promise<{
    success: boolean;
    ticketId: number;
    lastReadAt: string;
    lastReadMessageId?: string | null;
  }>;
}

export function getAttachmentUrl(
  ticketId: string | number,
  messageId: string,
  attachmentId: string,
) {
  return `${API_BASE}/tickets/${ticketId}/messages/${messageId}/attachments/${attachmentId}`;
}

export async function postTicketMessageAttachmentsList(
  ticketId: string | number,
  messageId: string,
  payload: ListMessageAttachmentsPayload = {},
) {
  const res = await fetch(
    `${API_BASE}/tickets/${ticketId}/messages/${messageId}/attachments/list`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: payload.page ?? 1,
        limit: payload.limit ?? 20,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to load attachments (${res.status})`);
  }

  return res.json() as Promise<PaginatedResponse<TicketMessageAttachment>>;
}

export async function joinTicket(ticketId: string | number) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/join`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to join ticket (${res.status})`);
  }

  invalidateFrontendCache('/tickets/');
  return res.json() as Promise<{
    success: boolean;
    message: string;
    ticketId: number;
    agentId: string;
    joinedAt: string;
  }>;
}

export async function leaveTicket(
  ticketId: string | number,
  payload: { agentId?: string } = {},
) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/leave`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to leave ticket (${res.status})`);
  }

  invalidateFrontendCache('/tickets/');
  return res.json() as Promise<{ success: boolean; message: string }>;
}

export async function postTicketParticipantsList(
  ticketId: string | number,
  payload: { page?: number; limit?: number } = {},
) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/participants/list`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page: payload.page ?? 1,
      limit: payload.limit ?? 50,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to load participants (${res.status})`);
  }

  return res.json() as Promise<TicketParticipantsResponse>;
}

export async function postTicketTagsList(
  ticketId: string | number,
  payload: { page?: number; limit?: number } = {},
) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/tags/list`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page: payload.page ?? 1,
      limit: payload.limit ?? 50,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to load ticket tags (${res.status})`);
  }

  return res.json() as Promise<PaginatedResponse<TicketTag>>;
}

export async function createTicketTag(ticketId: string | number, name: string) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/tags`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create ticket tag (${res.status})`);
  }

  invalidateFrontendCache('/tickets/');
  return res.json() as Promise<TicketTag>;
}

export async function deleteTicketTag(ticketId: string | number, tagId: string) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/tags/${tagId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to delete ticket tag (${res.status})`);
  }

  invalidateFrontendCache('/tickets/');
  return res.json() as Promise<{ success: boolean }>;
}
