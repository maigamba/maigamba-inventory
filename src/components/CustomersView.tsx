import React, { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Customer } from '../types/inventory';
import { inventoryApi } from '../services/api';
import { formatCurrency, formatDate, parseNumber } from '../utils/formatters';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Users,
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
    CustomerType: String(raw?.CustomerType ?? raw?.customerType ?? 'Retail').trim() || 'Retail',
    AccountBalance: Number(raw?.AccountBalance ?? raw?.accountBalance ?? 0),
    Status: String(raw?.Status ?? raw?.status ?? 'Active').trim() || 'Active',
    CreatedAt: raw?.CreatedAt ?? raw?.createdAt,
    UpdatedAt: raw?.UpdatedAt ?? raw?.updatedAt,
  } as Customer;
}

export const CustomersView: React.FC = () => {
  const { customers: rawCustomers, refreshCustomers, addToast, loading } = useInventory();

  const customers = useMemo(
    () => (Array.isArray(rawCustomers) ? rawCustomers.map(normalizeCustomer).filter(c => c.CustomerID) : []),
    [rawCustomers]
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Archived'>('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [archivingCustomer, setArchivingCustomer] = useState<Customer | null>(null);
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

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return customers.filter(customer => {
      const matchesSearch =
        !q ||
        customer.CustomerName.toLowerCase().includes(q) ||
        customer.Phone.toLowerCase().includes(q) ||
        customer.Email.toLowerCase().includes(q) ||
        customer.CustomerID.toLowerCase().includes(q) ||
        customer.CustomerType.toLowerCase().includes(q);

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

    return { total: customers.length, active, archived, receivable };
  }, [customers]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-bold text-[#1a1a1a] tracking-tight">
              Customer Database
            </h2>
            <span className="text-[9px] font-mono uppercase tracking-widest text-black/40 border border-black/15 px-1.5 py-0.5">
              {stats.total} RECORDS
            </span>
          </div>
          <p className="text-xs text-black/60 font-light mt-1">
            Manage retail, corporate and wholesale customers connected directly to PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refreshCustomers()}
            disabled={loading.customers}
            className="p-2.5 rounded-sm border border-black/15 bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] shadow-xs transition-colors"
            title="Refresh customers"
          >
            <RotateCw className={`w-4 h-4 ${loading.customers ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            id="btn-add-customer"
            onClick={openAdd}
            className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] text-[10px] uppercase tracking-wider font-semibold rounded-sm shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 border border-black/10 rounded-sm">
          <div className="text-[10px] uppercase tracking-widest text-black/50">Total Customers</div>
          <div className="text-2xl font-serif font-bold mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-4 border border-black/10 rounded-sm">
          <div className="text-[10px] uppercase tracking-widest text-black/50">Active</div>
          <div className="text-2xl font-serif font-bold mt-1">{stats.active}</div>
        </div>
        <div className="bg-white p-4 border border-black/10 rounded-sm">
          <div className="text-[10px] uppercase tracking-widest text-black/50">Archived</div>
          <div className="text-2xl font-serif font-bold mt-1">{stats.archived}</div>
        </div>
        <div className="bg-white p-4 border border-black/10 rounded-sm">
          <div className="text-[10px] uppercase tracking-widest text-black/50">Positive Balances</div>
          <div className="text-xl font-serif font-bold mt-1">{formatCurrency(stats.receivable)}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-sm border border-black/10 shadow-xs grid grid-cols-1 md:grid-cols-[1fr_180px_200px] gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email, ID..."
            className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'ALL' | 'Active' | 'Archived')}
          className="py-2.5 px-3 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Archived">Archived</option>
        </select>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="py-2.5 px-3 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white"
        >
          <option value="ALL">All Customer Types</option>
          {customerTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-sm border border-black/10 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fcfaf7] border-b border-black/10 text-black/60 font-semibold uppercase tracking-[0.15em] text-[10px]">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-black/40">
                    <Users className="w-8 h-8 mx-auto mb-2 text-black/20" />
                    <p className="font-semibold text-black/60">No customers found</p>
                    <p className="text-[11px] mt-1">Try changing the search or filters, or add a new customer.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.CustomerID} className="hover:bg-[#fcfaf7]/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#1a1a1a]">{customer.CustomerName || '—'}</div>
                      <div className="text-[10px] font-mono text-black/40 mt-0.5">{customer.CustomerID}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-black/30" />
                        {customer.Phone || '—'}
                      </div>
                      <div className="flex items-center gap-1.5 text-black/60 mt-1">
                        <Mail className="w-3 h-3 text-black/30" />
                        {customer.Email || '—'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-sm font-semibold text-[9px] uppercase tracking-wider bg-[#f4f0ea] text-black/80 border border-black/10">
                        {customer.CustomerType || 'Retail'}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-start gap-1.5 text-black/60 truncate">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-black/30" />
                        <span className="truncate">{customer.Address || '—'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-serif font-bold">
                      {formatCurrency(parseNumber(customer.AccountBalance))}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-bold border ${customer.Status === 'Active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-[#f4f0ea] text-black/60 border-black/10'
                        }`}>
                        {customer.Status || 'Active'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingCustomer(customer)}
                          className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded-sm"
                          title="View customer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(customer)}
                          className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded-sm"
                          title="Edit customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {customer.Status !== 'Archived' && (
                          <button
                            type="button"
                            onClick={() => setArchivingCustomer(customer)}
                            className="p-1.5 text-black/40 hover:text-amber-800 hover:bg-black/5 rounded-sm"
                            title="Archive customer"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-sm shadow-2xl border border-black/20 overflow-hidden">
            <div className="p-5 border-b border-black/10 bg-[#fcfaf7] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1a1a1a]">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h3>
                <p className="text-[10px] text-black/50 mt-0.5">
                  {editingCustomer ? editingCustomer.CustomerID : 'A new Customer ID will be generated by the server.'}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="text-black/40 hover:text-black p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Alhaji Mustapha / Access Bank IT"
                  className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+234 802 345 6789"
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Customer Type
                  </label>
                  <select
                    value={formData.customerType}
                    onChange={e => setFormData(prev => ({ ...prev, customerType: e.target.value }))}
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black"
                  >
                    <option value="Retail">Retail Consumer</option>
                    <option value="Corporate">Corporate / B2B</option>
                    <option value="Wholesale">Wholesale Reseller</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="client@company.com"
                  className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Office 4, Commercial Plaza, Kano"
                  className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Account Balance (₦)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.accountBalance}
                    onChange={e => setFormData(prev => ({ ...prev, accountBalance: Number(e.target.value) || 0 }))}
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black"
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
                  className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold bg-[#f4f0ea] hover:bg-black/10 rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] rounded-sm text-[10px] uppercase tracking-wider font-semibold"
                >
                  {isSubmitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-sm shadow-2xl border border-black/20">
            <div className="p-5 border-b border-black/10 flex items-center justify-between bg-[#fcfaf7]">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-black/40">Customer Profile</div>
                <h3 className="text-lg font-serif font-bold">{viewingCustomer.CustomerName}</h3>
              </div>
              <button type="button" onClick={() => setViewingCustomer(null)} className="p-1 text-black/40 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-black/40" /><span className="font-mono">{viewingCustomer.CustomerID}</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-black/40" /><span>{viewingCustomer.Phone || 'No phone number'}</span></div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-black/40" /><span>{viewingCustomer.Email || 'No email address'}</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-black/40" /><span>{viewingCustomer.Address || 'No address'}</span></div>
              <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-black/40" /><span>{viewingCustomer.CustomerType || 'Retail'}</span></div>
              <div className="pt-3 border-t border-black/10 flex justify-between">
                <span className="text-black/50">Account balance</span>
                <strong>{formatCurrency(parseNumber(viewingCustomer.AccountBalance))}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-black/50">Status</span>
                <strong>{viewingCustomer.Status || 'Active'}</strong>
              </div>
              <div className="text-[10px] text-black/40 pt-2">
                Created: {viewingCustomer.CreatedAt ? formatDate(viewingCustomer.CreatedAt) : '—'}
                {' • '}
                Updated: {viewingCustomer.UpdatedAt ? formatDate(viewingCustomer.UpdatedAt) : '—'}
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
    </div>
  );
};

export default CustomersView;
