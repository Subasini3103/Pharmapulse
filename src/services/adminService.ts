import { api } from './api.ts';

export const adminService = {
  async getUsers() {
    const res = await api.get('/admin/users');
    return res.data;
  },

  async createUser(data: any) {
    const res = await api.post('/admin/users', data);
    return res.data;
  },

  async updateUserStatus(id: number, status: string) {
    const res = await api.put(`/admin/users/${id}/status`, { status });
    return res.data;
  },

  async updateUserRole(id: number, role: string) {
    const res = await api.put(`/admin/users/${id}/role`, { role });
    return res.data;
  },

  async getAuditLogs(params?: { limit?: number; action?: string }) {
    const res = await api.get('/admin/audit-logs', { params });
    return res.data;
  },
};
