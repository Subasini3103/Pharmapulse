import React, { useState, useEffect } from 'react';
import { salesService } from '../../services/salesService.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Receipt,
  Search,
  Calendar,
  Printer,
  Eye,
  Loader2,
  X,
  FileText,
  DollarSign,
} from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await salesService.getSales({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res?.success) {
        setInvoices(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [startDate, endDate]);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(search.toLowerCase()))
  );

  const viewInvoice = async (id: number) => {
    try {
      const res = await salesService.getSale(id);
      if (res?.success) {
        setSelectedInvoice(res.data);
        setModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Billing & Invoices</h1>
          <p className="text-xs text-slate-500 mt-1">Official healthcare receipts, invoice history & audit trails.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number or customer name..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="w-4 h-4" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
            Loading invoices from PostgreSQL database...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">No invoices found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="p-3.5 text-slate-600">
                      {new Date(inv.saleDate).toLocaleDateString()}{' '}
                      <span className="text-[11px] text-slate-400">
                        {new Date(inv.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">
                      {inv.customerName || 'Walk-in OTC Customer'}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">{inv.paymentMethod}</td>
                    <td className="p-3.5 font-bold text-slate-900">${parseFloat(inv.grandTotal).toFixed(2)}</td>
                    <td className="p-3.5">
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => viewInvoice(inv.id)}
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {modalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Official Bill of Supply
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Invoice
                </button>
                <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="py-4 print:p-0">
              <div className="text-center border-b border-slate-200 pb-4 mb-4">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">PharmaPulse Central Healthcare Pharmacy</h1>
                <p className="text-xs text-slate-600">100 Medical Center Blvd, Health City, HC 54001</p>
                <p className="text-[11px] text-slate-500">Phone: +1-800-555-PHARMA &bull; GST/Tax: MED-PHARM-994821</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                <div>
                  <span className="text-slate-400 block text-[10px]">Invoice Number</span>
                  <span className="font-mono font-bold text-slate-900">{selectedInvoice.invoiceNumber}</span>
                  <span className="text-slate-400 block text-[10px] mt-1">Date & Time</span>
                  <span className="text-slate-700 font-medium">
                    {new Date(selectedInvoice.saleDate).toLocaleDateString()} {new Date(selectedInvoice.saleDate).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Customer Details</span>
                  <span className="font-bold text-slate-900">
                    {selectedInvoice.customerName || 'Walk-in Customer'}
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    {selectedInvoice.customerPhone || 'N/A'}
                  </span>
                  {selectedInvoice.prescriptionNumber && (
                    <span className="text-emerald-700 font-semibold block text-[11px]">
                      Rx: {selectedInvoice.prescriptionNumber} (Dr. {selectedInvoice.doctorName})
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Medicine Name</th>
                      <th className="p-2.5">Batch # (FEFO)</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5">Unit Price</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="p-2.5 font-medium text-slate-900">{item.medicineName}</td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-600">
                          {item.batchNumber} (Exp: {item.expiryDate})
                        </td>
                        <td className="p-2.5 font-bold text-slate-800">{item.quantity}</td>
                        <td className="p-2.5 text-slate-700">${parseFloat(item.unitPrice).toFixed(2)}</td>
                        <td className="p-2.5 font-bold text-slate-900 text-right">
                          ${parseFloat(item.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mb-6">
                <div className="w-48 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900">${parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (5%):</span>
                    <span className="font-semibold text-slate-900">${parseFloat(selectedInvoice.tax).toFixed(2)}</span>
                  </div>
                  {parseFloat(selectedInvoice.discount) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-semibold">-${parseFloat(selectedInvoice.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-emerald-700">${parseFloat(selectedInvoice.grandTotal).toFixed(2)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 text-right pt-1">
                    Paid via: <span className="font-bold uppercase text-slate-700">{selectedInvoice.paymentMethod}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end print:hidden">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
