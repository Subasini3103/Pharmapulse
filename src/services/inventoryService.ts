import { api } from './api.ts';

export const inventoryService = {
  async getInventory() {
    const res = await api.get('/inventory');
    return res.data;
  },

  async getLowStockAlerts() {
    const res = await api.get('/inventory/low-stock');
    return res.data;
  },

  async getExpiryData() {
    const res = await api.get('/inventory/expiry');
    return res.data;
  },

  async adjustStock(data: { batchId: number; type: string; quantity: number; reason?: string }) {
    const res = await api.post('/inventory/adjust', data);
    return res.data;
  },

  async getMovements(params?: { medicineId?: number; type?: string; limit?: number }) {
    const res = await api.get('/inventory/movements', { params });
    return res.data;
  },

  async getBatches(params?: { medicineId?: number; supplierId?: number; status?: string }) {
    const res = await api.get('/batches', { params });
    return res.data;
  },

  async createBatch(data: any) {
    const res = await api.post('/batches', data);
    return res.data;
  },

  async updateBatch(id: number, data: any) {
    const res = await api.put(`/batches/${id}`, data);
    return res.data;
  },
};
