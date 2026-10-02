import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService.ts';
import {
  Pill,
  Tags,
  Truck,
  Users,
  Package,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  FileText,
  PlusCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getAdminDashboard();
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
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
        <p className="text-xs text-slate-500 font-medium">Loading real-time pharmacy analytics...</p>
      </div>
    );
  }

  const cards = data?.cards || {};
  const charts = data?.charts || {};

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Admin Central Dashboard</h1>
            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
              FULL RBAC
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Real-time PostgreSQL telemetry, inventory FEFO status, and POS sales.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/sales"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Point of Sale (POS)
          </Link>
          <Link
            to="/admin/medicines"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Medicine
          </Link>
          <button
            onClick={fetchDashboard}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Section 19: ADMIN DASHBOARD Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Total Medicines */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Medicines</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{cards.totalMedicines || 0}</div>
          <p className="text-[11px] text-slate-400 mt-1">{cards.totalCategories || 0} categories active</p>
        </div>

        {/* Total Stock */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total In-Stock Units</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{cards.totalStock || 0}</div>
          <p className="text-[11px] text-teal-600 font-medium mt-1">Across all unexpired batches</p>
        </div>

        {/* Today's Sales */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">${cards.todaySales?.toFixed(2) || '0.00'}</div>
          <p className="text-[11px] text-slate-400 mt-1">Month: ${cards.monthlySales?.toFixed(2) || '0.00'}</p>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">${cards.totalRevenue?.toFixed(2) || '0.00'}</div>
          <p className="text-[11px] text-indigo-600 font-medium mt-1">All-time billed revenue</p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-medium">Low Stock Alert</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-800">{cards.lowStockMedicines || 0}</div>
          <Link to="/admin/inventory" className="text-[11px] text-amber-700 font-medium hover:underline mt-1 block">
            Inspect inventory &rarr;
          </Link>
        </div>

        {/* Expiring Medicines (<=30 days) */}
        <div className="bg-white rounded-2xl border border-orange-200 p-4 shadow-xs bg-orange-50/20">
          <div className="flex items-center justify-between text-orange-700 mb-2">
            <span className="text-xs font-medium">Expiring Soon (30d)</span>
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-800">{cards.expiringMedicines || 0}</div>
          <p className="text-[11px] text-orange-700 font-medium mt-1">Prioritized by FEFO</p>
        </div>

        {/* Expired Batches */}
        <div className="bg-white rounded-2xl border border-red-200 p-4 shadow-xs bg-red-50/20">
          <div className="flex items-center justify-between text-red-700 mb-2">
            <span className="text-xs font-medium">Expired Batches</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-800">{cards.expiredMedicines || 0}</div>
          <p className="text-[11px] text-red-700 font-medium mt-1">Locked from POS sales</p>
        </div>

        {/* Suppliers & Customers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Suppliers & Customers</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900">
            {cards.totalSuppliers || 0} <span className="text-xs font-normal text-slate-400">suppliers</span> /{' '}
            {cards.totalCustomers || 0} <span className="text-xs font-normal text-slate-400">cust.</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Verified partner network</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sales Trend (Last 7 Days)</h2>
              <p className="text-xs text-slate-400">Daily transaction volume from PostgreSQL</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.salesByDay || []}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value: any) => [`$${value}`, 'Revenue']} />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Medicines */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Top Dispensed Medicines</h2>
              <p className="text-xs text-slate-400">Highest volume items dispensed across all orders</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topSelling || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} stroke="#64748b" />
                <Tooltip formatter={(v: any) => [`${v} units`, 'Quantity Dispensed']} />
                <Bar dataKey="unitsSold" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Charts: Category Breakdown & Stock Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Category Catalog Distribution</h2>
              <p className="text-xs text-slate-400">Medicines mapped per therapeutic category</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {charts.categoryDistribution?.map((cat: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 truncate pr-2">{cat.name}</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {cat.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Status Pie */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Inventory Health</h2>
          <p className="text-xs text-slate-400 mb-4">Stock adequacy evaluation</p>

          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.stockStatus || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs font-medium mt-2">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Adequate
            </div>
            <div className="flex items-center gap-1.5 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Low Stock
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
