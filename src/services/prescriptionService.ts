import { api } from './api.ts';

export const prescriptionService = {
  async getPrescriptions(params?: { status?: string; customerId?: number }) {
    const res = await api.get('/prescriptions', { params });
    return res.data;
  },

  async getPrescription(id: number) {
    const res = await api.get(`/prescriptions/${id}`);
    return res.data;
  },

  async createPrescription(data: {
    doctorName: string;
    prescriptionDate: string;
    notes?: string;
    targetCustomerId?: number;
    items: Array<{
      medicineId: number;
      quantity: number;
      dosage?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
    }>;
  }) {
    const res = await api.post('/prescriptions', data);
    return res.data;
  },

  async approvePrescription(id: number) {
    const res = await api.post(`/prescriptions/${id}/approve`);
    return res.data;
  },

  async rejectPrescription(id: number, reason: string) {
    const res = await api.post(`/prescriptions/${id}/reject`, { reason });
    return res.data;
  },
};
