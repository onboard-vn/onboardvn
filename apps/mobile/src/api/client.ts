import { Platform } from 'react-native';
import { tokenStore } from './token-store';

const explicitBase = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export const apiBase = (): string =>
  explicitBase ??
  (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const session = {
  async load() {
    token = await tokenStore.get();
    return token;
  },
  async save(next: string) {
    token = next;
    await tokenStore.set(next);
  },
  async clear() {
    token = null;
    await tokenStore.clear();
  },
  get token() {
    return token;
  },
  onUnauthorized(handler: (() => void) | null) {
    onUnauthorized = handler;
  },
};

export const authHeaders = (): Record<string, string> =>
  token ? { authorization: `Bearer ${token}` } : {};

type Query = Record<string, string | number | boolean | undefined | null>;

export interface ApiRequest {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

export const apiUrl = (path: string, query?: Query) => {
  const qs = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${apiBase()}/api${path}${qs ? `?${qs}` : ''}`;
};

export async function apiRaw(path: string, req: ApiRequest = {}): Promise<Response> {
  const res = await fetch(apiUrl(path, req.query), {
    method: req.method ?? (req.body === undefined ? 'GET' : 'POST'),
    headers: {
      ...authHeaders(),
      ...(req.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: req.body === undefined ? undefined : JSON.stringify(req.body),
    signal: req.signal,
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
  });
  const fresh = res.headers.get('set-auth-token');
  if (fresh) await session.save(fresh);
  if (res.status === 401 && token && !path.startsWith('/auth/')) onUnauthorized?.();
  return res;
}

export async function api<T>(path: string, req: ApiRequest = {}): Promise<T> {
  const res = await apiRaw(path, req);
  const text = await res.text();
  const data: unknown = text ? safeJson(text) : null;
  if (!res.ok) {
    const err = (data ?? {}) as {
      error?: { message?: string; code?: string };
      message?: string;
      code?: string;
    };
    throw new ApiError(
      res.status,
      err.error?.message ?? err.message ?? `Lỗi ${res.status}`,
      err.error?.code ?? err.code,
    );
  }
  return data as T;
}

const safeJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
