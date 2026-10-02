import { api } from './api.ts';

export const authService = {
  async register(data: { name: string; email: string; phone?: string; password: string; confirmPassword: string }) {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  async login(credentials: { email: string; password: string }) {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('pharma_access_token');
      localStorage.removeItem('pharma_refresh_token');
      localStorage.removeItem('pharma_user');
    }
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async forgotPassword(email: string) {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(data: { token: string; newPassword: string; confirmPassword: string }) {
    const res = await api.post('/auth/reset-password', data);
    return res.data;
  },
};
