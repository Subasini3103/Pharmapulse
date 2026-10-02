import { api } from './api.ts';

export const purchaseService = {
  async getPurchases(params?: { supplierId?: number }) {
    const res = await api.get('/purchases', { params });
    return res.data;
  },

  async getPurchase(id: number) {
    const res = await api.get(`/purchases/${id}`);
    return res.data;
  },

  async createPurchase(data: {
    supplierId: number;
    notes?: string;
    items: Array<{
      medicineId: number;
      batchNumber: string;
      manufacturingDate: string;
      expiryDate: string;
      quantity: number;
      purchasePrice: number;
      sellingPrice?: number;
    }>;
  }) {
    const res = await api.post('/purchases', data);
    return res.data;
  },
};
