import { api } from './api.ts';

export const dashboardService = {
  async getAdminDashboard() {
    const res = await api.get('/dashboard/admin');
    return res.data;
  },

  async getPharmacistDashboard() {
    const res = await api.get('/dashboard/pharmacist');
    return res.data;
  },

  async getSupplierDashboard() {
    const res = await api.get('/dashboard/supplier');
    return res.data;
  },

  async getCustomerDashboard() {
    const res = await api.get('/dashboard/customer');
    return res.data;
  },
};

export const reportService = {
  async getSalesReport(params?: { range?: string; startDate?: string; endDate?: string }) {
    const res = await api.get('/reports/sales', { params });
    return res.data;
  },

  async getPurchaseReport(params?: { range?: string; startDate?: string; endDate?: string }) {
    const res = await api.get('/reports/purchases', { params });
    return res.data;
  },

  async getInventoryReport() {
    const res = await api.get('/reports/inventory');
    return res.data;
  },

  async getExpiryReport() {
    const res = await api.get('/reports/expiry');
    return res.data;
  },
};

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

export const notificationService = {
  async getNotifications() {
    const res = await api.get('/notifications');
    return res.data;
  },

  async markAsRead(id: number) {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllAsRead() {
    const res = await api.put('/notifications/read-all');
    return res.data;
  },
};
