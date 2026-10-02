import { api } from './api.ts';

export const customerService = {
  async getCustomers(search?: string) {
    const res = await api.get('/customers', { params: { search } });
    return res.data;
  },

  async getCustomer(id: number) {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },

  async createCustomer(data: any) {
    const res = await api.post('/customers', data);
    return res.data;
  },

  async updateCustomer(id: number, data: any) {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },

  async deleteCustomer(id: number) {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },
};
