import React, { useState, useEffect } from 'react';
import { purchaseService } from '../../services/purchaseService.ts';
import { supplierService } from '../../services/supplierService.ts';
import { medicineService } from '../../services/medicineService.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Trash2,
  Layers,
  Calendar,
} from 'lucide-react';

export const PurchasesPage: React.FC = () => {
  const { role } = useAuth();
  const isStaff = role === 'ADMIN' || role === 'PHARMACIST';

  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{
      medicineId: string;
      batchNumber: string;
      manufacturingDate: string;
      expiryDate: string;
      quantity: string;
      purchasePrice: string;
      sellingPrice: string;
    }>
  >([
    {
      medicineId: '',
      batchNumber: '',
      manufacturingDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      quantity: '50',
      purchasePrice: '10.00',
      sellingPrice: '15.00',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [poRes, supRes, medRes] = await Promise.all([
        purchaseService.getPurchases(),
        isStaff ? supplierService.getSuppliers() : Promise.resolve({ success: true, data: [] }),
        medicineService.getMedicines(),
      ]);

      if (poRes?.success) setPurchases(poRes.data || []);
      if (supRes?.success) setSuppliers(supRes.data || []);
      if (medRes?.success) setMedicines(medRes.data || []);
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        medicineId: '',
        batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
        manufacturingDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        quantity: '50',
        purchasePrice: '10.00',
        sellingPrice: '15.00',
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

    if (!supplierId) {
      setErrorMsg('Please select a supplier.');
      return;
    }

    const validItems = items.filter(
      (it) =>
        it.medicineId &&
        it.batchNumber.trim() &&
        it.manufacturingDate &&
        it.expiryDate &&
        parseInt(it.quantity, 10) > 0
    );

    if (validItems.length === 0) {
      setErrorMsg('Please specify all batch numbers, dates, and quantities.');
      return;
    }

    // Expiry after manufacturing validation
    for (const it of validItems) {
      if (new Date(it.expiryDate) <= new Date(it.manufacturingDate)) {
        setErrorMsg(`Batch ${it.batchNumber}: Expiry date must be after manufacturing date.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      await purchaseService.createPurchase({
        supplierId: parseInt(supplierId, 10),
        notes,
        items: validItems.map((it) => ({
          medicineId: parseInt(it.medicineId, 10),
          batchNumber: it.batchNumber.trim().toUpperCase(),
          manufacturingDate: it.manufacturingDate,
          expiryDate: it.expiryDate,
          quantity: parseInt(it.quantity, 10),
          purchasePrice: parseFloat(it.purchasePrice),
          sellingPrice: parseFloat(it.sellingPrice),
        })),
      });

      setSuccessMsg('Purchase order recorded and stock automatically updated.');
      setModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Purchase recording failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Supplier Purchases & Stocking</h1>
          <p className="text-xs text-slate-500 mt-1">
            Supplier procurement logistics, automated batch creation & inventory augmentation.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => {
              setSupplierId(suppliers[0]?.id?.toString() || '');
              setErrorMsg(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> New Supply Order
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Purchases List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
            Loading purchase orders...
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No purchase records found.
          </div>
        ) : (
          purchases.map((po) => (
            <div
              key={po.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{po.purchaseOrderNumber}</span>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {po.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supplier: <span className="font-semibold text-slate-700">{po.supplierName}</span> &bull; Order Date:{' '}
                    {new Date(po.purchaseDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total Procurement Amount</span>
                  <span className="text-base font-bold text-slate-900">${parseFloat(po.totalAmount).toFixed(2)}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="py-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Supplied Batch Items:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {po.items?.map((it: any) => (
                    <div
                      key={it.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{it.medicineName}</span>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          Batch: {it.batchNumber} &bull; Exp: {it.expiryDate}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Buy: ${parseFloat(it.purchasePrice).toFixed(2)} &bull; Sell: ${parseFloat(it.sellingPrice).toFixed(2)}
                        </div>
                      </div>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        +{it.quantity} units
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {po.notes && (
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
                  Notes: {po.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Purchase Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Create Supplier Purchase Order</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="my-3 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Supplier *</label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} ({s.contactPerson})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800">Procured Batches & Quantities</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-emerald-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medicine Batch
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Item #{idx + 1}</span>
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
                          <label className="block text-[10px] text-slate-400 mb-0.5">Medicine *</label>
                          <select
                            required
                            value={item.medicineId}
                            onChange={(e) => handleItemChange(idx, 'medicineId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            <option value="">Select Medicine</option>
                            {medicines.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.dosage || m.form})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Batch Number *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. BATCH-2026-01"
                            value={item.batchNumber}
                            onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Mfg Date</label>
                          <input
                            type="date"
                            required
                            value={item.manufacturingDate}
                            onChange={(e) => handleItemChange(idx, 'manufacturingDate', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Exp Date *</label>
                          <input
                            type="date"
                            required
                            value={item.expiryDate}
                            onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Purchase Price ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={item.purchasePrice}
                            onChange={(e) => handleItemChange(idx, 'purchasePrice', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Order Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery terms, temperature storage requirements..."
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
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm & Augment Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
