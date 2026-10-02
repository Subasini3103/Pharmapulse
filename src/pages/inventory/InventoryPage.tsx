import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Package,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  History,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Layers,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { role } = useAuth();
  const isStaff = role === 'ADMIN' || role === 'PHARMACIST';

  const [activeTab, setActiveTab] = useState<'stock' | 'expiry' | 'movements'>('stock');
  const [inventory, setInventory] = useState<any[]>([]);
  const [expiryData, setExpiryData] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [adjustType, setAdjustType] = useState('DAMAGE');
  const [adjustQuantity, setAdjustQuantity] = useState('1');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, expRes, movRes, batchRes] = await Promise.all([
        inventoryService.getInventory(),
        inventoryService.getExpiryData(),
        inventoryService.getMovements({ limit: 50 }),
        inventoryService.getBatches(),
      ]);

      if (invRes?.success) setInventory(invRes.data || []);
      if (expRes?.success) setExpiryData(expRes.data);
      if (movRes?.success) setMovements(movRes.data || []);
      if (batchRes?.success) setBatches(batchRes.data || []);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAdjusting(true);

    try {
      const res = await inventoryService.adjustStock({
        batchId: parseInt(selectedBatchId, 10),
        type: adjustType,
        quantity: parseInt(adjustQuantity, 10),
        reason: adjustReason,
      });

      if (res?.success) {
        setMessage(res.message || 'Stock successfully adjusted.');
        setAdjustModalOpen(false);
        setSelectedBatchId('');
        setAdjustReason('');
        loadData();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Stock adjustment failed.');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventory Management & FEFO Tracking</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time stock ledger, batch expiry surveillance, and stock movement auditing.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => {
              setSelectedBatchId(batches[0]?.id?.toString() || '');
              setErrorMsg(null);
              setAdjustModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <ArrowUpDown className="w-4 h-4" /> Stock Adjustment
          </button>
        )}
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'stock'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" /> Stock Status per Medicine
        </button>
        <button
          onClick={() => setActiveTab('expiry')}
          className={`pb-3 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'expiry'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" /> Expiry Surveillance (FEFO)
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'movements'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" /> Stock Movements Log
        </button>
      </div>

      {/* Tab 1: Stock Status */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
              Computing inventory metrics...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Medicine</th>
                    <th className="p-3.5">Current Stock</th>
                    <th className="p-3.5">Min Threshold</th>
                    <th className="p-3.5">Restock Need</th>
                    <th className="p-3.5">Expiring in 30d</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-400">{item.categoryName}</div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{item.totalStock} units</td>
                      <td className="p-3.5 text-slate-600">{item.minimumStockLevel} units</td>
                      <td className="p-3.5">
                        {item.requiredRestock > 0 ? (
                          <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            +{item.requiredRestock} units
                          </span>
                        ) : (
                          <span className="text-slate-400">Sufficient</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {item.expiringSoonStock > 0 ? (
                          <span className="font-bold text-orange-700">{item.expiringSoonStock} units</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.stockStatus === 'OUT_OF_STOCK'
                              ? 'bg-red-100 text-red-700'
                              : item.stockStatus === 'LOW_STOCK'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {item.stockStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Expiry Surveillance */}
      {activeTab === 'expiry' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-red-600">Expired Batches</span>
              <div className="text-2xl font-bold text-red-900 mt-1">{expiryData?.expired?.length || 0}</div>
              <p className="text-[10px] text-red-700 mt-0.5">Excluded from POS dispensing</p>
            </div>
            <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-orange-600">Expiring &le; 7 Days</span>
              <div className="text-2xl font-bold text-orange-900 mt-1">{expiryData?.expiring7Days?.length || 0}</div>
              <p className="text-[10px] text-orange-700 mt-0.5">Critical FEFO dispatch</p>
            </div>
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-amber-600">Expiring &le; 30 Days</span>
              <div className="text-2xl font-bold text-amber-900 mt-1">{expiryData?.expiring30Days?.length || 0}</div>
              <p className="text-[10px] text-amber-700 mt-0.5">Warning threshold</p>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-emerald-600">Safe Stock (&gt;90d)</span>
              <div className="text-2xl font-bold text-emerald-900 mt-1">{expiryData?.safe?.length || 0}</div>
              <p className="text-[10px] text-emerald-700 mt-0.5">Long shelf-life</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-xs uppercase tracking-wider">
              Batches At-Risk or Requiring Attention
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Medicine</th>
                    <th className="p-3">Batch Number</th>
                    <th className="p-3">Expiry Date</th>
                    <th className="p-3">Days Remaining</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Risk Assessment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ...(expiryData?.expired || []),
                    ...(expiryData?.expiring7Days || []),
                    ...(expiryData?.expiring30Days || []),
                  ].map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 font-semibold text-slate-900">{b.medicineName}</td>
                      <td className="p-3 font-mono font-medium text-slate-700">{b.batchNumber}</td>
                      <td className="p-3 font-semibold text-slate-900">{b.expiryDate}</td>
                      <td className="p-3">
                        <span
                          className={`font-bold ${
                            b.daysUntilExpiry < 0
                              ? 'text-red-600'
                              : b.daysUntilExpiry <= 7
                              ? 'text-orange-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {b.daysUntilExpiry < 0 ? `${Math.abs(b.daysUntilExpiry)} days expired` : `${b.daysUntilExpiry} days`}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{b.availableQuantity} units</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            b.daysUntilExpiry < 0
                              ? 'bg-red-100 text-red-700'
                              : b.daysUntilExpiry <= 7
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {b.daysUntilExpiry < 0 ? 'EXPIRED' : b.daysUntilExpiry <= 7 ? 'CRITICAL (FEFO 1st)' : 'EXPIRING SOON'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Stock Movement Audit Log */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-xs uppercase tracking-wider">
            Detailed Stock Movements & Audit Trails
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Medicine</th>
                  <th className="p-3">Batch #</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Reference / Reason</th>
                  <th className="p-3">Staff User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{m.medicineName}</td>
                    <td className="p-3 font-mono text-slate-600">{m.batchNumber || 'N/A'}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.type === 'SALE'
                            ? 'bg-blue-100 text-blue-700'
                            : m.type === 'STOCK_IN'
                            ? 'bg-emerald-100 text-emerald-700'
                            : m.type === 'DAMAGE' || m.type === 'EXPIRED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{m.quantity}</td>
                    <td className="p-3 text-slate-600">{m.reason || m.reference || 'Manual Entry'}</td>
                    <td className="p-3 text-slate-500">{m.userName || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Adjust Inventory Stock</h2>
              <button onClick={() => setAdjustModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="my-3 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Batch *</label>
                <select
                  required
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.medicineName} &bull; Batch {b.batchNumber} (Avail: {b.availableQuantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Movement Type *</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-semibold"
                >
                  <option value="DAMAGE">DAMAGE (Write-off broken or spoiled stock)</option>
                  <option value="EXPIRED">EXPIRED (De-list expired batch)</option>
                  <option value="RETURN">RETURN (Customer or supplier return)</option>
                  <option value="STOCK_IN">STOCK_IN (Manual stock addition)</option>
                  <option value="STOCK_OUT">STOCK_OUT (Manual stock deduction)</option>
                  <option value="ADJUSTMENT">ADJUSTMENT (Cycle audit discrepancy)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Clinical Audit Justification *</label>
                <textarea
                  required
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Broken packaging during transport / Audit variance"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {adjusting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
