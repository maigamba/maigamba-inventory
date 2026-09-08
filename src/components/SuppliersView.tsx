import React, { useMemo, useState } from 'react';
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
  Phone,
  Mail,
  MapPin,
  UserRound,
  Wallet,
  Users,
  Building,
} from 'lucide-react';

type SupplierRow = Supplier & Record<string, any>;

const getSupplierData = (supplier: SupplierRow) => ({
  id: String(supplier.SupplierID ?? supplier.supplierId ?? supplier.id ?? '').trim(),
  name: String(supplier.SupplierName ?? supplier.supplierName ?? supplier.name ?? '').trim(),
  contactPerson: String(supplier.ContactPerson ?? supplier.contactPerson ?? '').trim(),
  phone: String(supplier.Phone ?? supplier.phone ?? '').trim(),
  email: String(supplier.Email ?? supplier.email ?? '').trim(),
  city: String(supplier.City ?? supplier.city ?? '').trim(),
  address: String(supplier.Address ?? supplier.address ?? '').trim(),
  accountBalance: parseNumber(supplier.AccountBalance ?? supplier.accountBalance ?? 0),
  status: String(supplier.Status ?? supplier.status ?? 'Active').trim() || 'Active',
  createdAt: supplier.CreatedAt ?? supplier.createdAt ?? null,
});

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'SU';
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('');
}

export const SuppliersView: React.FC = () => {
  const { suppliers, refreshSuppliers, addToast, loading } = useInventory();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<SupplierRow | null>(null);
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
    const form = e.currentTarget;
    const data = new FormData(form);

    const supplierName = String(
      data.get('SupplierName') ?? data.get('supplierName') ?? data.get('name') ?? ''
    ).trim();

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

    const editingId = editingSupplier ? getSupplierData(editingSupplier).id : '';

    setIsSubmitting(true);

    try {
      const payload = {
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
      addToast('error', error?.message || 'Failed to save supplier. Check the inventory server.');
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

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(supplier => {
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
      ].some(value => String(value || '').toLowerCase().includes(q));
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    const active = rows.filter(r => getSupplierData(r).status === 'Active').length;
    const archived = rows.filter(r => getSupplierData(r).status === 'Archived').length;
    const payable = rows.reduce((sum, r) => {
      const balance = getSupplierData(r).accountBalance;
      return sum + (balance > 0 ? balance : 0);
    }, 0);
    const cities = new Set(rows.map(r => getSupplierData(r).city).filter(Boolean)).size;
    return { total: rows.length, active, archived, payable, cities };
  }, [rows]);

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Building2 className="h-4.5 w-4.5" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                Supply Chain
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Suppliers
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage distributors, supplier contacts and outstanding payable balances.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => refreshSuppliers()}
              disabled={loading.suppliers}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RotateCw className={`h-4 w-4 ${loading.suppliers ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              id="btn-add-supplier"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <Plus className="h-4 w-4" />
              Add Supplier
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total Suppliers',
              value: stats.total,
              hint: `${stats.cities} cities represented`,
              icon: <Building2 className="h-5 w-5" />,
              iconClass: 'bg-blue-50 text-blue-600',
            },
            {
              label: 'Active Suppliers',
              value: stats.active,
              hint: `${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% active`,
              icon: <Users className="h-5 w-5" />,
              iconClass: 'bg-emerald-50 text-emerald-600',
            },
            {
              label: 'Supplier Payables',
              value: formatCurrency(stats.payable),
              hint: 'Positive account balances',
              icon: <Wallet className="h-5 w-5" />,
              iconClass: 'bg-amber-50 text-amber-600',
            },
            {
              label: 'Archived',
              value: stats.archived,
              hint: 'Inactive supplier records',
              icon: <Archive className="h-5 w-5" />,
              iconClass: 'bg-slate-100 text-slate-600',
            },
          ].map(card => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{card.value}</p>
                </div>
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${card.iconClass}`}>
                  {card.icon}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400">{card.hint}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Supplier directory</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Search and manage your supplier network.
                </p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.currentTarget.value)}
                  placeholder="Search name, contact, city, phone..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              Showing <strong className="text-slate-700">{filteredSuppliers.length}</strong> of{' '}
              <strong className="text-slate-700">{rows.length}</strong> suppliers
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr>
                  {['Supplier', 'Contact', 'Phone', 'Email', 'Location', 'Payable', 'Status', 'Actions'].map((heading, i) => (
                    <th
                      key={heading}
                      className={`px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${i === 7 ? 'text-right' : ''}`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading.suppliers && rows.length === 0 ? (
                  Array.from({ length: 5 }).map((_, row) => (
                    <tr key={row}>
                      {Array.from({ length: 8 }).map((__, cell) => (
                        <td key={cell} className="px-5 py-4">
                          <div className="h-4 animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-slate-800">No suppliers found</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Try another search or add a new supplier.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(supplier => {
                    const s = getSupplierData(supplier);
                    return (
                      <tr key={s.id || `${s.name}-${s.phone}`} className="group transition-colors hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                              {initials(s.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">{s.name || 'Unnamed supplier'}</div>
                              <div className="mt-0.5 font-mono text-[10px] text-slate-400">{s.id || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">{s.contactPerson || '—'}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-xs text-slate-700">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {s.phone || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex max-w-[220px] items-center gap-2 truncate text-xs text-slate-600">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{s.email || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="max-w-[250px]">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {s.city || '—'}
                            </div>
                            <div className="mt-1 truncate text-[11px] text-slate-400">{s.address || 'No address'}</div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-bold tabular-nums text-slate-900">{formatCurrency(s.accountBalance)}</div>
                          <div className="mt-0.5 text-[10px] text-slate-400">account balance</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${s.status === 'Active'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-100 text-slate-600'
                            }`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {s.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-80 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setViewingSupplier(supplier)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                              title="View supplier"
                            >
                              <Building className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(supplier)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
                              title="Edit supplier"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {s.status !== 'Archived' && (
                              <button
                                type="button"
                                onClick={() => setArchivingSupplier(supplier)}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"
                                title="Archive supplier"
                              >
                                <Archive className="h-4 w-4" />
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
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">
                    {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Keep supplier contact and billing details up to date.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-5 sm:p-6">
              <div>
                <label htmlFor="supplier-name" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Supplier name <span className="text-red-500">*</span>
                </label>
                <input
                  id="supplier-name"
                  name="SupplierName"
                  type="text"
                  required
                  autoComplete="organization"
                  defaultValue={editingSupplier ? getSupplierData(editingSupplier).name : ''}
                  placeholder="e.g. MegaTech Distributors Nigeria Ltd"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Contact person</label>
                  <input
                    type="text"
                    name="contactPerson"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).contactPerson : ''}
                    placeholder="Mr. Chinedu Okafor"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Phone number</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).phone : ''}
                    placeholder="+234 803 555 1234"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-mono text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).email : ''}
                    placeholder="sales@company.ng"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">City</label>
                  <input
                    type="text"
                    name="city"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).city : 'Kano'}
                    placeholder="Kano"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Physical address</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={editingSupplier ? getSupplierData(editingSupplier).address : ''}
                  placeholder="Suite 14, Computer Village, Ikeja"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Account balance (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="accountBalance"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).accountBalance : 0}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-mono text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Status</label>
                  <select
                    name="status"
                    defaultValue={editingSupplier ? getSupplierData(editingSupplier).status : 'Active'}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {editingSupplier ? 'Save Changes' : 'Add Supplier'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                  {initials(getSupplierData(viewingSupplier).name)}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Supplier Profile</p>
                  <h3 className="text-lg font-bold text-slate-950">{getSupplierData(viewingSupplier).name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingSupplier(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const s = getSupplierData(viewingSupplier);
              return (
                <div className="space-y-4 p-5 sm:p-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Supplier ID</p>
                      <p className="mt-1 font-mono text-sm text-slate-800">{s.id || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Contact person</p>
                      <p className="mt-1 text-sm text-slate-800">{s.contactPerson || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Phone</p>
                      <p className="mt-1 text-sm text-slate-800">{s.phone || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Email</p>
                      <p className="mt-1 truncate text-sm text-slate-800">{s.email || '—'}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Location</p>
                    <p className="mt-1 flex items-start gap-2 text-sm text-slate-700">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      {s.city ? `${s.city}${s.address ? ` • ${s.address}` : ''}` : s.address || 'No address recorded'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Payable balance</p>
                      <p className="mt-1 text-lg font-bold tabular-nums text-slate-950">{formatCurrency(s.accountBalance)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{s.status}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
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
