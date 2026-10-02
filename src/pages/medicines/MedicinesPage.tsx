import React, { useState, useEffect } from 'react';
import { medicineService } from '../../services/medicineService.ts';
import { supplierService } from '../../services/supplierService.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Pill,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  FileText,
  Layers,
  CheckCircle2,
  X,
  Loader2,
  Eye,
} from 'lucide-react';

export const MedicinesPage: React.FC = () => {
  const { role } = useAuth();
  const isStaff = role === 'ADMIN' || role === 'PHARMACIST';
  const isAdmin = role === 'ADMIN';

  const [medicines, setMedicines] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [rxFilter, setRxFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<any | null>(null);
  const [viewMed, setViewMed] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    brandName: '',
    categoryId: '',
    manufacturer: '',
    supplierId: '',
    dosage: '',
    form: 'Tablets',
    unitPrice: '',
    prescriptionRequired: false,
    minimumStockLevel: '10',
    maximumStockLevel: '500',
    description: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [medRes, catRes] = await Promise.all([
        medicineService.getMedicines({
          search,
          categoryId: categoryFilter,
          prescriptionRequired: rxFilter,
          lowStockOnly: lowStockFilter ? 'true' : '',
        }),
        medicineService.getCategories(),
      ]);

      if (medRes?.success) setMedicines(medRes.data || []);
      if (catRes?.success) setCategories(catRes.data || []);

      if (isStaff) {
        const supRes = await supplierService.getSuppliers();
        if (supRes?.success) setSuppliers(supRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, categoryFilter, rxFilter, lowStockFilter]);

  const openCreateModal = () => {
    setEditingMed(null);
    setFormData({
      name: '',
      genericName: '',
      brandName: '',
      categoryId: categories[0]?.id || '',
      manufacturer: '',
      supplierId: suppliers[0]?.id || '',
      dosage: '',
      form: 'Tablets',
      unitPrice: '',
      prescriptionRequired: false,
      minimumStockLevel: '10',
      maximumStockLevel: '500',
      description: '',
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (med: any) => {
    setEditingMed(med);
    setFormData({
      name: med.name,
      genericName: med.genericName || '',
      brandName: med.brandName || '',
      categoryId: med.categoryId || '',
      manufacturer: med.manufacturer || '',
      supplierId: med.supplierId || '',
      dosage: med.dosage || '',
      form: med.form || 'Tablets',
      unitPrice: med.unitPrice,
      prescriptionRequired: med.prescriptionRequired,
      minimumStockLevel: med.minimumStockLevel.toString(),
      maximumStockLevel: med.maximumStockLevel.toString(),
      description: med.description || '',
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);

    try {
      if (editingMed) {
        await medicineService.updateMedicine(editingMed.id, formData);
        setSuccessMsg(`Medicine '${formData.name}' updated successfully.`);
      } else {
        await medicineService.createMedicine(formData);
        setSuccessMsg(`Medicine '${formData.name}' created successfully.`);
      }
      setModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save medicine.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete or discontinue medicine '${name}'?`)) return;

    try {
      const res = await medicineService.deleteMedicine(id);
      setSuccessMsg(res.message || 'Medicine removed.');
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete medicine.');
    }
  };

  const handleViewDetails = async (id: number) => {
    try {
      const res = await medicineService.getMedicine(id);
      if (res?.success) {
        setViewMed(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Medicine Master Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse formulations, monitor real-time stock levels, and review batch availability.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add New Medicine
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, generic, brand, manufacturer..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Prescription Required Filter */}
        <select
          value={rxFilter}
          onChange={(e) => setRxFilter(e.target.value)}
          className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
        >
          <option value="">All Rx Types</option>
          <option value="true">Prescription Required (Rx)</option>
          <option value="false">Over the Counter (OTC)</option>
        </select>

        {/* Low Stock Toggle */}
        <button
          onClick={() => setLowStockFilter(!lowStockFilter)}
          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 ${
            lowStockFilter
              ? 'bg-amber-100 border-amber-300 text-amber-800'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Low Stock Only</span>
        </button>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-7 h-7 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Querying medicine inventory...</p>
          </div>
        ) : medicines.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No medicines match the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Medicine Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Dosage / Form</th>
                  <th className="p-3.5">Unit Price</th>
                  <th className="p-3.5">Total Stock</th>
                  <th className="p-3.5">Rx Required</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{med.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {med.genericName || med.brandName || 'Standard formulation'}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">
                      {med.categoryName || 'Unassigned'}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <span className="font-medium">{med.dosage || 'N/A'}</span> &bull; {med.form}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">${parseFloat(med.unitPrice).toFixed(2)}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold ${
                            med.totalStock === 0
                              ? 'text-red-600'
                              : med.isLowStock
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {med.totalStock} units
                        </span>
                        {med.isLowStock && (
                          <span
                            className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded"
                            title={`Min threshold: ${med.minimumStockLevel}`}
                          >
                            LOW
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {med.batchCount} batch(es) active
                      </span>
                    </td>
                    <td className="p-3.5">
                      {med.prescriptionRequired ? (
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Rx Required
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                          OTC
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          med.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {med.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetails(med.id)}
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                          title="View batches & details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isStaff && (
                          <button
                            onClick={() => openEditModal(med)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                            title="Edit medicine"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(med.id, med.name)}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
                            title="Delete or discontinue"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Medicine Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {editingMed ? `Edit Medicine: ${editingMed.name}` : 'Add New Medicine'}
              </h2>
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

            <form onSubmit={handleSubmit} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medicine Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Amoxicillin 500mg"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    placeholder="e.g. Amoxicillin Trihydrate"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    placeholder="e.g. Amoxil"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage Form</label>
                  <select
                    value={formData.form}
                    onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    {['Tablets', 'Capsules', 'Syrups', 'Injections', 'Creams', 'Ointments', 'Drops', 'Other'].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage Spec</label>
                  <input
                    type="text"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="e.g. 500mg or 10ml"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Selling Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="14.50"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g. Pfizer / GSK"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Stock Threshold</label>
                  <input
                    type="number"
                    value={formData.minimumStockLevel}
                    onChange={(e) => setFormData({ ...formData, minimumStockLevel: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Stock Capacity</label>
                  <input
                    type="number"
                    value={formData.maximumStockLevel}
                    onChange={(e) => setFormData({ ...formData, maximumStockLevel: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prescriptionRequired"
                  checked={formData.prescriptionRequired}
                  onChange={(e) => setFormData({ ...formData, prescriptionRequired: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="prescriptionRequired" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Prescription Required (Doctor approval needed for POS sales)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Description / Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Usage instructions, therapeutic guidelines..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Batches & Details Modal */}
      {viewMed && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">{viewMed.name}</h2>
                <p className="text-xs text-slate-500 font-mono">{viewMed.genericName}</p>
              </div>
              <button onClick={() => setViewMed(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Category</span>
                <span className="font-semibold text-slate-800">{viewMed.categoryName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Dosage Form</span>
                <span className="font-semibold text-slate-800">{viewMed.form}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Unit Price</span>
                <span className="font-bold text-emerald-700">${parseFloat(viewMed.unitPrice).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Available Stock</span>
                <span className="font-bold text-slate-900">{viewMed.totalStock} units</span>
              </div>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" /> Active Batches (FEFO Dispensing Order)
            </h3>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {viewMed.batches?.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No batch records found.</div>
              ) : (
                viewMed.batches?.map((b: any) => (
                  <div key={b.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="font-mono font-bold text-slate-900">{b.batchNumber}</div>
                      <div className="text-[11px] text-slate-500">
                        Mfg: {b.manufacturingDate} &bull; <span className="font-semibold text-slate-700">Exp: {b.expiryDate}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{b.availableQuantity} units</div>
                      <div>
                        {b.isExpired ? (
                          <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                            EXPIRED (Excluded from POS)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            VALID FEFO STOCK
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setViewMed(null)}
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
