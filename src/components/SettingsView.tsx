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

      const res = await inventoryApi.updateSettings(payload);
      if (res.success) {
        addToast('success', 'Business settings successfully updated!');
        await refreshSettings();
      } else {
        addToast('error', res.message || 'Failed to update settings.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#1a1a1a] tracking-tight">Business Configuration</h2>
          <p className="text-xs text-black/60 font-light mt-1">
            Configure enterprise trade name, invoice branding, currency formats, and low stock alarms.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshSettings()}
          disabled={loading.settings}
          className="p-2.5 rounded-sm border border-black/15 bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] shadow-xs flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold self-start sm:self-auto transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${loading.settings ? 'animate-spin text-black' : ''}`} />
          <span>Reload Config</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Profile */}
        <div className="bg-white p-6 rounded-sm border border-black/10 shadow-xs space-y-4">
          <h3 className="text-xs font-serif font-bold text-[#1a1a1a] border-b border-black/10 pb-3 flex items-center gap-2 uppercase tracking-wider">
            <SettingsIcon className="w-4 h-4 text-black/70" />
            <span>Store Profile & Invoice Header</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Company / Enterprise Name</label>
              <input
                type="text"
                required
                value={formData.BusinessName}
                onChange={(e) => setFormData({ ...formData, BusinessName: e.target.value })}
                className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-serif font-bold text-[#1a1a1a]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Official Phone Contact</label>
              <input
                type="text"
                value={formData.Phone}
                onChange={(e) => setFormData({ ...formData, Phone: e.target.value })}
                className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Support Email</label>
              <input
                type="email"
                value={formData.Email}
                onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Shop Address / Headquarters</label>
              <input
                type="text"
                value={formData.Address}
                onChange={(e) => setFormData({ ...formData, Address: e.target.value })}
                className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
              />
            </div>
          </div>
        </div>

        {/* Currency & Tax Preferences */}
        <div className="bg-white p-6 rounded-sm border border-black/10 shadow-xs space-y-4">
          <h3 className="text-xs font-serif font-bold text-[#1a1a1a] border-b border-black/10 pb-3 uppercase tracking-wider">
            Financial, Tax & Stock Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Currency Code</label>
              <input
                type="text"
                value={formData.Currency}
                onChange={(e) => setFormData({ ...formData, Currency: e.target.value })}
                className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.CurrencySymbol}
                onChange={(e) => setFormData({ ...formData, CurrencySymbol: e.target.value })}
                className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-bold text-[#1a1a1a]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Standard Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.TaxRate}
                onChange={(e) => setFormData({ ...formData, TaxRate: e.target.value })}
                className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Default Low Stock Alert</label>
              <input
                type="number"
                min="1"
                value={formData.LowStockThreshold}
                onChange={(e) => setFormData({ ...formData, LowStockThreshold: e.target.value })}
                className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={formData.InvoicePrefix}
                onChange={(e) => setFormData({ ...formData, InvoicePrefix: e.target.value })}
                className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
              />
            </div>
          </div>
        </div>

        {/* Invoice Footer / Policy Note */}
        <div className="bg-white p-6 rounded-sm border border-black/10 shadow-xs space-y-4">
          <h3 className="text-xs font-serif font-bold text-[#1a1a1a] border-b border-black/10 pb-3 uppercase tracking-wider">
            Printed Receipt Terms & Warranty Policy
          </h3>

          <div className="text-xs">
            <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Invoice Footer Note</label>
            <textarea
              rows={3}
              value={formData.InvoiceFooterNote}
              onChange={(e) => setFormData({ ...formData, InvoiceFooterNote: e.target.value })}
              className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
            />
            <p className="text-[11px] text-black/40 font-light mt-1">
              Appears at the bottom of all customer receipts and POS printouts.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] font-semibold text-[10px] uppercase tracking-wider rounded-sm shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Saving Business Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Business Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
