import { Platform } from 'react-native';
import { ApiError, apiUrl, authHeaders } from '../../api/client';

interface BodyRequest {
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: BodyInit;
  contentType?: string;
  query?: Record<string, string>;
}

export async function apiBody<T>(path: string, req: BodyRequest): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path, req.query), {
      method: req.method,
      headers: {
        ...authHeaders(),
        ...(req.contentType ? { 'content-type': req.contentType } : {}),
      },
      body: req.body,
      credentials: Platform.OS === 'web' ? 'include' : 'omit',
    });
  } catch {
    throw new ApiError(0, 'Mất kết nối, thử lại sau');
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data ?? {}) as { error?: { message?: string; code?: string }; message?: string };
    throw new ApiError(
      res.status,
      err.error?.message ?? err.message ?? `Lỗi ${res.status}`,
      err.error?.code,
    );
  }
  return data as T;
}
