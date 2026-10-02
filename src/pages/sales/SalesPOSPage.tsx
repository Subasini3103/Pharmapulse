import React, { useState, useEffect } from 'react';
import { salesService } from '../../services/salesService.ts';
import { medicineService } from '../../services/medicineService.ts';
import { customerService } from '../../services/customerService.ts';
import { prescriptionService } from '../../services/prescriptionService.ts';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Printer,
  FileText,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';

export const SalesPOSPage: React.FC = () => {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // POS State
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'OTHER'>('CASH');
  const [discount, setDiscount] = useState<string>('0');
  const [cart, setCart] = useState<Array<{ medicine: any; quantity: number }>>([]);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInvoice, setSuccessInvoice] = useState<any | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [medRes, custRes, rxRes, salesRes] = await Promise.all([
        medicineService.getMedicines(),
        customerService.getCustomers(),
        prescriptionService.getPrescriptions({ status: 'APPROVED' }),
        salesService.getSales(),
      ]);

      if (medRes?.success) setMedicines(medRes.data || []);
      if (custRes?.success) setCustomers(custRes.data || []);
      if (rxRes?.success) setPrescriptions(rxRes.data || []);
      if (salesRes?.success) setSalesHistory(salesRes.data || []);
    } catch (err) {
      console.error('Failed to load POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter medicines by search
  const filteredMedicines = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.genericName && m.genericName.toLowerCase().includes(search.toLowerCase())) ||
      (m.brandName && m.brandName.toLowerCase().includes(search.toLowerCase()))
  );

  // Add to cart
  const addToCart = (med: any) => {
    if (med.totalStock <= 0) {
      setErrorMsg(`'${med.name}' is currently out of stock.`);
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.medicine.id === med.id);
      if (existing) {
        if (existing.quantity >= med.totalStock) {
          setErrorMsg(`Cannot add more than available stock (${med.totalStock} units).`);
          setTimeout(() => setErrorMsg(null), 3000);
          return prev;
        }
        return prev.map((item) =>
          item.medicine.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { medicine: med, quantity: 1 }];
    });
  };

  // Modify quantity
  const updateQuantity = (medId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.medicine.id === medId) {
            const newQty = item.quantity + delta;
            if (newQty > item.medicine.totalStock) {
              setErrorMsg(`Requested quantity exceeds available stock (${item.medicine.totalStock}).`);
              setTimeout(() => setErrorMsg(null), 3000);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (medId: number) => {
    setCart((prev) => prev.filter((item) => item.medicine.id !== medId));
  };

  // Check if any cart item requires prescription
  const hasRxItem = cart.some((item) => item.medicine.prescriptionRequired);

  // Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * parseFloat(item.medicine.unitPrice),
    0
  );
  const tax = subtotal * 0.05; // 5% Healthcare Tax
  const parsedDiscount = Math.max(0, parseFloat(discount) || 0);
  const grandTotal = Math.max(0, subtotal + tax - parsedDiscount);

  // Handle Checkout with FEFO
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMsg('Your cart is empty. Add at least one medicine.');
      return;
    }

    if (hasRxItem && !selectedPrescriptionId) {
      setErrorMsg(
        'One or more medicines in the cart require a doctor prescription. Please select an approved prescription.'
      );
      return;
    }

    setErrorMsg(null);
    setProcessing(true);

    try {
      const payload = {
        customerId: selectedCustomerId ? parseInt(selectedCustomerId, 10) : undefined,
        items: cart.map((item) => ({
          medicineId: item.medicine.id,
          quantity: item.quantity,
        })),
        paymentMethod,
        prescriptionId: selectedPrescriptionId ? parseInt(selectedPrescriptionId, 10) : undefined,
        discount: parsedDiscount,
        notes: `POS Dispensed Order (${paymentMethod})`,
      };

      const res = await salesService.createSale(payload);
      if (res?.success) {
        // Fetch complete invoice data for printable receipt
        const fullInvoiceRes = await salesService.getSale(res.data.sale.id);
        setSuccessInvoice(fullInvoiceRes.data);
        setInvoiceModalOpen(true);

        // Reset cart and reload medicines
        setCart([]);
        setSelectedCustomerId('');
        setSelectedPrescriptionId('');
        setDiscount('0');
        loadInitialData();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Sale checkout failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Point of Sale (POS) & Dispensing</h1>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" /> FEFO AUTOMATION ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated First-Expire First-Out batch allocation, prescription checking & instant billing.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* POS Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Medicine Catalog Browser (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicine catalog to add to cart..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                Loading inventory catalog...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredMedicines.map((med) => {
                  const inCartItem = cart.find((c) => c.medicine.id === med.id);
                  const inCartQty = inCartItem?.quantity || 0;
                  const availableForAdd = med.totalStock - inCartQty;

                  return (
                    <div
                      key={med.id}
                      onClick={() => addToCart(med)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                        med.totalStock === 0
                          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-slate-900 leading-tight">{med.name}</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                            ${parseFloat(med.unitPrice).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {med.genericName || med.brandName || med.form}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px]">
                        <span
                          className={`font-semibold ${
                            med.totalStock === 0 ? 'text-red-500' : 'text-slate-600'
                          }`}
                        >
                          Stock: {med.totalStock} units
                        </span>

                        {med.prescriptionRequired ? (
                          <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                            Rx Req.
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            OTC
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Cart & Checkout (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-900">Dispensing Cart ({cart.length})</span>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[11px] text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {/* Customer Selector */}
              <div className="space-y-2 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Customer (Optional for OTC, Mandatory for Rx)
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="">Walk-in Customer / OTC</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prescription Selector (If Rx required) */}
                {hasRxItem && (
                  <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 mb-1">
                      <FileText className="w-3.5 h-3.5" /> Doctor's Prescription Required
                    </div>
                    <select
                      value={selectedPrescriptionId}
                      onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-red-200 rounded-lg focus:outline-none"
                    >
                      <option value="">Select Approved Prescription</option>
                      {prescriptions.map((rx) => (
                        <option key={rx.id} value={rx.id}>
                          {rx.prescriptionNumber} - Dr. {rx.doctorName} ({rx.customerName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Cart Items List */}
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    Cart is empty. Click any medicine on the left to add.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.medicine.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-semibold text-slate-900 truncate">{item.medicine.name}</div>
                        <div className="text-[11px] text-slate-500">
                          ${parseFloat(item.medicine.unitPrice).toFixed(2)} &times; {item.quantity} ={' '}
                          <span className="font-bold text-slate-900">
                            ${(item.quantity * parseFloat(item.medicine.unitPrice)).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.medicine.id, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-slate-900 text-xs">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.medicine.id, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.medicine.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Billing Summary & Payment */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { id: 'CASH', label: 'Cash', icon: Banknote },
                    { id: 'CARD', label: 'Card', icon: CreditCard },
                    { id: 'UPI', label: 'UPI', icon: Smartphone },
                    { id: 'OTHER', label: 'Other', icon: Receipt },
                  ].map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentMethod(p.id as any)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 transition ${
                          paymentMethod === p.id
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calculations */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (5% Healthcare)</span>
                  <span className="font-semibold text-slate-900">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Discount ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-16 px-1.5 py-0.5 text-right font-mono text-xs border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-base text-emerald-700">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Complete Sale Button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={processing || cart.length === 0}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Complete Sale & Apply FEFO
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Invoice Modal (Section 17: BILLING / INVOICE) */}
      {invoiceModalOpen && successInvoice && (
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
                <button onClick={() => setInvoiceModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="py-4 print:p-0">
              {/* Pharmacy Header */}
              <div className="text-center border-b border-slate-200 pb-4 mb-4">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">PharmaPulse Central Healthcare Pharmacy</h1>
                <p className="text-xs text-slate-600">100 Medical Center Blvd, Health City, HC 54001</p>
                <p className="text-[11px] text-slate-500">Phone: +1-800-555-PHARMA &bull; GST/Tax: MED-PHARM-994821</p>
              </div>

              {/* Invoice Meta */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                <div>
                  <span className="text-slate-400 block text-[10px]">Invoice Number</span>
                  <span className="font-mono font-bold text-slate-900">{successInvoice.invoiceNumber}</span>
                  <span className="text-slate-400 block text-[10px] mt-1">Date & Time</span>
                  <span className="text-slate-700 font-medium">
                    {new Date(successInvoice.saleDate).toLocaleDateString()} {new Date(successInvoice.saleDate).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Customer Details</span>
                  <span className="font-bold text-slate-900">
                    {successInvoice.customerName || 'Walk-in Customer'}
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    {successInvoice.customerPhone || 'N/A'}
                  </span>
                  {successInvoice.prescriptionNumber && (
                    <span className="text-emerald-700 font-semibold block text-[11px]">
                      Rx: {successInvoice.prescriptionNumber} (Dr. {successInvoice.doctorName})
                    </span>
                  )}
                </div>
              </div>

              {/* Items Table */}
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
                    {successInvoice.items?.map((item: any) => (
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

              {/* Totals */}
              <div className="flex justify-end mb-6">
                <div className="w-48 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900">${parseFloat(successInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (5%):</span>
                    <span className="font-semibold text-slate-900">${parseFloat(successInvoice.tax).toFixed(2)}</span>
                  </div>
                  {parseFloat(successInvoice.discount) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-semibold">-${parseFloat(successInvoice.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-emerald-700">${parseFloat(successInvoice.grandTotal).toFixed(2)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 text-right pt-1">
                    Paid via: <span className="font-bold uppercase text-slate-700">{successInvoice.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                Thank you for choosing PharmaPulse Central. Please retain this invoice for your health records and insurance reimbursement.
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end print:hidden">
              <button
                onClick={() => setInvoiceModalOpen(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
