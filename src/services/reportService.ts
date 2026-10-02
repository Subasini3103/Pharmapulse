import { api } from './api.ts';

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
