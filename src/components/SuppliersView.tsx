import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Supplier } from '../types/inventory';
import { inventoryApi } from '../services/api';
import { formatCurrency, parseNumber } from '../utils/formatters';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Archive,
  RotateCw,
  X,
} from 'lucide-react';

type SupplierRow = Supplier & Record<string, any>;

const getSupplierData = (supplier: SupplierRow) => ({
  id: String(supplier.SupplierID ?? supplier.supplierId ?? supplier.id ?? ''),
  name: String(supplier.SupplierName ?? supplier.supplierName ?? supplier.name ?? ''),
  contactPerson: String(supplier.ContactPerson ?? supplier.contactPerson ?? ''),
  phone: String(supplier.Phone ?? supplier.phone ?? ''),
  email: String(supplier.Email ?? supplier.email ?? ''),
  city: String(supplier.City ?? supplier.city ?? ''),
  address: String(supplier.Address ?? supplier.address ?? ''),
  accountBalance: parseNumber(
    supplier.AccountBalance ?? supplier.accountBalance ?? 0
  ),
  status: String(supplier.Status ?? supplier.status ?? 'Active'),
  createdAt: supplier.CreatedAt ?? supplier.createdAt ?? null,
});

export const SuppliersView: React.FC = () => {
  const { suppliers, refreshSuppliers, addToast, loading } = useInventory();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(null);
  const [archivingSupplier, setArchivingSupplier] = useState<SupplierRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const openEdit = (supplier: SupplierRow) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Use the actual submitted form values. This avoids controlled-input state
    // issues that can cause the form to reset/crash while typing.
    const form = e.currentTarget;
    const data = new FormData(form);

    const supplierName = String(data.get('SupplierName') ?? data.get('supplierName') ?? data.get('name') ?? '').trim();
    if (!supplierName) {
      addToast('warning', 'Supplier name is required.');
      return;
    }

    const contactPerson = String(data.get('contactPerson') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const city = String(data.get('city') ?? '').trim();
    const address = String(data.get('address') ?? '').trim();
    const accountBalance = Number(data.get('accountBalance') ?? 0) || 0;
    const status = String(data.get('status') ?? 'Active');

    const editingId = editingSupplier
      ? getSupplierData(editingSupplier).id
      : '';

    setIsSubmitting(true);
    try {
      const payload = {
        // Support the backend naming used by the current PostgreSQL supplier route.
        // `name` is the canonical database field; the aliases make this compatible
        // with any older route validation that still reads SupplierName/supplierName.
        name: supplierName,
        SupplierName: supplierName,
        supplierName,
        contactPerson: contactPerson || undefined,
        phone: phone || undefined,
        email: email || undefined,
        city: city || undefined,
        address: address || undefined,
        accountBalance,
        status,
      };

      const response = editingId
        ? await inventoryApi.updateSupplier(editingId, payload)
        : await inventoryApi.createSupplier(payload);

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to save supplier.');
      }

      addToast(
        'success',
        `Supplier "${supplierName}" ${editingId ? 'updated' : 'saved'} successfully.`
      );
      setIsModalOpen(false);
      setEditingSupplier(null);
      await refreshSuppliers();
    } catch (error: any) {
      console.error('Supplier save failed:', error);
      addToast(
        'error',
        error?.message || 'Failed to save supplier. Check the inventory server.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archivingSupplier) return;

    const s = getSupplierData(archivingSupplier);

    if (!s.id) {
      addToast('error', 'Supplier ID is missing.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await inventoryApi.archiveSupplier(s.id);

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to archive supplier.');
      }

      addToast('success', `Supplier "${s.name}" archived successfully.`);
      setArchivingSupplier(null);
      await refreshSuppliers();
    } catch (error: any) {
      addToast('error', error?.message || 'Failed to archive supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const rows = ((suppliers ?? []) as SupplierRow[]);
  const q = search.trim().toLowerCase();

  const filteredSuppliers = rows.filter((supplier) => {
    const s = getSupplierData(supplier);

    if (!q) return true;

    return [
      s.id,
      s.name,
      s.contactPerson,
      s.phone,
      s.email,
      s.city,
      s.address,
      s.status,
    ].some((value) => String(value || '').toLowerCase().includes(q));
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Suppliers &amp; Distributors
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage suppliers, contact details and payable balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refreshSuppliers()}
            disabled={loading.suppliers}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs disabled:opacity-60"
            title="Refresh suppliers"
          >
            <RotateCw
              className={`w-4 h-4 ${loading.suppliers ? 'animate-spin text-blue-600' : ''}`}
            />
          </button>

          <button
            type="button"
            id="btn-add-supplier"
            onClick={openAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search suppliers by name, contact, city, phone..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">City / Address</th>
                <th className="py-3 px-4">Payable Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No suppliers found</p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const s = getSupplierData(supplier);

                  return (
                    <tr
                      key={s.id || `${s.name}-${s.phone}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {s.name || '—'}
                        <span className="block text-[10px] font-mono text-slate-400 font-normal">
                          {s.id || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{s.contactPerson || '—'}</td>
                      <td className="py-3 px-4 font-mono">{s.phone || '—'}</td>
                      <td className="py-3 px-4">{s.email || '—'}</td>
                      <td className="py-3 px-4 max-w-xs truncate">
                        {s.city ? `${s.city} • ` : ''}{s.address || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {formatCurrency(s.accountBalance)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${s.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                          {s.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(supplier)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                            title="Edit supplier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {s.status !== 'Archived' && (
                            <button
                              type="button"
                              onClick={() => setArchivingSupplier(supplier)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100"
                              title="Archive supplier"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div key={editingSupplier ? getSupplierData(editingSupplier).id : 'new-supplier'} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg disabled:opacity-50"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="supplier-name"
                    className="block font-bold text-slate-700 uppercase mb-1"
                  >
                    Supplier Name *
                  </label>
                  <input
                    id="supplier-name"
                    name="SupplierName"
                    type="text"
                    required
                    autoComplete="organization"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).name : ''}

                    placeholder="e.g. MegaTech Distributors Nigeria Ltd"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).contactPerson : ''}

                    placeholder="Mr. Chinedu Okafor"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).phone : ''}

                    placeholder="+234 803 555 1234"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).email : ''}

                    placeholder="sales@megatech.ng"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).city : 'Kano'}

                    placeholder="Kano"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Physical Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).address : ''}

                    placeholder="Suite 14, Computer Village, Ikeja"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Account Balance (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="accountBalance"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).accountBalance : 0}

                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).status : 'Active'}

                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md shadow-blue-600/20 disabled:opacity-60"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingSupplier
                      ? 'Update Supplier'
                      : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!archivingSupplier}
        title="Archive Supplier"
        message={`Are you sure you want to archive "${archivingSupplier ? getSupplierData(archivingSupplier).name : ''}"?`}
        confirmText="Archive"
        isLoading={isSubmitting}
        onConfirm={handleArchiveConfirm}
        onCancel={() => {
          if (!isSubmitting) setArchivingSupplier(null);
        }}
      />
    </div>
  );
};

export default SuppliersView;
