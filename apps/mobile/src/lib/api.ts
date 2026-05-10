import type { MobileSession, QueueOperation, ServerAppointment, SyncResult } from '../types';

type LoginResponse = {
  ok: boolean;
  token: string;
  expiresAt: string;
  user: { username: string };
};

type PullResponse = {
  serverTime: string;
  cursor: string;
  appointments: ServerAppointment[];
};

type PushResponse = {
  serverTime: string;
  cursor: string;
  appointments: ServerAppointment[];
  results: SyncResult[];
};

function normalizeBaseUrl(input: string): string {
  return input.trim().replace(/\/+$/, '');
}

function stripApiSuffix(input: string): string {
  return input.replace(/\/api$/i, '');
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function getApiBaseUrl(raw: string): string {
  const normalized = stripApiSuffix(normalizeBaseUrl(raw));
  if (!normalized) {
    throw new Error("L'URL du backend est requise.");
  }
  return normalized;
}

export function getDefaultBackendUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
  return raw ? getApiBaseUrl(raw) : '';
}

export async function loginToBackend(
  baseUrl: string,
  login: string,
  password: string,
): Promise<MobileSession> {
  const apiBaseUrl = getApiBaseUrl(baseUrl);
  const response = await fetch(`${apiBaseUrl}/api/mobile/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });

  const payload = await readJson<LoginResponse & { error?: string }>(response);
  if (!response.ok || !payload.ok || !payload.token) {
    throw new Error(payload.error ?? 'Connexion impossible.');
  }

  return {
    username: payload.user.username,
    token: payload.token,
    baseUrl: apiBaseUrl,
    expiresAt: payload.expiresAt,
  };
}

export async function pullFromBackend(
  session: MobileSession,
  cursor: string | null,
): Promise<PullResponse> {
  const search = cursor ? `?since=${encodeURIComponent(cursor)}` : '';
  const response = await fetch(`${session.baseUrl}/api/mobile/sync/pull${search}`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });
  const payload = await readJson<PullResponse & { error?: string }>(response);
  if (!response.ok) {
    throw new Error(payload.error ?? 'Lecture impossible depuis le serveur.');
  }
  return payload;
}

export async function pushToBackend(
  session: MobileSession,
  operations: QueueOperation[],
): Promise<PushResponse> {
  const response = await fetch(`${session.baseUrl}/api/mobile/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({ operations }),
  });
  const payload = await readJson<PushResponse & { error?: string }>(response);
  if (!response.ok) {
    throw new Error(payload.error ?? 'Envoi impossible vers le serveur.');
  }
  return payload;
}
