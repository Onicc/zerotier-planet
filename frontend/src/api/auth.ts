import type { AuthSessionPayload, AuthState, PublicStatus } from '@/types/api';
import { apiRequest } from './client';

export const authApi = {
  publicStatus: () => apiRequest<PublicStatus>('/api/status', { auth: false }),
  status: () => apiRequest<AuthState>('/api/auth/status'),
  login: (username: string, password: string) => apiRequest<AuthSessionPayload>('/api/auth/login', {
    method: 'POST', auth: false, body: { username, password },
  }),
  logout: () => apiRequest<{ loggedOut: boolean }>('/api/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) => apiRequest<AuthSessionPayload>('/api/auth/password', {
    method: 'POST', body: { currentPassword, newPassword },
  }),
  resetPassword: (newPassword: string) => apiRequest<AuthSessionPayload>('/api/auth/reset', {
    method: 'POST', body: { newPassword },
  }),
};
