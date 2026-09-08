import React, { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Product, Purchase } from '../types/inventory';
import { inventoryApi } from '../services/api';
import { formatCurrency, formatDate, parseNumber } from '../utils/formatters';
import {
  ShoppingBag,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCw,
  Search,
  Building2,
  Receipt,
  Layers,
} from 'lucide-react';

interface PurchaseLineItem {
  product: Product;
  quantity: number;
  costPrice: number;
}

export const PurchasesView: React.FC = () => {
  const {
    products,
    suppliers,
    purchases,
    currentUser,
    refreshProducts,
    refreshPurchases,
    refreshSuppliers,
    refreshStockMovements,
    refreshDashboard,
    getSupplierName,
    getProductName,
    addToast,
    loading,
  } = useInventory();

  // Ensure suppliers are loaded when this view mounts
  useEffect(() => {
    refreshSuppliers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [viewMode, setViewMode] = useState<'NEW' | 'HISTORY'>('NEW');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Line item selector
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemCost, setItemCost] = useState<number | ''>('');

  // History search
  const [searchHistory, setSearchHistory] = useState('');

  // Add line item
  const handleAddLineItem = () => {
    if (!selectedProductId) {
      addToast('warning', 'Please select a product first.');
      return;
    }
    const prod = products.find((p) => p.ProductID === selectedProductId);
    if (!prod) return;

    if (itemQty <= 0) {
      addToast('warning', 'Quantity must be greater than 0.');
      return;
    }

    const effectiveCost = itemCost === '' ? parseNumber(prod.CostPrice) : Number(itemCost);
    if (effectiveCost < 0) {
      addToast('warning', 'Cost price cannot be negative.');
      return;
    }

    setLineItems((prev) => {
      const existing = prev.find((li) => li.product.ProductID === prod.ProductID);
      if (existing) {
        return prev.map((li) =>
          li.product.ProductID === prod.ProductID
            ? { ...li, quantity: li.quantity + itemQty, costPrice: effectiveCost }
            : li
        );
      }
      return [...prev, { product: prod, quantity: itemQty, costPrice: effectiveCost }];
    });

    // Reset selectors
    setSelectedProductId('');
    setItemQty(1);
    setItemCost('');
  };

  const removeLineItem = (prodId: string) => {
    setLineItems((prev) => prev.filter((li) => li.product.ProductID !== prodId));
  };

  // Calculations
  const totalAmount = useMemo(() => {
    return lineItems.reduce((acc, li) => acc + li.costPrice * li.quantity, 0);
  }, [lineItems]);

  const effectivePaid = amountPaid === '' ? totalAmount : Number(amountPaid) || 0;
  const balance = Math.max(0, totalAmount - effectivePaid);

  const paymentStatus = useMemo(() => {
    if (totalAmount === 0) return 'Paid';
    if (effectivePaid >= totalAmount) return 'Paid';
    if (effectivePaid > 0) return 'Partial';
    return 'Unpaid';
  }, [totalAmount, effectivePaid]);

  // Submit Purchase Order
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplierId) {
      addToast('warning', 'Please select a supplier.');
      return;
    }

    if (lineItems.length === 0) {
      addToast('warning', 'Add at least one product line item.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build payload with exact camelCase field names the Express backend expects
      const authenticatedUserId =
        currentUser?.UserID || '';

      if (!authenticatedUserId) {
        throw new Error('Your logged-in user ID is missing. Please sign in again.');
      }

      const payload = {
        supplierId: selectedSupplierId,
        amountPaid: Number(effectivePaid),
        paymentMethod,
        receivedBy: authenticatedUserId,
        notes: '',
        items: lineItems.map((li) => ({
          productId: String(li.product.ProductID).trim(),
          quantity: Number(li.quantity),
          unitCost: Number(li.costPrice),
        })),
      };

      console.log('[Purchases] Submitting payload:', payload);

      const res = await inventoryApi.createPurchase(payload);

      console.log('[Purchases] API response:', res);

      if (res.success) {
        addToast('success', 'Purchase order created and inventory stock updated!');
        setLineItems([]);
        setSelectedSupplierId('');
        setAmountPaid('');
        setSelectedProductId('');
        setItemQty(1);
        setItemCost('');
        setViewMode('HISTORY');

        await Promise.allSettled([
          refreshProducts(),
          refreshPurchases(),
          refreshSuppliers(),
          refreshStockMovements(),
          refreshDashboard(),
        ]);
      } else {
        console.error('[Purchases] Purchase failed:', res.message);
        addToast('error', res.message || 'Failed to record purchase order.');
      }
    } catch (error: any) {
      console.error('[Purchases] Purchase creation exception:', error);
      addToast('error', error?.message || 'Failed to record purchase order. Check the browser console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter history
  const filteredPurchases = purchases.filter((p) => {
    const q = searchHistory.trim().toLowerCase();
    const purchaseId = String(
      p.PurchaseID ?? ''
    ).toLowerCase();
    const invoiceNumber = String(
      (p as any).InvoiceNumber ?? (p as any).invoiceNumber ?? ''
    ).toLowerCase();
    const supplierId = String(
      p.SupplierID ?? ''
    ).trim();
    const supplierName = String(
      getSupplierName(supplierId) ?? ''
    ).toLowerCase();

    return (
      purchaseId.includes(q) ||
      invoiceNumber.includes(q) ||
      supplierName.includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#1a1a1a] tracking-tight">
            Procurement & Purchases
          </h2>
          <p className="text-xs text-black/60 font-light mt-1">
            Receive hardware shipments, replenish stock levels, and track supplier payables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#f4f0ea] rounded-sm border border-black/10 flex items-center gap-1">
            <button
              onClick={() => setViewMode('NEW')}
              className={`px-3 py-1.5 rounded-sm text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-all ${viewMode === 'NEW'
                ? 'bg-[#1a1a1a] text-[#fcfaf7] shadow-xs'
                : 'text-black/70 hover:text-black'
                }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Stock Order</span>
            </button>
            <button
              onClick={() => setViewMode('HISTORY')}
              className={`px-3 py-1.5 rounded-sm text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-all ${viewMode === 'HISTORY'
                ? 'bg-[#1a1a1a] text-[#fcfaf7] shadow-xs'
                : 'text-black/70 hover:text-black'
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Purchase History ({purchases.length})</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'NEW' ? (
        /* New Purchase Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Line Items Entry (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-5 rounded-sm border border-black/10 shadow-xs space-y-4">
              <h3 className="text-sm font-serif font-bold text-[#1a1a1a] flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-black/70" />
                <span>Add Incoming Hardware to Order</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                <div className="sm:col-span-6">
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Select Product *</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedProductId(id);
                      const prod = products.find((p) => p.ProductID === id);
                      if (prod) {
                        setItemCost(parseNumber(prod.CostPrice));
                      }
                    }}
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                  >
                    <option value="">-- Choose Product to Restock --</option>
                    {products.map((p) => (
                      <option key={p.ProductID} value={p.ProductID}>
                        {p.ProductName} ({p.SKU}) — Current: {p.Quantity}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Unit Cost (₦) *</label>
                  <input
                    type="number"
                    min="0"
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="px-4 py-2 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] rounded-sm text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>
            </div>

            {/* Line Items List */}
            <div className="bg-white rounded-sm border border-black/10 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-black/10 bg-[#fcfaf7] flex items-center justify-between">
                <h4 className="text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em]">
                  Order Line Items ({lineItems.length})
                </h4>
                {lineItems.length > 0 && (
                  <button
                    onClick={() => setLineItems([])}
                    className="text-[10px] uppercase tracking-wider text-rose-800 hover:underline font-semibold"
                  >
                    Remove All
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#fcfaf7] border-b border-black/10 text-black/60 font-semibold uppercase tracking-[0.15em] text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Restock Qty</th>
                      <th className="py-2.5 px-3 text-right">Cost Price</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 text-black/80">
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-black/40 font-light">
                          No items added yet. Select products above to build shipment order.
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((li) => {
                        const lineTotal = li.costPrice * li.quantity;
                        return (
                          <tr key={li.product.ProductID} className="hover:bg-[#fcfaf7]/70 transition-colors">
                            <td className="py-2.5 px-3 font-medium text-[#1a1a1a]">
                              {li.product.ProductName}
                              <span className="block text-[10px] font-mono text-black/40 tracking-wider">{li.product.SKU}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold font-mono">+{li.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(li.costPrice)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1a1a1a]">
                              {formatCurrency(lineTotal)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeLineItem(li.product.ProductID)}
                                className="p-1 text-black/40 hover:text-rose-700 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Supplier & Settlement Form (5 cols) */}
          <div className="lg:col-span-5">
            <form onSubmit={handleSavePurchase} className="bg-white p-5 rounded-sm border border-black/10 shadow-xs space-y-4 text-xs">
              <h3 className="text-sm font-serif font-bold text-[#1a1a1a] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-black/70" />
                <span>Supplier & Settlement Details</span>
              </h3>

              <div>
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Distributor / Supplier *</label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  disabled={loading.suppliers}
                  className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a] disabled:opacity-60"
                >
                  <option value="">{loading.suppliers ? '-- Loading Suppliers --' : '-- Choose Supplier --'}</option>
                  {suppliers.map((s) => (
                    <option key={s.SupplierID} value={s.SupplierID}>
                      {s.SupplierName} {s.City ? `(${s.City})` : ''}
                    </option>
                  ))}
                </select>
                {!loading.suppliers && suppliers.length === 0 && (
                  <p className="mt-1 text-[10px] text-amber-800">
                    No suppliers found. Add a supplier in the Suppliers page first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                >
                  <option value="Bank Transfer">Bank Transfer (Direct)</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit">Credit / Account Payable</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em]">Amount Paid (₦)</label>
                  <button
                    type="button"
                    onClick={() => setAmountPaid(totalAmount)}
                    className="text-[10px] text-black/70 hover:text-black underline font-semibold"
                  >
                    Pay Full (₦{totalAmount.toLocaleString()})
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  placeholder={totalAmount.toString()}
                  className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-sm font-bold text-[#1a1a1a]"
                />
              </div>

              {/* Summary calculations */}
              <div className="p-4 bg-[#fcfaf7] rounded-sm border border-black/10 space-y-2 text-xs">
                <div className="flex justify-between text-black/60">
                  <span>Items in Shipment:</span>
                  <span className="font-semibold text-[#1a1a1a]">{lineItems.reduce((a, b) => a + b.quantity, 0)} units</span>
                </div>
                <div className="flex justify-between text-base font-serif font-bold text-[#1a1a1a] pt-1 border-t border-black/10">
                  <span>Grand Total Cost:</span>
                  <span className="font-mono">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-black/70 font-medium">
                  <span>Amount Paid:</span>
                  <span className="font-mono text-emerald-800">{formatCurrency(effectivePaid)}</span>
                </div>
                <div className="flex justify-between text-black/70 font-medium">
                  <span>Outstanding Balance:</span>
                  <span className={`font-mono ${balance > 0 ? 'text-rose-800' : 'text-[#1a1a1a]'}`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-black/60">Payment Status:</span>
                  <span className="font-semibold uppercase tracking-wider text-emerald-800">{paymentStatus}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || lineItems.length === 0 || !selectedSupplierId}
                className="w-full py-3 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] font-semibold text-[10px] uppercase tracking-wider rounded-sm shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Processing Restock...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Purchase & Increase Stock</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Purchase Order History Table */
        <div className="bg-white rounded-sm border border-black/10 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-black/10 bg-[#fcfaf7] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
              <input
                type="text"
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                placeholder="Search purchases by supplier or ID..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
              />
            </div>

            <button
              onClick={() => refreshPurchases()}
              disabled={loading.purchases}
              className="p-2 border border-black/15 rounded-sm bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] shadow-xs transition-colors"
              title="Refresh"
            >
              <RotateCw className={`w-4 h-4 ${loading.purchases ? 'animate-spin text-black' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fcfaf7] border-b border-black/10 text-black/60 font-semibold uppercase tracking-[0.15em] text-[10px]">
                <tr>
                  <th className="py-3 px-4">Purchase ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 text-black/80">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-black/40 font-light">
                      No purchase orders recorded.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p) => (
                    <tr key={p.PurchaseID} className="hover:bg-[#fcfaf7]/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#1a1a1a]">{p.PurchaseID}</td>
                      <td className="py-3 px-4 text-black/60 font-light">{formatDate(p.PurchaseDate || p.CreatedAt)}</td>
                      <td className="py-3 px-4 font-medium text-[#1a1a1a]">{getSupplierName(p.SupplierID)}</td>
                      <td className="py-3 px-4 text-right font-serif font-bold text-[#1a1a1a] font-mono">{formatCurrency(p.TotalAmount)}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-800">{formatCurrency(p.AmountPaid)}</td>
                      <td className="py-3 px-4 text-right font-mono text-black/60">{formatCurrency(p.Balance)}</td>
                      <td className="py-3 px-4 text-black/70">{p.PaymentMethod || 'Bank'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-semibold border ${p.PaymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}
                        >
                          {p.PaymentStatus || 'Paid'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-black/60 font-light">{p.CreatedBy || 'Admin'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
