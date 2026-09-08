import React, { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { inventoryApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  RotateCcw,
  Plus,
  RotateCw,
  Search,
} from 'lucide-react';

const RETURN_REASONS = [
  'Defective Hardware',
  'Wrong Item / Model Shipped',
  'Customer Changed Mind',
  'Warranty Replacement Claim',
  'Damaged in Transit / Inspection',
  'Incompatible Specifications',
];

type AnyRecord = Record<string, any>;

const valueOf = (obj: AnyRecord | undefined, ...keys: string[]) => {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
};

const normalizeId = (obj: AnyRecord | undefined, ...keys: string[]) =>
  String(valueOf(obj, ...keys) ?? '');

export const ReturnsView: React.FC = () => {
  const {
    sales,
    products,
    returns,
    currentUser,
    refreshProducts,
    refreshSales,
    refreshReturns,
    refreshStockMovements,
    refreshDashboard,
    getProductName,
    addToast,
    loading,
  } = useInventory();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [refundAmount, setRefundAmount] = useState<number | ''>('');
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [restock, setRestock] = useState(true);

  const selectedSale = useMemo(() => {
    return (sales as AnyRecord[]).find((sale) => {
      const saleId = normalizeId(sale, 'SaleID', 'saleId', 'id');
      const invoiceNumber = normalizeId(sale, 'InvoiceNumber', 'invoiceNumber');
      return saleId === selectedSaleId || invoiceNumber === selectedSaleId;
    });
  }, [sales, selectedSaleId]);

  const getSaleId = (sale: AnyRecord | undefined) =>
    normalizeId(sale, 'SaleID', 'saleId', 'id');

  const getInvoiceNumber = (sale: AnyRecord | undefined) =>
    String(valueOf(sale, 'InvoiceNumber', 'invoiceNumber') ?? '');

  const getProductId = (product: AnyRecord | undefined) =>
    normalizeId(product, 'ProductID', 'productId', 'id');

  const getProductLabel = (product: AnyRecord | undefined) => {
    const name = String(
      valueOf(product, 'ProductName', 'productName', 'name') ?? 'Unknown Product'
    );
    const sku = String(valueOf(product, 'SKU', 'sku') ?? '');
    const price = Number(
      valueOf(product, 'SellingPrice', 'sellingPrice', 'price') ?? 0
    );

    return `${name}${sku ? ` (${sku})` : ''} — Price: ${formatCurrency(price)}`;
  };

  const handleOpenNewReturn = () => {
    setSelectedSaleId('');
    setSelectedProductId('');
    setReturnQty(1);
    setRefundAmount('');
    setReason(RETURN_REASONS[0]);
    setRestock(true);
    setIsModalOpen(true);
  };

  const handleProcessReturn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const productId = selectedProductId.trim();

    if (!productId) {
      addToast('warning', 'Please select a product to return.');
      return;
    }

    if (!Number.isInteger(returnQty) || returnQty <= 0) {
      addToast('warning', 'Return quantity must be a whole number greater than zero.');
      return;
    }

    const refund = refundAmount === '' ? 0 : Number(refundAmount);

    if (!Number.isFinite(refund) || refund < 0) {
      addToast('warning', 'Refund amount must be zero or a valid positive amount.');
      return;
    }

    const saleId = getSaleId(selectedSale) || selectedSaleId.trim() || 'DIRECT-RETURN';
    const processedBy =
      String(
        valueOf(
          currentUser as AnyRecord | undefined,
          'userId',
          'UserID',
          'id'
        ) ?? ''
      ).trim();

    const payload = {
      saleId: saleId === 'DIRECT-RETURN' ? undefined : saleId,
      productId,
      quantity: returnQty,
      refundAmount: refund,
      reason: reason.trim(),
      restock,
      ...(processedBy ? { processedBy } : {}),
    };

    setIsSubmitting(true);

    try {
      const res = await inventoryApi.createReturn(payload);

      if (!res?.success) {
        throw new Error(res?.message || 'Failed to process return.');
      }

      addToast(
        'success',
        `Return processed successfully! ${restock ? 'Stock incremented.' : 'Item set aside as defective.'
        }`
      );

      setIsModalOpen(false);

      await Promise.allSettled([
        refreshProducts(),
        refreshSales(),
        refreshReturns(),
        refreshStockMovements(),
        refreshDashboard(),
      ]);
    } catch (error: any) {
      console.error('Return processing failed:', error);
      addToast(
        'error',
        error?.message || 'Unable to process the return. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReturns = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (returns as AnyRecord[]).filter((item) => {
      const returnId = normalizeId(item, 'ReturnID', 'returnId', 'id');
      const saleId = normalizeId(item, 'SaleID', 'saleId');
      const productId = normalizeId(item, 'ProductID', 'productId');
      const returnReason = String(
        valueOf(item, 'Reason', 'reason') ?? ''
      ).toLowerCase();

      const productName = String(
        valueOf(item, 'ProductName', 'productName') ??
        getProductName(productId) ??
        ''
      ).toLowerCase();

      if (!q) return true;

      return (
        returnId.toLowerCase().includes(q) ||
        saleId.toLowerCase().includes(q) ||
        returnReason.includes(q) ||
        productName.includes(q)
      );
    });
  }, [returns, search, getProductName]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#1a1a1a] tracking-tight">
            Customer Returns & Warranty Claims
          </h2>
          <p className="text-xs text-black/60 font-light mt-1">
            Process item returns, issue customer refunds, and restock operational hardware.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refreshReturns()}
            disabled={loading.returns}
            className="p-2.5 rounded-sm border border-black/15 bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] shadow-xs transition-colors"
            title="Refresh"
          >
            <RotateCw
              className={`w-4 h-4 ${loading.returns ? 'animate-spin text-black' : ''
                }`}
            />
          </button>

          <button
            type="button"
            id="btn-process-return"
            onClick={handleOpenNewReturn}
            className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] text-[10px] uppercase tracking-wider font-semibold rounded-sm shadow-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Process Return</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-sm border border-black/10 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search returns by ID, invoice, product, or reason..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
          />
        </div>
      </div>

      <div className="bg-white rounded-sm border border-black/10 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fcfaf7] border-b border-black/10 text-black/60 font-semibold uppercase tracking-[0.15em] text-[10px]">
              <tr>
                <th className="py-3 px-4">Return ID</th>
                <th className="py-3 px-4">Invoice / Sale ID</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-center">Returned Qty</th>
                <th className="py-3 px-4">Refund Amount</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-center">Restocked</th>
                <th className="py-3 px-4">Processed By</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5 text-black/80">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-black/40 font-light">
                    <RotateCcw className="w-8 h-8 text-black/20 mx-auto mb-2" />
                    <p className="font-semibold text-black/60">No returns recorded</p>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((item) => {
                  const returnId = normalizeId(item, 'ReturnID', 'returnId', 'id');
                  const saleId = normalizeId(item, 'SaleID', 'saleId');
                  const productId = normalizeId(item, 'ProductID', 'productId');
                  const qty = Number(valueOf(item, 'Quantity', 'quantity') ?? 0);
                  const refund = Number(
                    valueOf(item, 'RefundAmount', 'refundAmount') ?? 0
                  );
                  const itemReason = String(
                    valueOf(item, 'Reason', 'reason') ?? '—'
                  );
                  const restocked =
                    valueOf(item, 'Restock', 'restock') === true ||
                    String(valueOf(item, 'Restock', 'restock')).toLowerCase() === 'true';
                  const processedBy = String(
                    valueOf(item, 'ProcessedBy', 'processedBy') ?? 'Admin'
                  );
                  const returnDate = valueOf(
                    item,
                    'ReturnDate',
                    'returnDate',
                    'CreatedAt',
                    'createdAt'
                  );

                  return (
                    <tr key={returnId || `${saleId}-${productId}-${returnDate}`} className="hover:bg-[#fcfaf7]/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#1a1a1a]">
                        {returnId || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-black/60 text-[11px]">
                        {saleId || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#1a1a1a]">
                        {getProductName(productId) || productId || 'Unknown Product'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-rose-800 font-mono">
                        -{qty}
                      </td>
                      <td className="py-3 px-4 font-serif font-semibold text-[#1a1a1a]">
                        {formatCurrency(refund)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-semibold bg-[#f4f0ea] text-black/80 border border-black/10">
                          {itemReason}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-bold border ${restocked
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                        >
                          {restocked ? 'Restocked' : 'Scrapped / RMA'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-black/60 font-light">
                        {processedBy}
                      </td>
                      <td className="py-3 px-4 text-black/60 font-light">
                        {formatDate(returnDate)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-sm shadow-2xl border border-black/20 overflow-hidden">
            <div className="p-5 border-b border-black/10 bg-[#fcfaf7] flex items-center justify-between">
              <h3 className="text-sm font-serif font-bold text-[#1a1a1a]">
                Process Product Return
              </h3>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-black/40 hover:text-black p-1 rounded-sm hover:bg-black/5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessReturn} className="p-5 space-y-4 text-xs">
              <div>
                <label
                  htmlFor="return-sale"
                  className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1"
                >
                  Related Sale / Invoice (Optional)
                </label>
                <select
                  id="return-sale"
                  value={selectedSaleId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedSaleId(id);

                    const sale = (sales as AnyRecord[]).find(
                      (item) => getSaleId(item) === id
                    );

                    const items = valueOf(sale, 'items', 'Items') as AnyRecord[] | undefined;

                    if (items?.length) {
                      const firstProductId = normalizeId(
                        items[0],
                        'ProductID',
                        'productId',
                        'id'
                      );
                      setSelectedProductId(firstProductId);
                    }
                  }}
                  className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                >
                  <option value="">-- Standalone / Without Invoice --</option>

                  {(sales as AnyRecord[]).map((sale) => {
                    const id = getSaleId(sale);
                    const invoice = getInvoiceNumber(sale);
                    const total = Number(
                      valueOf(sale, 'TotalAmount', 'totalAmount') ?? 0
                    );
                    const saleDate = valueOf(sale, 'SaleDate', 'saleDate');

                    return (
                      <option key={id} value={id}>
                        {invoice || id} — {formatCurrency(total)} ({formatDate(saleDate)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label
                  htmlFor="return-product"
                  className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1"
                >
                  Product to Return *
                </label>

                <select
                  id="return-product"
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                >
                  <option value="">-- Choose Product --</option>

                  {(products as AnyRecord[]).map((product) => {
                    const id = getProductId(product);

                    return (
                      <option key={id} value={id}>
                        {getProductLabel(product)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="return-quantity"
                    className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1"
                  >
                    Return Quantity *
                  </label>

                  <input
                    id="return-quantity"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={returnQty}
                    onChange={(e) => {
                      const next = Number.parseInt(e.target.value, 10);
                      setReturnQty(Number.isFinite(next) && next > 0 ? next : 1);
                    }}
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono font-bold text-[#1a1a1a]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="refund-amount"
                    className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1"
                  >
                    Refund Amount (₦)
                  </label>

                  <input
                    id="refund-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) =>
                      setRefundAmount(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    placeholder="0.00"
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="return-reason"
                  className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1"
                >
                  Reason for Return
                </label>

                <select
                  id="return-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                >
                  {RETURN_REASONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-[#fcfaf7] rounded-sm border border-black/10 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#1a1a1a] block text-xs">
                    Restock into Inventory
                  </span>
                  <span className="text-[11px] text-black/50 font-light">
                    If checked, the returned quantity will automatically be added back to stock.
                  </span>
                </div>

                <input
                  id="restock-return"
                  type="checkbox"
                  checked={restock}
                  onChange={(e) => setRestock(e.target.checked)}
                  className="w-4 h-4 accent-[#1a1a1a] rounded-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-black/70 bg-[#f4f0ea] hover:bg-black/10 rounded-sm transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#1a1a1a] hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-[#fcfaf7] rounded-sm text-[10px] uppercase tracking-wider font-semibold shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Processing...' : 'Complete Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
