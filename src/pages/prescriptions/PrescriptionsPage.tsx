import React, { useState, useEffect } from 'react';
import { prescriptionService } from '../../services/prescriptionService.ts';
import { medicineService } from '../../services/medicineService.ts';
import { customerService } from '../../services/customerService.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  User,
  AlertCircle,
  Loader2,
  X,
  Trash2,
} from 'lucide-react';

export const PrescriptionsPage: React.FC = () => {
  const { user, role } = useAuth();
  const isStaff = role === 'ADMIN' || role === 'PHARMACIST';
  const isCustomer = role === 'CUSTOMER';

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Submit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [targetCustomerId, setTargetCustomerId] = useState('');
  const [items, setItems] = useState<
    Array<{ medicineId: string; quantity: string; dosage: string; frequency: string; duration: string; instructions: string }>
  >([
    {
      medicineId: '',
      quantity: '1',
      dosage: '',
      frequency: 'Once Daily',
      duration: '7 days',
      instructions: '',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reject Dialog
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rxRes, medRes] = await Promise.all([
        prescriptionService.getPrescriptions({ status: statusFilter || undefined }),
        medicineService.getMedicines(),
      ]);

      if (rxRes?.success) setPrescriptions(rxRes.data || []);
      if (medRes?.success) setMedicines(medRes.data || []);

      if (isStaff) {
        const custRes = await customerService.getCustomers();
        if (custRes?.success) setCustomers(custRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        medicineId: '',
        quantity: '1',
        dosage: '',
        frequency: 'Once Daily',
        duration: '7 days',
        instructions: '',
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleItemChange = (idx: number, field: string, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    const validItems = items.filter((it) => it.medicineId && parseInt(it.quantity, 10) > 0);
    if (validItems.length === 0) {
      setErrorMsg('Please select at least one valid medicine with quantity.');
      return;
    }

    setSubmitting(true);

    try {
      await prescriptionService.createPrescription({
        doctorName,
        prescriptionDate,
        notes,
        targetCustomerId: isStaff && targetCustomerId ? parseInt(targetCustomerId, 10) : undefined,
        items: validItems.map((it) => ({
          medicineId: parseInt(it.medicineId, 10),
          quantity: parseInt(it.quantity, 10),
          dosage: it.dosage,
          frequency: it.frequency,
          duration: it.duration,
          instructions: it.instructions,
        })),
      });

      setSuccessMsg('Prescription submitted successfully.');
      setModalOpen(false);
      setDoctorName('');
      setNotes('');
      loadData();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const res = await prescriptionService.approvePrescription(id);
      if (res?.success) {
        setSuccessMsg(res.message);
        loadData();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve prescription.');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      const res = await prescriptionService.rejectPrescription(rejectId, rejectReason);
      if (res?.success) {
        setSuccessMsg(res.message);
        setRejectId(null);
        setRejectReason('');
        loadData();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject prescription.');
    } finally {
      setRejecting(false);
    }
  };

  const filtered = prescriptions.filter(
    (rx) =>
      rx.prescriptionNumber.toLowerCase().includes(search.toLowerCase()) ||
      rx.doctorName.toLowerCase().includes(search.toLowerCase()) ||
      (rx.customerName && rx.customerName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isCustomer ? 'My Prescriptions' : 'Clinical Prescription Verification'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Doctor authentication, clinical dosage evaluation & electronic dispensing authorization.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />{' '}
          {isCustomer ? 'Upload Prescription' : 'New Doctor Prescription'}
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Rx number, doctor name, patient..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-semibold"
        >
          <option value="">All Verification Statuses</option>
          <option value="PENDING">Pending Verification</option>
          <option value="APPROVED">Approved for POS Sale</option>
          <option value="COMPLETED">Completed / Dispensed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
            Loading prescriptions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No prescriptions found matching criteria.
          </div>
        ) : (
          filtered.map((rx) => (
            <div
              key={rx.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {rx.prescriptionNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rx.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : rx.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-700 animate-pulse'
                          : rx.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {rx.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Prescribed by <span className="font-semibold text-slate-700">{rx.doctorName}</span> &bull; Date:{' '}
                    {rx.prescriptionDate}
                  </p>
                </div>

                <div className="text-xs text-slate-600 sm:text-right">
                  <span className="text-slate-400 text-[10px] block">Patient / Customer</span>
                  <span className="font-bold text-slate-900">{rx.customerName || 'N/A'}</span>
                  <span className="text-[11px] text-slate-500 block">{rx.customerPhone}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="py-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Prescribed Formulations & Regimen:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {rx.items?.map((it: any) => (
                    <div
                      key={it.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{it.medicineName}</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {it.dosage && <span>{it.dosage} &bull; </span>}
                          <span>{it.frequency} &bull; </span>
                          <span>{it.duration}</span>
                        </div>
                        {it.instructions && (
                          <div className="text-[10px] text-emerald-700 mt-1 italic">
                            Instr: {it.instructions}
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        Qty: {it.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes & Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 text-[11px]">
                  {rx.notes && <div>Clinical notes: {rx.notes}</div>}
                  {rx.rejectionReason && (
                    <div className="text-red-600 font-medium">Rejection reason: {rx.rejectionReason}</div>
                  )}
                  {rx.pharmacistName && (
                    <div className="text-slate-400 mt-0.5">Verified by Pharmacist: {rx.pharmacistName}</div>
                  )}
                </div>

                {isStaff && rx.status === 'PENDING' && (
                  <div className="flex items-center gap-2 self-end">
                    <button
                      onClick={() => handleApprove(rx.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve for Dispensing
                    </button>
                    <button
                      onClick={() => {
                        setRejectId(rx.id);
                        setRejectReason('');
                      }}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl text-xs flex items-center gap-1 transition cursor-pointer border border-red-200"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Submit Prescription Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {isCustomer ? 'Submit Doctor Prescription' : 'Create Electronic Prescription'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="my-3 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Doctor's Full Name *</label>
                  <input
                    type="text"
                    required
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Allison Cameron, M.D."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prescription Date *</label>
                  <input
                    type="date"
                    required
                    value={prescriptionDate}
                    onChange={(e) => setPrescriptionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {isStaff && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Patient / Customer *</label>
                  <select
                    required
                    value={targetCustomerId}
                    onChange={(e) => setTargetCustomerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800">Prescription Medicines & Dosages</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-emerald-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medicine
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Medicine #{idx + 1}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <select
                            required
                            value={item.medicineId}
                            onChange={(e) => handleItemChange(idx, 'medicineId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            <option value="">Select Medicine</option>
                            {medicines.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.dosage || m.form}) {m.prescriptionRequired ? '[Rx]' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 500mg)"
                          value={item.dosage}
                          onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Frequency (e.g. TID)"
                          value={item.frequency}
                          onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Duration (e.g. 7 days)"
                          value={item.duration}
                          onChange={(e) => handleItemChange(idx, 'duration', e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Diagnosis / Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Clinical observations or instructions..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-1">Reject Prescription</h2>
            <p className="text-xs text-slate-500 mb-4">
              State the clinical reason for rejecting this prescription request:
            </p>

            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete dosage instructions, illegible signature, medication contraindicated..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting || !rejectReason.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
