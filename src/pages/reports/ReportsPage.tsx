import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService.ts';
import {
  FileBarChart,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Clock,
  Printer,
  Loader2,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'sales' | 'purchases' | 'inventory' | 'expiry'>('sales');
  const [timeRange, setTimeRange] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {
        range: timeRange,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      let res;
      if (reportType === 'sales') res = await reportService.getSalesReport(params);
      else if (reportType === 'purchases') res = await reportService.getPurchaseReport(params);
      else if (reportType === 'inventory') res = await reportService.getInventoryReport();
      else res = await reportService.getExpiryReport();

      if (res?.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, timeRange, startDate, endDate]);

  const summary = reportData?.summary || {};
  const records = reportData?.records || [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pharmacy Reports & Financial Audits</h1>
          <p className="text-xs text-slate-500 mt-1">Aggregated ledger records, inventory valuations & expiry liabilities.</p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" /> Print / Export PDF
        </button>
      </div>

      {/* Report Type Selector & Time Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'sales', label: 'Sales Report', icon: TrendingUp },
              { id: 'purchases', label: 'Purchase Report', icon: DollarSign },
              { id: 'inventory', label: 'Stock Valuation', icon: Package },
              { id: 'expiry', label: 'Expiry Liability', icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setReportType(tab.id as any)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition cursor-pointer ${
                    reportType === tab.id
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {(reportType === 'sales' || reportType === 'purchases') && (
            <div className="flex items-center gap-2 text-xs">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Date Range</option>
              </select>

              {timeRange === 'custom' && (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="py-1 px-2 border rounded-lg text-xs"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="py-1 px-2 border rounded-lg text-xs"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {reportType === 'sales' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Transactions</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{summary.totalTransactions || 0}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Billed Revenue</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">${summary.totalRevenue?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Tax Collected</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">${summary.totalTax?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Discounts Allowed</span>
              <div className="text-2xl font-bold text-amber-700 mt-1">${summary.totalDiscount?.toFixed(2) || '0.00'}</div>
            </div>
          </>
        )}

        {reportType === 'purchases' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Orders Placed</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{summary.totalOrders || 0}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Procurement Spend</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">${summary.totalSpend?.toFixed(2) || '0.00'}</div>
            </div>
          </>
        )}

        {reportType === 'inventory' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Medicine SKUs</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{summary.totalMedicines || 0}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Valuation</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">${summary.totalInventoryValuation?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-amber-700 font-medium">Low Stock Count</span>
              <div className="text-2xl font-bold text-amber-800 mt-1">{summary.lowStockCount || 0}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-red-700 font-medium">Out of Stock Count</span>
              <div className="text-2xl font-bold text-red-800 mt-1">{summary.outOfStockCount || 0}</div>
            </div>
          </>
        )}

        {reportType === 'expiry' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Batches Tracked</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{summary.totalBatches || 0}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-orange-700 font-medium">At-Risk Batches (&le;90d)</span>
              <div className="text-2xl font-bold text-orange-800 mt-1">{summary.atRiskCount || 0}</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-red-700 font-medium">Expired Inventory Loss</span>
              <div className="text-2xl font-bold text-red-800 mt-1">${summary.totalExpiredLoss?.toFixed(2) || '0.00'}</div>
            </div>
          </>
        )}
      </div>

      {/* Report Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
            Generating dynamic report from PostgreSQL...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No records available for the selected timeframe.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                {reportType === 'sales' && (
                  <tr>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Subtotal</th>
                    <th className="p-3.5">Tax</th>
                    <th className="p-3.5">Discount</th>
                    <th className="p-3.5">Grand Total</th>
                  </tr>
                )}
                {reportType === 'purchases' && (
                  <tr>
                    <th className="p-3.5">PO Number</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Supplier</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                )}
                {reportType === 'inventory' && (
                  <tr>
                    <th className="p-3.5">Medicine</th>
                    <th className="p-3.5">Form</th>
                    <th className="p-3.5">Available Stock</th>
                    <th className="p-3.5">Expired Units</th>
                    <th className="p-3.5">Estimated Valuation</th>
                    <th className="p-3.5">Stock Status</th>
                  </tr>
                )}
                {reportType === 'expiry' && (
                  <tr>
                    <th className="p-3.5">Medicine</th>
                    <th className="p-3.5">Batch #</th>
                    <th className="p-3.5">Expiry Date</th>
                    <th className="p-3.5">Available Qty</th>
                    <th className="p-3.5">At-Risk Value</th>
                    <th className="p-3.5">Risk Level</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    {reportType === 'sales' && (
                      <>
                        <td className="p-3.5 font-mono font-bold text-slate-900">{r.invoiceNumber}</td>
                        <td className="p-3.5 text-slate-500">{new Date(r.saleDate).toLocaleDateString()}</td>
                        <td className="p-3.5 text-slate-800 font-medium">{r.customerName || 'OTC Walk-in'}</td>
                        <td className="p-3.5 text-slate-700">${parseFloat(r.subtotal).toFixed(2)}</td>
                        <td className="p-3.5 text-slate-500">${parseFloat(r.tax).toFixed(2)}</td>
                        <td className="p-3.5 text-amber-700">${parseFloat(r.discount).toFixed(2)}</td>
                        <td className="p-3.5 font-bold text-emerald-700">${parseFloat(r.grandTotal).toFixed(2)}</td>
                      </>
                    )}
                    {reportType === 'purchases' && (
                      <>
                        <td className="p-3.5 font-mono font-bold text-slate-900">{r.purchaseOrderNumber}</td>
                        <td className="p-3.5 text-slate-500">{new Date(r.purchaseDate).toLocaleDateString()}</td>
                        <td className="p-3.5 text-slate-800 font-medium">{r.supplierName}</td>
                        <td className="p-3.5 font-bold text-slate-900">${parseFloat(r.totalAmount).toFixed(2)}</td>
                        <td className="p-3.5">
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {r.status}
                          </span>
                        </td>
                      </>
                    )}
                    {reportType === 'inventory' && (
                      <>
                        <td className="p-3.5 font-bold text-slate-900">{r.name}</td>
                        <td className="p-3.5 text-slate-500">{r.form}</td>
                        <td className="p-3.5 font-bold text-slate-800">{r.currentStock} units</td>
                        <td className="p-3.5 text-red-600 font-medium">{r.expiredStock} units</td>
                        <td className="p-3.5 font-bold text-emerald-700">${parseFloat(r.valuation).toFixed(2)}</td>
                        <td className="p-3.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              r.status === 'GOOD'
                                ? 'bg-emerald-100 text-emerald-700'
                                : r.status === 'LOW_STOCK'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </>
                    )}
                    {reportType === 'expiry' && (
                      <>
                        <td className="p-3.5 font-bold text-slate-900">{r.medicineName}</td>
                        <td className="p-3.5 font-mono text-slate-600">{r.batchNumber}</td>
                        <td className="p-3.5 font-semibold text-slate-900">{r.expiryDate}</td>
                        <td className="p-3.5 font-bold text-slate-800">{r.availableQuantity} units</td>
                        <td className="p-3.5 font-bold text-slate-900">${parseFloat(r.estimatedValue).toFixed(2)}</td>
                        <td className="p-3.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              r.riskLevel.includes('EXPIRED')
                                ? 'bg-red-100 text-red-700'
                                : r.riskLevel.includes('CRITICAL')
                                ? 'bg-orange-100 text-orange-700'
                                : r.riskLevel.includes('WARNING')
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {r.riskLevel}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
