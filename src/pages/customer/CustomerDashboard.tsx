import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService.ts';
import { Pill, FileText, ShoppingCart, Receipt, Loader2, Plus, ArrowRight } from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getCustomerDashboard();
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load customer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading patient care portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Patient Pharmacy Portal</h1>
            <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-200">
              CUSTOMER
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Manage doctor prescriptions, refill medications & view purchase invoices.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/customer/prescriptions"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Submit Prescription
          </Link>
          <Link
            to="/customer/medicines"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            <Pill className="w-3.5 h-3.5" /> Browse Medicines
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Medication Spend</span>
            <Receipt className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${data?.totalSpent?.toFixed(2) || '0.00'}</div>
          <p className="text-[11px] text-slate-400 mt-1">{data?.totalInvoices || 0} completed invoices</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Active Prescriptions</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data?.activePrescriptions || 0}</div>
          <Link to="/customer/prescriptions" className="text-[11px] text-emerald-600 font-medium hover:underline mt-1 block">
            View active scripts &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Verified Account</span>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>
          </div>
          <div className="text-sm font-semibold text-slate-800 mt-2">Personal Health Records Protected</div>
          <p className="text-[11px] text-slate-400 mt-1">Strict object-level privacy enforced</p>
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">My Recent Purchases & Invoices</h2>
          <Link to="/customer/invoices" className="text-xs text-sky-600 hover:text-sky-700 font-semibold">
            All Invoices &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="p-3">Invoice Number</th>
                <th className="p-3">Purchase Date</th>
                <th className="p-3">Method</th>
                <th className="p-3">Amount</th>
                <th className="p-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentPurchases?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">You haven't made any purchases yet.</td>
                </tr>
              ) : (
                data?.recentPurchases?.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 font-mono font-medium text-slate-900">{p.invoiceNumber}</td>
                    <td className="p-3 text-slate-500">{new Date(p.saleDate).toLocaleDateString()}</td>
                    <td className="p-3 text-slate-700 font-medium">{p.paymentMethod}</td>
                    <td className="p-3 font-bold text-slate-900">${parseFloat(p.grandTotal).toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <Link to={`/customer/invoices`} className="text-sky-600 hover:text-sky-700 font-semibold">
                        View Bill
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
