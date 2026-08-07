import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, AUTH_EXPIRED_EVENT, getSessionToken, setSessionToken } from './client';

const tokenKey = 'ztp_session_token';

describe('session token persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores a new session token persistently', () => {
    setSessionToken('persistent-token');

    expect(localStorage.getItem(tokenKey)).toBe('persistent-token');
    expect(sessionStorage.getItem(tokenKey)).toBeNull();
    expect(getSessionToken()).toBe('persistent-token');
  });

  it('migrates a legacy session-storage token', () => {
    sessionStorage.setItem(tokenKey, 'legacy-token');

    expect(getSessionToken()).toBe('legacy-token');
    expect(localStorage.getItem(tokenKey)).toBe('legacy-token');
    expect(sessionStorage.getItem(tokenKey)).toBeNull();
  });

  it('clears both storage locations when the token is reset', () => {
    localStorage.setItem(tokenKey, 'persistent-token');
    sessionStorage.setItem(tokenKey, 'legacy-token');

    setSessionToken('');

    expect(localStorage.getItem(tokenKey)).toBeNull();
    expect(sessionStorage.getItem(tokenKey)).toBeNull();
  });

  it('clears an invalid token and emits the auth-expired event', async () => {
    setSessionToken('expired-token');
    const expired = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'expired' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(apiRequest('/api/private')).rejects.toMatchObject({ status: 401 });

    expect(getSessionToken()).toBe('');
    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
  });
});
