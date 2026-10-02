import { api } from './api.ts';

export const supplierService = {
  async getSuppliers() {
    const res = await api.get('/suppliers');
    return res.data;
  },

  async getSupplier(id: number) {
    const res = await api.get(`/suppliers/${id}`);
    return res.data;
  },

  async createSupplier(data: any) {
    const res = await api.post('/suppliers', data);
    return res.data;
  },

  async updateSupplier(id: number, data: any) {
    const res = await api.put(`/suppliers/${id}`, data);
    return res.data;
  },

  async deleteSupplier(id: number) {
    const res = await api.delete(`/suppliers/${id}`);
    return res.data;
  },
};
