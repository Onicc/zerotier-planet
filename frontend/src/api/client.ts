const TOKEN_KEY = 'ztp_session_token';
export const AUTH_EXPIRED_EVENT = 'ztp:auth-expired';

function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  mustChangePassword?: boolean;

  constructor(message: string, status: number, details?: unknown, mustChangePassword?: boolean) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.mustChangePassword = mustChangePassword;
  }
}

export function getSessionToken(): string {
  const persistentToken = localStorage.getItem(TOKEN_KEY);
  if (persistentToken) return persistentToken;

  const legacyToken = sessionStorage.getItem(TOKEN_KEY);
  if (legacyToken) {
    localStorage.setItem(TOKEN_KEY, legacyToken);
    sessionStorage.removeItem(TOKEN_KEY);
  }
  return legacyToken || '';
}

export function setSessionToken(token: string): void {
  clearStoredToken();
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export async function apiRequest<T>(path: string, options: Omit<RequestInit, 'body'> & { auth?: boolean; body?: unknown } = {}): Promise<T> {
  const { auth = true, body, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const token = getSessionToken();
  if (auth && token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(path, {
    ...requestOptions,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (auth && response.status === 401 && token) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(
      String(payload.error || `Request failed: ${response.status}`),
      response.status,
      payload.details,
      Boolean(payload.mustChangePassword),
    );
  }
  return payload as T;
}
