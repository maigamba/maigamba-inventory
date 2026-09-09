import React, { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { inventoryApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  RotateCcw,
  Plus,
  RotateCw,
  Search,
  PackageCheck,
  Banknote,
  ClipboardList,
  X,
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

const isRestocked = (item: AnyRecord) =>
  valueOf(item, 'Restock', 'restock') === true ||
  String(valueOf(item, 'Restock', 'restock') ?? '').toLowerCase() === 'true';

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
      const invoice = normalizeId(sale, 'InvoiceNumber', 'invoiceNumber');
      return saleId === selectedSaleId || invoice === selectedSaleId;
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
    return `${name}${sku ? ` (${sku})` : ''} — ${formatCurrency(price)}`;
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

    const saleId =
      getSaleId(selectedSale) || selectedSaleId.trim() || 'DIRECT-RETURN';

    const processedBy =
      String(
        valueOf(
          currentUser as AnyRecord | undefined,
          'FullName',
          'fullName',
          'name',
          'userId',
          'UserID',
          'id'
        ) ?? ''
      ).trim() || 'Admin Staff';

    const payload = {
      saleId: saleId === 'DIRECT-RETURN' ? undefined : saleId,
      productId,
      quantity: returnQty,
      refundAmount: refund,
      reason: reason.trim(),
      restock,
      processedBy,
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
      if (!q) return true;

      const returnId = normalizeId(item, 'ReturnID', 'returnId', 'id');
      const saleId = normalizeId(item, 'SaleID', 'saleId');
      const productId = normalizeId(item, 'ProductID', 'productId');
      const reasonText = String(valueOf(item, 'Reason', 'reason') ?? '');
      const productName = String(
        valueOf(item, 'ProductName', 'productName') ??
        getProductName(productId) ??
        ''
      );

      return [returnId, saleId, productId, reasonText, productName]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [returns, search, getProductName]);

  const totalRefunds = useMemo(
    () =>
      filteredReturns.reduce(
        (sum, item) =>
          sum +
          Number(valueOf(item, 'RefundAmount', 'refundAmount') ?? 0),
        0
      ),
    [filteredReturns]
  );

  const totalRestocked = useMemo(
    () =>
      filteredReturns.reduce(
        (sum, item) =>
          sum +
          (isRestocked(item)
            ? Number(valueOf(item, 'Quantity', 'quantity') ?? 0)
            : 0),
        0
      ),
    [filteredReturns]
  );

  const averageRefund =
    filteredReturns.length > 0
      ? totalRefunds / filteredReturns.length
      : 0;

  return (
    <div className="min-h-full bg-[#f7f7f5] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-black/35">
              <RotateCcw className="h-3.5 w-3.5" />
              Sales / Returns
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-[#171717]">
              Returns & Warranty
            </h2>
            <p className="mt-1 text-sm text-black/50">
              Process customer returns, refunds, warranty claims and inventory restocking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refreshReturns()}
              disabled={loading.returns}
              className="group inline-flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-semibold text-black/65 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
            >
              <RotateCw
                className={`h-4 w-4 ${loading.returns ? 'animate-spin' : 'group-hover:rotate-90'
                  }`}
              />
              <span>{loading.returns ? 'Loading...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewReturn}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#171717] px-5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Process Return
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="group rounded-2xl bg-[#171717] p-5 text-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <RotateCcw className="h-5 w-5" />
              </div>
              <span className="rounded-lg bg-white/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/45">
                Cases
              </span>
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Total Returns
            </p>
            <p className="mt-1 text-2xl font-bold">{filteredReturns.length}</p>
            <p className="mt-1 text-xs text-white/35">Current results</p>
          </div>

          <div className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Banknote className="h-5 w-5" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">
              Refund Value
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#171717]">
              {formatCurrency(totalRefunds)}
            </p>
            <p className="mt-1 text-xs text-black/40">Total refund amount</p>
          </div>

          <div className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <PackageCheck className="h-5 w-5" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">
              Units Restocked
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#171717]">
              {totalRestocked}
            </p>
            <p className="mt-1 text-xs text-black/40">Returned units added to stock</p>
          </div>

          <div className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ClipboardList className="h-5 w-5" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">
              Average Refund
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#171717]">
              {formatCurrency(averageRefund)}
            </p>
            <p className="mt-1 text-xs text-black/40">Per return case</p>
          </div>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-[#171717]">Returns Ledger</p>
              <p className="text-xs text-black/40">
                Search and review customer return activity.
              </p>
            </div>

            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, invoice, product or reason..."
                className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] pl-10 pr-10 text-xs outline-none transition focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/5"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="border-b border-black/5 bg-[#fafaf8] text-[9px] font-bold uppercase tracking-[0.16em] text-black/35">
                <tr>
                  <th className="px-5 py-4">Return ID</th>
                  <th className="px-5 py-4">Invoice / Sale</th>
                  <th className="px-5 py-4">Product</th>
                  <th className="px-5 py-4 text-center">Qty</th>
                  <th className="px-5 py-4">Refund</th>
                  <th className="px-5 py-4">Reason</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4">Processed By</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5">
                        <RotateCcw className="h-5 w-5 text-black/25" />
                      </div>
                      <p className="mt-3 text-sm font-bold text-black/60">
                        No returns found
                      </p>
                      <p className="mt-1 text-xs text-black/35">
                        {search
                          ? 'Try a different search term.'
                          : 'No return records are available yet.'}
                      </p>
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
                    const restocked = isRestocked(item);
                    const processedBy = String(
                      valueOf(
                        item,
                        'ProcessedBy',
                        'processedBy'
                      ) ?? 'Admin'
                    );
                    const returnDate = valueOf(
                      item,
                      'ReturnDate',
                      'returnDate',
                      'CreatedAt',
                      'createdAt'
                    );

                    return (
                      <tr
                        key={returnId || `${saleId}-${productId}-${returnDate}`}
                        className="transition-colors hover:bg-[#fafaf8]"
                      >
                        <td className="px-5 py-4">
                          <span className="font-mono font-bold text-[#171717]">
                            {returnId || '—'}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono text-[11px] text-black/45">
                          {saleId || 'Standalone'}
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-[230px] truncate font-semibold text-[#171717]">
                            {getProductName(productId) || productId || 'Unknown Product'}
                          </p>
                          <p className="mt-0.5 text-[10px] text-black/30">
                            {productId || 'No product ID'}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-rose-50 px-2 py-1 font-mono font-bold text-rose-700">
                            -{qty}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-bold text-[#171717]">
                          {formatCurrency(refund)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex max-w-[220px] rounded-lg bg-[#f4f4f1] px-2.5 py-1 text-[10px] font-semibold text-black/55">
                            {itemReason}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${restocked
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                              }`}
                          >
                            {restocked ? 'Restocked' : 'RMA / Scrapped'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-black/50">
                          {processedBy}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-black/40">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/30">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Sales / Returns
                  </div>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-[#171717]">
                    Process Product Return
                  </h3>
                  <p className="mt-1 text-xs text-black/40">
                    Record the returned item, refund and inventory disposition.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6f6f3] text-black/40 transition hover:bg-black/5 hover:text-black"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleProcessReturn} className="space-y-5 p-6">

                <div>
                  <label
                    htmlFor="return-sale"
                    className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black/40"
                  >
                    Related Sale / Invoice
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

                      const items = valueOf(sale, 'items', 'Items') as
                        | AnyRecord[]
                        | undefined;

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
                    className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] px-3 text-sm text-[#171717] outline-none transition focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/5"
                  >
                    <option value="">Standalone / Without Invoice</option>

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
                    className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black/40"
                  >
                    Product to Return *
                  </label>

                  <select
                    id="return-product"
                    required
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] px-3 text-sm text-[#171717] outline-none transition focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/5"
                  >
                    <option value="">Choose Product</option>

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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <div>
                    <label
                      htmlFor="return-quantity"
                      className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black/40"
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
                        setReturnQty(
                          Number.isFinite(next) && next > 0 ? next : 1
                        );
                      }}
                      className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] px-3 text-sm font-bold outline-none transition focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/5"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="refund-amount"
                      className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black/40"
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
                      className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] px-3 text-sm font-bold outline-none transition focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/5"
                    />
                  </div>

                </div>

                <div>
                  <label
                    htmlFor="return-reason"
                    className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black/40"
                  >
                    Reason for Return
                  </label>

                  <select
                    id="return-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] px-3 text-sm text-[#171717] outline-none transition focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/5"
                  >
                    {RETURN_REASONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#f8f8f6] p-4">
                  <div className="pr-4">
                    <p className="text-sm font-bold text-[#171717]">
                      Restock into Inventory
                    </p>
                    <p className="mt-1 text-xs leading-5 text-black/45">
                      Add the returned quantity back into available stock when
                      the item is suitable for resale.
                    </p>
                  </div>

                  <input
                    id="restock-return"
                    type="checkbox"
                    checked={restock}
                    onChange={(e) => setRestock(e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[#171717]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-black/5 pt-5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-11 rounded-xl border border-black/10 bg-white px-5 text-xs font-semibold text-black/55 transition hover:bg-[#f7f7f5]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#171717] px-6 text-xs font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {isSubmitting ? 'Processing...' : 'Complete Return'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReturnsView;
