import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService.ts';
import {
  Pill,
  ShoppingCart,
  FileText,
  AlertTriangle,
  Clock,
  TrendingUp,
  Receipt,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const PharmacistDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getPharmacistDashboard();
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load pharmacist dashboard:', err);
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
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading clinical pharmacy workstation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Clinical Dispensing Workstation</h1>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              PHARMACIST
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Prescription validation, automated FEFO dispensing & billing.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/pharmacist/sales"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <ShoppingCart className="w-4 h-4" /> Open POS Dispenser
          </Link>
          <button
            onClick={fetchDashboard}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            title="Refresh workstation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Today's Dispensed Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${data?.todaySales?.toFixed(2) || '0.00'}</div>
          <p className="text-[11px] text-slate-400 mt-1">Real-time daily POS total</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-medium">Pending Prescriptions</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900">{data?.pendingPrescriptions || 0}</div>
          <Link to="/pharmacist/prescriptions" className="text-[11px] text-amber-700 font-medium hover:underline mt-1 block">
            Review & approve &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-orange-200 p-4 shadow-xs bg-orange-50/20">
          <div className="flex items-center justify-between text-orange-700 mb-1">
            <span className="text-xs font-medium">Expiring Batches (30d)</span>
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-900">{data?.expiringMedicines || 0}</div>
          <Link to="/pharmacist/inventory" className="text-[11px] text-orange-700 font-medium hover:underline mt-1 block">
            FEFO dispatch priorities &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Active Medicines</span>
            <Pill className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data?.totalMedicines || 0}</div>
          <p className="text-[11px] text-slate-400 mt-1">{data?.lowStockMedicines || 0} below safety threshold</p>
        </div>
      </div>

      {/* Recent Dispensed Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Dispensing Invoices</h2>
            <p className="text-xs text-slate-400">Latest completed point-of-sale transactions</p>
          </div>
          <Link to="/pharmacist/invoices" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
            View All Invoices &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Grand Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentSales?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">No sales recorded yet today.</td>
                </tr>
              ) : (
                data?.recentSales?.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 font-mono font-medium text-slate-900">{sale.invoiceNumber}</td>
                    <td className="p-3 text-slate-500">
                      {new Date(sale.saleDate).toLocaleDateString()} {new Date(sale.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 font-medium text-slate-700">{sale.paymentMethod}</td>
                    <td className="p-3 font-bold text-slate-900">${parseFloat(sale.grandTotal).toFixed(2)}</td>
                    <td className="p-3">
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {sale.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        to={`/pharmacist/invoices`}
                        className="text-emerald-600 hover:text-emerald-700 font-semibold"
                      >
                        Print Receipt
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
