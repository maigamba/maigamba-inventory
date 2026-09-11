import React, { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Customer } from '../types/inventory';
import { inventoryApi } from '../services/api';
import { formatCurrency, formatDate, parseNumber } from '../utils/formatters';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Users,
  UserPlus,
  Plus,
  Search,
  Edit,
  Archive,
  RotateCw,
  X,
  Phone,
  Mail,
  UserCheck,
  MapPin,
  Building2,
  Eye,
  Wallet,
  UserRoundCheck,
  UserRoundX,
  SlidersHorizontal,
} from 'lucide-react';

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  customerType: string;
  accountBalance: number;
  status: string;
};

const emptyForm: CustomerForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  customerType: 'Retail',
  accountBalance: 0,
  status: 'Active',
};

function normalizeCustomer(raw: any): Customer {
  return {
    ...raw,
    CustomerID: String(raw?.CustomerID ?? raw?.customerId ?? raw?.id ?? '').trim(),
    CustomerName: String(raw?.CustomerName ?? raw?.customerName ?? raw?.name ?? '').trim(),
    Phone: String(raw?.Phone ?? raw?.phone ?? '').trim(),
    Email: String(raw?.Email ?? raw?.email ?? '').trim(),
    Address: String(raw?.Address ?? raw?.address ?? '').trim(),
    CustomerType:
      String(raw?.CustomerType ?? raw?.customerType ?? 'Retail').trim() || 'Retail',
    AccountBalance: Number(raw?.AccountBalance ?? raw?.accountBalance ?? 0),
    Status: String(raw?.Status ?? raw?.status ?? 'Active').trim() || 'Active',
    CreatedAt: raw?.CreatedAt ?? raw?.createdAt,
    UpdatedAt: raw?.UpdatedAt ?? raw?.updatedAt,
  } as Customer;
}

const statusTone: Record<string, string> = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Archived: 'border-slate-200 bg-slate-100 text-slate-600',
};

const typeTone: Record<string, string> = {
  Retail: 'border-blue-200 bg-blue-50 text-blue-700',
  Corporate: 'border-violet-200 bg-violet-50 text-violet-700',
  Wholesale: 'border-amber-200 bg-amber-50 text-amber-700',
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CU';
  return parts
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');
}

export const CustomersView: React.FC = () => {
  const {
    customers: rawCustomers,
    refreshCustomers,
    addToast,
    loading,
  } = useInventory();

  const customers = useMemo(
    () =>
      Array.isArray(rawCustomers)
        ? rawCustomers.map(normalizeCustomer).filter(c => c.CustomerID)
        : [],
    [rawCustomers]
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Archived'>('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [archivingCustomer, setArchivingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CustomerForm>(emptyForm);

  const openAdd = () => {
    setEditingCustomer(null);
    setFormData({ ...emptyForm });
    setIsModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.CustomerName || '',
      phone: customer.Phone || '',
      email: customer.Email || '',
      address: customer.Address || '',
      customerType: customer.CustomerType || 'Retail',
      accountBalance: parseNumber(customer.AccountBalance),
      status: customer.Status || 'Active',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isSubmitting) setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();
    if (!name) {
      addToast('warning', 'Customer name is required.');
      return;
    }

    if (formData.email.trim()) {
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
      if (!validEmail) {
        addToast('warning', 'Please enter a valid email address.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerName: name,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim().toLowerCase() || undefined,
        address: formData.address.trim() || undefined,
        customerType: formData.customerType || 'Retail',
        accountBalance: Number(formData.accountBalance) || 0,
        status: formData.status || 'Active',
      };

      const response = editingCustomer
        ? await inventoryApi.updateCustomer(editingCustomer.CustomerID, payload)
        : await inventoryApi.createCustomer(payload);

      if (!response.success) {
        addToast('error', response.message || 'Failed to save customer.');
        return;
      }

      addToast(
        'success',
        editingCustomer
          ? `Customer "${name}" updated successfully.`
          : `Customer "${name}" added successfully.`
      );

      setIsModalOpen(false);
      setEditingCustomer(null);
      setFormData({ ...emptyForm });
      await refreshCustomers();
    } catch (error: any) {
      console.error('Customer save failed:', error);
      addToast('error', error?.message || 'Unable to save customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archivingCustomer?.CustomerID) return;

    setIsSubmitting(true);

    try {
      const response = await inventoryApi.archiveCustomer(archivingCustomer.CustomerID);

      if (!response.success) {
        addToast('error', response.message || 'Failed to archive customer.');
        return;
      }

      addToast('success', `Customer "${archivingCustomer.CustomerName}" archived.`);
      setArchivingCustomer(null);
      await refreshCustomers();
    } catch (error: any) {
      console.error('Customer archive failed:', error);
      addToast('error', error?.message || 'Unable to archive customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCustomer?.CustomerID) return;

    setIsSubmitting(true);

    try {
      const customerId = String(deletingCustomer.CustomerID).trim();

      if (!customerId) {
        addToast('error', 'This customer has no valid Customer ID and cannot be deleted.');
        return;
      }

      const response = await inventoryApi.deleteCustomer(customerId);

      if (!response.success) {
        addToast('error', response.message || 'Failed to delete customer.');
        return;
      }

      addToast(
        'success',
        `Customer "${deletingCustomer.CustomerName}" deleted permanently.`
      );

      setDeletingCustomer(null);
      setViewingCustomer(null);
      await refreshCustomers();
    } catch (error: any) {
      console.error('Customer delete failed:', error);
      addToast(
        'error',
        error?.message || 'Unable to delete customer.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return customers.filter(customer => {
      const matchesSearch =
        !q ||
        customer.CustomerName.toLowerCase().includes(q) ||
        customer.Phone.toLowerCase().includes(q) ||
        customer.Email.toLowerCase().includes(q) ||
        customer.CustomerID.toLowerCase().includes(q) ||
        customer.CustomerType.toLowerCase().includes(q) ||
        customer.Address.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' || customer.Status === statusFilter;

      const matchesType =
        typeFilter === 'ALL' || customer.CustomerType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [customers, search, statusFilter, typeFilter]);

  const customerTypes = useMemo(
    () => Array.from(new Set(customers.map(c => c.CustomerType).filter(Boolean))),
    [customers]
  );

  const stats = useMemo(() => {
    const active = customers.filter(c => c.Status === 'Active').length;
    const archived = customers.filter(c => c.Status === 'Archived').length;
    const receivable = customers.reduce((sum, c) => {
      const balance = parseNumber(c.AccountBalance);
      return sum + (balance > 0 ? balance : 0);
    }, 0);

    const corporate = customers.filter(c => c.CustomerType === 'Corporate').length;
    const wholesale = customers.filter(c => c.CustomerType === 'Wholesale').length;

    return {
      total: customers.length,
      active,
      archived,
      receivable,
      corporate,
      wholesale,
    };
  }, [customers]);

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page header */}
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Users className="h-4.5 w-4.5" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                Customer Management
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Customers
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage your retail, corporate, and wholesale customer records from one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => refreshCustomers()}
              disabled={loading.customers}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCw className={`h-4 w-4 ${loading.customers ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              type="button"
              id="btn-add-customer"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <UserPlus className="h-4 w-4" />
              Add Customer
            </button>
          </div>
        </section>

        {/* KPI cards */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Customers
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  {stats.total}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">All customer records</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Active Customers
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  {stats.active}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserRoundCheck className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% of records
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Customer Receivables
                </p>
                <p className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                  {formatCurrency(stats.receivable)}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Wallet className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">Positive account balances</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Business Customers
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  {stats.corporate + stats.wholesale}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Building2 className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {stats.corporate} corporate • {stats.wholesale} wholesale
            </p>
          </div>
        </section>

        {/* Main table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Customer directory</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Search, filter and manage customer records.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search customer, phone, email..."
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

                <label className="relative">
                  <span className="sr-only">Filter by status</span>
                  <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={e =>
                      setStatusFilter(e.target.value as 'ALL' | 'Active' | 'Archived')
                    }
                    className="h-10 min-w-40 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                  </select>
                </label>

                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="h-10 min-w-40 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                >
                  <option value="ALL">All Types</option>
                  {customerTypes.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                {filteredCustomers.length} shown
              </span>
              {search && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                  Search: “{search}”
                </span>
              )}
              {statusFilter !== 'ALL' && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                  {statusFilter}
                </span>
              )}
              {typeFilter !== 'ALL' && (
                <span className="rounded-full bg-violet-50 px-2.5 py-1 font-medium text-violet-700">
                  {typeFilter}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Customer
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Contact
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Address
                  </th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Balance
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading.customers && customers.length === 0 ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      {Array.from({ length: 7 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="px-5 py-4">
                          <div className="h-4 animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Users className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-slate-800">
                        No customers found
                      </h3>
                      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                        Try a different search or filter, or create a new customer record.
                      </p>
                      {!search && statusFilter === 'ALL' && typeFilter === 'ALL' && (
                        <button
                          type="button"
                          onClick={openAdd}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4" />
                          Add your first customer
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(customer => (
                    <tr
                      key={customer.CustomerID}
                      className="group transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                            {initials(customer.CustomerName)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {customer.CustomerName || 'Unnamed customer'}
                            </div>
                            <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                              {customer.CustomerID}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{customer.Phone || 'No phone'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="max-w-[210px] truncate">
                              {customer.Email || 'No email'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${typeTone[customer.CustomerType] ||
                            'border-slate-200 bg-slate-100 text-slate-600'
                            }`}
                        >
                          {customer.CustomerType || 'Retail'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex max-w-[260px] items-start gap-2 text-xs text-slate-500">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{customer.Address || 'No address'}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="text-sm font-bold tabular-nums text-slate-900">
                          {formatCurrency(parseNumber(customer.AccountBalance))}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          account balance
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusTone[customer.Status] ||
                            'border-slate-200 bg-slate-100 text-slate-600'
                            }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {customer.Status || 'Active'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-80 transition group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setViewingCustomer(customer)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                            title="View customer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(customer)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
                            title="Edit customer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {customer.Status !== 'Archived' && (
                            <button
                              type="button"
                              onClick={() => setArchivingCustomer(customer)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"
                              title="Archive customer"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeletingCustomer(customer)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700"
                            title="Delete customer permanently"
                          >
                            <UserRoundX className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-3">
            <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing <strong className="text-slate-700">{filteredCustomers.length}</strong> of{' '}
                <strong className="text-slate-700">{customers.length}</strong> customers
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Customer records • PostgreSQL
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Add/Edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">
                    {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {editingCustomer
                      ? editingCustomer.CustomerID
                      : 'A new customer ID will be generated by the server.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-5 sm:p-6">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Customer full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Alhaji Mustapha / Access Bank IT"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+234 802 345 6789"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-mono text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Customer type
                  </label>
                  <select
                    value={formData.customerType}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, customerType: e.target.value }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="Retail">Retail Consumer</option>
                    <option value="Corporate">Corporate / B2B</option>
                    <option value="Wholesale">Wholesale Reseller</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="client@company.com"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Address</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Office 4, Commercial Plaza, Kano"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Account balance (₦)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.accountBalance}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        accountBalance: Number(e.target.value) || 0,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-mono text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
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
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {editingCustomer ? 'Save Changes' : 'Add Customer'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View customer modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                  {initials(viewingCustomer.CustomerName)}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Customer Profile
                  </p>
                  <h3 className="text-lg font-bold text-slate-950">
                    {viewingCustomer.CustomerName}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Customer ID
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <UserCheck className="h-4 w-4 text-slate-400" />
                    <span className="font-mono">{viewingCustomer.CustomerID}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Customer type
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span>{viewingCustomer.CustomerType || 'Retail'}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Phone
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{viewingCustomer.Phone || 'No phone number'}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Email
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{viewingCustomer.Email || 'No email address'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Address
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {viewingCustomer.Address || 'No address recorded'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Account balance
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-950">
                    {formatCurrency(parseNumber(viewingCustomer.AccountBalance))}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusTone[viewingCustomer.Status] ||
                        'border-slate-200 bg-white text-slate-600'
                        }`}
                    >
                      {viewingCustomer.Status === 'Archived' ? (
                        <UserRoundX className="h-3 w-3" />
                      ) : (
                        <UserRoundCheck className="h-3 w-3" />
                      )}
                      {viewingCustomer.Status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-400">
                Created:{' '}
                <span className="text-slate-600">
                  {viewingCustomer.CreatedAt ? formatDate(viewingCustomer.CreatedAt) : '—'}
                </span>
                {' • '}
                Updated:{' '}
                <span className="text-slate-600">
                  {viewingCustomer.UpdatedAt ? formatDate(viewingCustomer.UpdatedAt) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!archivingCustomer}
        title="Archive Customer"
        message={`Are you sure you want to archive "${archivingCustomer?.CustomerName}"?`}
        confirmText="Archive"
        isLoading={isSubmitting}
        onConfirm={handleArchiveConfirm}
        onCancel={() => !isSubmitting && setArchivingCustomer(null)}
      />

      <ConfirmationModal
        isOpen={!!deletingCustomer}
        title="Delete Customer Permanently"
        message={`Are you sure you want to permanently delete "${deletingCustomer?.CustomerName}"? This action cannot be undone.`}
        confirmText="Delete Permanently"
        isLoading={isSubmitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !isSubmitting && setDeletingCustomer(null)}
      />
    </div>
  );
};

export default CustomersView;
