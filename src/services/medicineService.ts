import { api } from './api.ts';

export const medicineService = {
  async getMedicines(params?: {
    search?: string;
    categoryId?: number | string;
    supplierId?: number | string;
    prescriptionRequired?: boolean | string;
    lowStockOnly?: boolean | string;
    status?: string;
  }) {
    const res = await api.get('/medicines', { params });
    return res.data;
  },

  async getMedicine(id: number) {
    const res = await api.get(`/medicines/${id}`);
    return res.data;
  },

  async createMedicine(data: any) {
    const res = await api.post('/medicines', data);
    return res.data;
  },

  async updateMedicine(id: number, data: any) {
    const res = await api.put(`/medicines/${id}`, data);
    return res.data;
  },

  async deleteMedicine(id: number) {
    const res = await api.delete(`/medicines/${id}`);
    return res.data;
  },

  async getCategories() {
    const res = await api.get('/categories');
    return res.data;
  },

  async createCategory(data: { name: string; description?: string }) {
    const res = await api.post('/categories', data);
    return res.data;
  },

  async deleteCategory(id: number) {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  },
};
