import { api } from './api.ts';

export const salesService = {
  async getSales(params?: { customerId?: number; startDate?: string; endDate?: string }) {
    const res = await api.get('/sales', { params });
    return res.data;
  },

  async getSale(id: number) {
    const res = await api.get(`/sales/${id}`);
    return res.data;
  },

  async createSale(data: {
    customerId?: number;
    items: Array<{ medicineId: number; quantity: number }>;
    paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'OTHER';
    prescriptionId?: number;
    discount?: number;
    notes?: string;
  }) {
    const res = await api.post('/sales', data);
    return res.data;
  },

  async getInvoices(params?: { customerId?: number; startDate?: string; endDate?: string }) {
    const res = await api.get('/invoices', { params });
    return res.data;
  },

  async getInvoice(id: number) {
    const res = await api.get(`/invoices/${id}`);
    return res.data;
  },
};

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
