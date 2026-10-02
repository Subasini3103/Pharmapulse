import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService.ts';
import { Pill, Truck, DollarSign, Layers, Loader2, RefreshCw } from 'lucide-react';

export const SupplierDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getSupplierDashboard();
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load supplier dashboard:', err);
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
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading supplier logistics portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Supplier Logistics Portal</h1>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
              SUPPLIER
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Manage supplied pharmaceutical products, batch records & purchase orders.</p>
        </div>

        <button
          onClick={fetchDashboard}
          className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Supplied Medicines</span>
            <Pill className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data?.totalSuppliedMedicines || 0}</div>
          <p className="text-[11px] text-slate-400 mt-1">Cataloged in pharmacy inventory</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Purchase Orders</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data?.activeOrders || 0}</div>
          <p className="text-[11px] text-slate-400 mt-1">Orders fulfilled to pharmacy</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Billed Revenue</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${data?.totalRevenue?.toFixed(2) || '0.00'}</div>
          <p className="text-[11px] text-slate-400 mt-1">All verified purchase orders</p>
        </div>
      </div>

      {/* Recent Supply Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recent Purchase Orders</h2>
          <Link to="/supplier/purchases" className="text-xs text-amber-600 hover:text-amber-700 font-semibold">
            View All Orders &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="p-3">PO Number</th>
                <th className="p-3">Order Date</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentOrders?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">No supply orders recorded yet.</td>
                </tr>
              ) : (
                data?.recentOrders?.map((po: any) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 font-mono font-medium text-slate-900">{po.purchaseOrderNumber}</td>
                    <td className="p-3 text-slate-500">{new Date(po.purchaseDate).toLocaleDateString()}</td>
                    <td className="p-3 font-bold text-slate-900">${parseFloat(po.totalAmount).toFixed(2)}</td>
                    <td className="p-3">
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {po.status}
                      </span>
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
