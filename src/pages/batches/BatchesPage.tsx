import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService.ts';
import { medicineService } from '../../services/medicineService.ts';
import { supplierService } from '../../services/supplierService.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Layers,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';

export const BatchesPage: React.FC = () => {
  const { role } = useAuth();
  const isStaff = role === 'ADMIN' || role === 'PHARMACIST';

  const [batches, setBatches] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [medicineId, setMedicineId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('50');
  const [purchasePrice, setPurchasePrice] = useState('10.00');
  const [sellingPrice, setSellingPrice] = useState('15.00');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [batchRes, medRes, supRes] = await Promise.all([
        inventoryService.getBatches(),
        medicineService.getMedicines(),
        isStaff ? supplierService.getSuppliers() : Promise.resolve({ success: true, data: [] }),
      ]);

      if (batchRes?.success) setBatches(batchRes.data || []);
      if (medRes?.success) setMedicines(medRes.data || []);
      if (supRes?.success) setSuppliers(supRes.data || []);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (new Date(expiryDate) <= new Date(manufacturingDate)) {
      setErrorMsg('Expiry date must be strictly after manufacturing date.');
      return;
    }

    setSubmitting(true);
    try {
      await inventoryService.createBatch({
        medicineId: parseInt(medicineId, 10),
        supplierId: supplierId ? parseInt(supplierId, 10) : undefined,
        batchNumber,
        manufacturingDate,
        expiryDate,
        quantity: parseInt(quantity, 10),
        purchasePrice: parseFloat(purchasePrice),
        sellingPrice: parseFloat(sellingPrice),
      });

      setSuccessMsg(`Batch '${batchNumber}' created successfully.`);
      setModalOpen(false);
      setBatchNumber('');
      setExpiryDate('');
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to add batch.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = batches.filter(
    (b) =>
      b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.medicineName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Batch Management & FEFO Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Earliest-expiry priority queue, lot numbers, and quarantine locks.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => {
              setMedicineId(medicines[0]?.id?.toString() || '');
              setSupplierId(suppliers[0]?.id?.toString() || '');
              setErrorMsg(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Batch
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lot/batch number or medicine..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
            Loading batch registry...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No batches found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Batch / Lot #</th>
                  <th className="p-3.5">Medicine</th>
                  <th className="p-3.5">Manufacturing</th>
                  <th className="p-3.5">Expiry Date</th>
                  <th className="p-3.5">Days to Expire</th>
                  <th className="p-3.5">Available Stock</th>
                  <th className="p-3.5">Pricing</th>
                  <th className="p-3.5">FEFO Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                    <td className="p-3.5 font-semibold text-slate-900">{b.medicineName}</td>
                    <td className="p-3.5 text-slate-500">{b.manufacturingDate}</td>
                    <td className="p-3.5 font-semibold text-slate-900">{b.expiryDate}</td>
                    <td className="p-3.5">
                      <span
                        className={`font-bold ${
                          b.daysUntilExpiry < 0
                            ? 'text-red-600'
                            : b.daysUntilExpiry <= 7
                            ? 'text-orange-600'
                            : b.daysUntilExpiry <= 30
                            ? 'text-amber-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {b.daysUntilExpiry < 0 ? `${Math.abs(b.daysUntilExpiry)}d ago` : `${b.daysUntilExpiry}d left`}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {b.availableQuantity} / {b.quantity}
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-500">
                      Buy: ${parseFloat(b.purchasePrice).toFixed(2)} &bull; Sell: ${parseFloat(b.sellingPrice).toFixed(2)}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.isExpired
                            ? 'bg-red-100 text-red-700'
                            : b.daysUntilExpiry <= 7
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {b.isExpired ? 'EXPIRED' : b.daysUntilExpiry <= 7 ? 'FEFO TOP PRIORITY' : 'SAFE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Batch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Add Medicine Batch</h2>
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

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Medicine *</label>
                <select
                  required
                  value={medicineId}
                  onChange={(e) => setMedicineId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.form})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BATCH-2026-X01"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mfg Date *</label>
                  <input
                    type="date"
                    required
                    value={manufacturingDate}
                    onChange={(e) => setManufacturingDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
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
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
