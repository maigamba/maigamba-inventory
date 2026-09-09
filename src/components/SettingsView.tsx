import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { inventoryApi } from '../services/api';
import { Settings as SettingsIcon, Save, RotateCw, CheckCircle2, Shield } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, refreshSettings, addToast, loading } = useInventory();
  const [formData, setFormData] = useState({
    BusinessName: '',
    Address: '',
    Phone: '',
    Email: '',
    Currency: 'NGN',
    CurrencySymbol: '₦',
    TaxRate: '0',
    LowStockThreshold: '5',
    InvoicePrefix: 'INV-',
    InvoiceFooterNote: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        BusinessName: settings.BusinessName || 'Maigamba Computer Technology',
        Address: settings.Address || 'Lagos / Kano, Nigeria',
        Phone: settings.Phone || '+234 800 MAIGAMBA',
        Email: settings.Email || 'info@maigambatech.com',
        Currency: settings.Currency || 'NGN',
        CurrencySymbol: settings.CurrencySymbol || '₦',
        TaxRate: settings.TaxRate?.toString() || '0',
        LowStockThreshold: settings.LowStockThreshold?.toString() || '5',
        InvoicePrefix: settings.InvoicePrefix || 'INV-',
        InvoiceFooterNote:
          settings.InvoiceFooterNote ||
          'Thank you for your business! Electronics items are covered by standard 3-day return and test warranty.',
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        BusinessName: formData.BusinessName.trim(),
        Address: formData.Address.trim(),
        Phone: formData.Phone.trim(),
        Email: formData.Email.trim(),
        Currency: formData.Currency.trim().toUpperCase(),
        CurrencySymbol: formData.CurrencySymbol.trim(),
        TaxRate: Number(formData.TaxRate),
        LowStockThreshold: Number(formData.LowStockThreshold),
        InvoicePrefix: formData.InvoicePrefix.trim(),
        InvoiceFooterNote: formData.InvoiceFooterNote.trim(),
      };

      if (!payload.BusinessName) {
        addToast('error', 'Business name is required.');
        return;
      }

      if (!Number.isFinite(payload.TaxRate) || payload.TaxRate < 0 || payload.TaxRate > 100) {
        addToast('error', 'Tax rate must be between 0 and 100.');
        return;
      }

      if (!Number.isInteger(payload.LowStockThreshold) || payload.LowStockThreshold < 1) {
        addToast('error', 'Low stock threshold must be at least 1.');
        return;
      }

      // The backend stores the business configuration at /settings/config.
      // Use the endpoint directly so the Settings page matches the current API.
      const res = await inventoryApi.request('/settings/config', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        addToast('success', 'Business settings successfully updated!');
        await refreshSettings();
      } else {
        addToast('error', res.message || 'Failed to update settings.');
      }
    } catch (error: any) {
      console.error('[SETTINGS] UPDATE ERROR:', error);
      addToast(
        'error',
        error?.message || 'Unable to save business settings. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <SettingsIcon className="h-4 w-4" />
              System Configuration
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Settings
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage your store identity, financial preferences, inventory alerts,
              and customer invoice information.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refreshSettings()}
            disabled={loading.settings}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCw className={`h-4 w-4 ${loading.settings ? 'animate-spin' : ''}`} />
            Reload settings
          </button>
        </div>

        {/* Status banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5 shadow-sm">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900">Configuration centre</p>
            <p className="mt-0.5 text-xs leading-5 text-emerald-700">
              Changes made here are used across your inventory, POS, reports and printed invoices.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Business profile */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                  <SettingsIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Business profile</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Information displayed on invoices and customer documents.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Company / Enterprise Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.BusinessName}
                  onChange={(e) => setFormData({ ...formData, BusinessName: e.target.value })}
                  placeholder="Maigamba Computer Technology"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Official Phone Contact</label>
                <input
                  type="text"
                  value={formData.Phone}
                  onChange={(e) => setFormData({ ...formData, Phone: e.target.value })}
                  placeholder="+234..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Support Email</label>
                <input
                  type="email"
                  value={formData.Email}
                  onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                  placeholder="info@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Shop Address / Headquarters</label>
                <input
                  type="text"
                  value={formData.Address}
                  onChange={(e) => setFormData({ ...formData, Address: e.target.value })}
                  placeholder="Shop address"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>
            </div>
          </section>

          {/* Financial preferences */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <span className="text-lg font-bold">₦</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Financial & inventory preferences</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Configure currency, tax, stock alerts and invoice numbering.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Currency Code</label>
                <input
                  type="text"
                  value={formData.Currency}
                  onChange={(e) => setFormData({ ...formData, Currency: e.target.value })}
                  placeholder="NGN"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase text-slate-900 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Currency Symbol</label>
                <input
                  type="text"
                  value={formData.CurrencySymbol}
                  onChange={(e) => setFormData({ ...formData, CurrencySymbol: e.target.value })}
                  placeholder="₦"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Standard Tax Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.TaxRate}
                    onChange={(e) => setFormData({ ...formData, TaxRate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-bold text-slate-400">%</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Low Stock Alert</label>
                <input
                  type="number"
                  min="1"
                  value={formData.LowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, LowStockThreshold: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">Alert when stock reaches this quantity.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Invoice Prefix</label>
                <input
                  type="text"
                  value={formData.InvoicePrefix}
                  onChange={(e) => setFormData({ ...formData, InvoicePrefix: e.target.value })}
                  placeholder="INV-"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Invoice preview</p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {formData.InvoicePrefix || 'INV-'}000001
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Example invoice number
                </p>
              </div>
            </div>
          </section>

          {/* Footer / policy */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Receipt terms & warranty policy</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Add the message customers see at the bottom of printed receipts.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Invoice Footer Note</label>
              <textarea
                rows={4}
                value={formData.InvoiceFooterNote}
                onChange={(e) => setFormData({ ...formData, InvoiceFooterNote: e.target.value })}
                placeholder="Thank you for your business..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Appears at the bottom of customer receipts and POS printouts.
                </p>
                <span className="shrink-0 text-[11px] font-medium text-slate-400">
                  {formData.InvoiceFooterNote.length} characters
                </span>
              </div>
            </div>
          </section>

          {/* Sticky action area */}
          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Your settings are saved securely to the system.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving settings...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsView;
