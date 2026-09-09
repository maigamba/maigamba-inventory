import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Building2,
  CheckCircle2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

import { useInventory } from '../context/InventoryContext';
import {
  Product,
  Purchase,
} from '../types/inventory';
import { inventoryApi } from '../services/api';

import {
  formatCurrency,
  formatDate,
  parseNumber,
} from '../utils/formatters';

interface PurchaseLineItem {
  product: Product;
  quantity: number;
  costPrice: number;
}

type AnyRecord = Record<string, any>;

// ============================================================================
// SAFE FIELD HELPERS
// ============================================================================

const getValue = (
  record: AnyRecord | null | undefined,
  ...keys: string[]
): any => {
  if (!record) return undefined;

  for (const key of keys) {
    if (
      record[key] !== undefined &&
      record[key] !== null
    ) {
      return record[key];
    }
  }

  return undefined;
};

const getSupplierIdSafe = (
  supplier: AnyRecord | null | undefined
): string => {
  return String(
    getValue(
      supplier,
      'supplierId',
      'SupplierID',
      'id'
    ) ?? ''
  ).trim();
};

const getSupplierNameSafe = (
  supplier: AnyRecord | null | undefined
): string => {
  return String(
    getValue(
      supplier,
      'supplierName',
      'SupplierName',
      'name'
    ) ?? ''
  ).trim();
};

const getSupplierCitySafe = (
  supplier: AnyRecord | null | undefined
): string => {
  return String(
    getValue(
      supplier,
      'city',
      'City'
    ) ?? ''
  ).trim();
};

const getPurchaseId = (
  purchase: Purchase
): string => {
  const p = purchase as AnyRecord;

  return String(
    getValue(
      p,
      'purchaseId',
      'PurchaseID',
      'id'
    ) ?? ''
  ).trim();
};

const getPurchaseNumber = (
  purchase: Purchase
): string => {
  const p = purchase as AnyRecord;

  return String(
    getValue(
      p,
      'purchaseNumber',
      'PurchaseNumber',
      'invoiceNumber',
      'InvoiceNumber'
    ) ?? ''
  ).trim();
};

const getPurchaseDate = (
  purchase: Purchase
): any => {
  const p = purchase as AnyRecord;

  return getValue(
    p,
    'purchaseDate',
    'PurchaseDate',
    'createdAt',
    'CreatedAt'
  );
};

const getPurchaseSupplierId = (
  purchase: Purchase
): string => {
  const p = purchase as AnyRecord;

  return String(
    getValue(
      p,
      'supplierId',
      'SupplierID'
    ) ?? ''
  ).trim();
};

const getPurchaseTotal = (
  purchase: Purchase
): number => {
  const p = purchase as AnyRecord;

  return Number(
    getValue(
      p,
      'totalAmount',
      'TotalAmount'
    ) ?? 0
  );
};

const getPurchasePaid = (
  purchase: Purchase
): number => {
  const p = purchase as AnyRecord;

  return Number(
    getValue(
      p,
      'amountPaid',
      'AmountPaid'
    ) ?? 0
  );
};

const getPurchaseBalance = (
  purchase: Purchase
): number => {
  const p = purchase as AnyRecord;

  const value = getValue(
    p,
    'balance',
    'Balance'
  );

  if (
    value !== undefined &&
    value !== null
  ) {
    return Math.max(
      0,
      Number(value) || 0
    );
  }

  return Math.max(
    0,
    getPurchaseTotal(purchase) -
    getPurchasePaid(purchase)
  );
};

const getPurchasePaymentMethod = (
  purchase: Purchase
): string => {
  const p = purchase as AnyRecord;

  return String(
    getValue(
      p,
      'paymentMethod',
      'PaymentMethod'
    ) ?? 'Bank Transfer'
  );
};

const getPurchasePaymentStatus = (
  purchase: Purchase
): string => {
  const p = purchase as AnyRecord;

  const explicitStatus = getValue(
    p,
    'paymentStatus',
    'PaymentStatus'
  );

  if (explicitStatus) {
    return String(explicitStatus);
  }

  const total =
    getPurchaseTotal(purchase);

  const paid =
    getPurchasePaid(purchase);

  if (total <= 0) {
    return 'Paid';
  }

  if (paid >= total) {
    return 'Paid';
  }

  if (paid > 0) {
    return 'Partial';
  }

  return 'Unpaid';
};

const getPurchaseRecordedBy = (
  purchase: Purchase
): string => {
  const p = purchase as AnyRecord;

  const creatorName =
    p.creator?.fullName ??
    p.creator?.full_name;

  if (creatorName) {
    return String(creatorName);
  }

  return String(
    getValue(
      p,
      'createdBy',
      'CreatedBy',
      'receivedBy',
      'ReceivedBy'
    ) ?? 'Admin'
  );
};

const getPurchaseItemCount = (
  purchase: Purchase
): number => {
  const p = purchase as AnyRecord;

  const items =
    p.items ??
    p.purchaseItems ??
    p.PurchaseItems;

  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce(
    (
      total: number,
      item: AnyRecord
    ) =>
      total +
      Number(
        getValue(
          item,
          'quantity',
          'Quantity'
        ) ?? 0
      ),
    0
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

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
    addToast,
    loading,
  } = useInventory();

  // --------------------------------------------------------------------------
  // LOAD SUPPLIERS
  // --------------------------------------------------------------------------

  useEffect(() => {
    void refreshSuppliers();
    // Supplier refresh should happen only when this view mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------------------------
  // VIEW STATE
  // --------------------------------------------------------------------------

  const [
    viewMode,
    setViewMode,
  ] = useState<'NEW' | 'HISTORY'>(
    'HISTORY'
  );

  const [
    selectedSupplierId,
    setSelectedSupplierId,
  ] = useState('');

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState(
    'Bank Transfer'
  );

  const [
    amountPaid,
    setAmountPaid,
  ] = useState<number | ''>('');

  const [
    lineItems,
    setLineItems,
  ] = useState<PurchaseLineItem[]>(
    []
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  // --------------------------------------------------------------------------
  // PRODUCT ENTRY STATE
  // --------------------------------------------------------------------------

  const [
    selectedProductId,
    setSelectedProductId,
  ] = useState('');

  const [
    itemQty,
    setItemQty,
  ] = useState(1);

  const [
    itemCost,
    setItemCost,
  ] = useState<number | ''>('');

  // --------------------------------------------------------------------------
  // HISTORY SEARCH
  // --------------------------------------------------------------------------

  const [
    searchHistory,
    setSearchHistory,
  ] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const purchasesPerPage = 10;

  // ==========================================================================
  // ADD LINE ITEM
  // ==========================================================================

  const handleAddLineItem = () => {
    if (!selectedProductId) {
      addToast(
        'warning',
        'Please select a product first.'
      );
      return;
    }

    const product = products.find(
      (item) =>
        item.ProductID ===
        selectedProductId
    );

    if (!product) {
      addToast(
        'error',
        'Selected product could not be found.'
      );
      return;
    }

    if (itemQty <= 0) {
      addToast(
        'warning',
        'Quantity must be greater than 0.'
      );
      return;
    }

    const effectiveCost =
      itemCost === ''
        ? parseNumber(
          product.CostPrice
        )
        : Number(itemCost);

    if (
      !Number.isFinite(
        effectiveCost
      ) ||
      effectiveCost < 0
    ) {
      addToast(
        'warning',
        'Cost price cannot be negative.'
      );
      return;
    }

    setLineItems((previous) => {
      const existing =
        previous.find(
          (item) =>
            item.product.ProductID ===
            product.ProductID
        );

      if (existing) {
        return previous.map(
          (item) =>
            item.product.ProductID ===
              product.ProductID
              ? {
                ...item,
                quantity:
                  item.quantity +
                  itemQty,
                costPrice:
                  effectiveCost,
              }
              : item
        );
      }

      return [
        ...previous,
        {
          product,
          quantity: itemQty,
          costPrice:
            effectiveCost,
        },
      ];
    });

    setSelectedProductId('');
    setItemQty(1);
    setItemCost('');
  };

  // ==========================================================================
  // REMOVE LINE ITEM
  // ==========================================================================

  const removeLineItem = (
    productId: string
  ) => {
    setLineItems(
      (previous) =>
        previous.filter(
          (item) =>
            item.product.ProductID !==
            productId
        )
    );
  };

  // ==========================================================================
  // TOTALS
  // ==========================================================================

  const totalAmount = useMemo(
    () =>
      lineItems.reduce(
        (total, item) =>
          total +
          item.costPrice *
          item.quantity,
        0
      ),
    [lineItems]
  );

  const effectivePaid =
    amountPaid === ''
      ? totalAmount
      : Number(amountPaid) || 0;

  const balance = Math.max(
    0,
    totalAmount - effectivePaid
  );

  const paymentStatus = useMemo(
    () => {
      if (totalAmount <= 0) {
        return 'Paid';
      }

      if (
        effectivePaid >=
        totalAmount
      ) {
        return 'Paid';
      }

      if (effectivePaid > 0) {
        return 'Partial';
      }

      return 'Unpaid';
    },
    [totalAmount, effectivePaid]
  );

  // ==========================================================================
  // CREATE PURCHASE
  // ==========================================================================

  const handleSavePurchase = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!selectedSupplierId) {
      addToast(
        'warning',
        'Please select a supplier.'
      );
      return;
    }

    if (lineItems.length === 0) {
      addToast(
        'warning',
        'Add at least one product line item.'
      );
      return;
    }

    const currentUserRecord =
      currentUser as AnyRecord | undefined;

    const authenticatedUserId =
      String(
        currentUserRecord?.UserID ??
        currentUserRecord?.userId ??
        currentUserRecord?.id ??
        ''
      ).trim();

    if (!authenticatedUserId) {
      addToast(
        'error',
        'Your logged-in user ID is missing. Please sign in again.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        supplierId:
          selectedSupplierId,

        amountPaid:
          Number(effectivePaid),

        paymentMethod,

        receivedBy:
          authenticatedUserId,

        notes: '',

        items: lineItems.map(
          (item) => ({
            productId:
              String(
                item.product.ProductID
              ).trim(),

            quantity:
              Number(item.quantity),

            unitCost:
              Number(
                item.costPrice
              ),
          })
        ),
      };

      console.log(
        '[Purchases] Submitting payload:',
        payload
      );

      const response =
        await inventoryApi.createPurchase(
          payload
        );

      console.log(
        '[Purchases] API response:',
        response
      );

      if (!response.success) {
        throw new Error(
          response.message ||
          'Failed to record purchase order.'
        );
      }

      addToast(
        'success',
        'Purchase order created and inventory stock updated!'
      );

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
    } catch (
    error: any
    ) {
      console.error(
        '[Purchases] Purchase creation failed:',
        error
      );

      addToast(
        'error',
        error?.message ||
        'Failed to record purchase order. Check the browser console for details.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================================
  // FILTER HISTORY
  // ==========================================================================

  const filteredPurchases =
    purchases.filter(
      (purchase) => {
        const query =
          searchHistory
            .trim()
            .toLowerCase();

        if (!query) {
          return true;
        }

        const purchaseId =
          getPurchaseId(
            purchase
          ).toLowerCase();

        const purchaseNumber =
          getPurchaseNumber(
            purchase
          ).toLowerCase();

        const supplierId =
          getPurchaseSupplierId(
            purchase
          );

        const directSupplierName =
          getSupplierNameSafe(
            (purchase as AnyRecord)
              ?.supplier
          ).toLowerCase();

        const contextSupplierName =
          String(
            getSupplierName(
              supplierId
            ) || ''
          ).toLowerCase();

        return (
          purchaseId.includes(
            query
          ) ||
          purchaseNumber.includes(
            query
          ) ||
          directSupplierName.includes(
            query
          ) ||
          contextSupplierName.includes(
            query
          )
        );
      }
    );

  // ==========================================================================
  // PAGINATION
  // ==========================================================================

  useEffect(() => {
    setCurrentPage(1);
  }, [searchHistory]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPurchases.length / purchasesPerPage)
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedPurchases = useMemo(() => {
    const startIndex =
      (safeCurrentPage - 1) * purchasesPerPage;

    return filteredPurchases.slice(
      startIndex,
      startIndex + purchasesPerPage
    );
  }, [
    filteredPurchases,
    safeCurrentPage,
  ]);

  const pageStart =
    filteredPurchases.length === 0
      ? 0
      : (safeCurrentPage - 1) *
      purchasesPerPage +
      1;

  const pageEnd = Math.min(
    safeCurrentPage * purchasesPerPage,
    filteredPurchases.length
  );

  const visiblePages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from(
        { length: totalPages },
        (_, index) => index + 1
      );
    }

    const pages: number[] = [1];

    const start = Math.max(
      2,
      safeCurrentPage - 1
    );

    const end = Math.min(
      totalPages - 1,
      safeCurrentPage + 1
    );

    if (start > 2) {
      pages.push(-1);
    }

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (end < totalPages - 1) {
      pages.push(-2);
    }

    pages.push(totalPages);

    return pages;
  }, [
    safeCurrentPage,
    totalPages,
  ]);

  // ==========================================================================
  // HISTORY SUMMARY
  // ==========================================================================

  const historyStats =
    useMemo(() => {
      let total = 0;
      let paid = 0;
      let outstanding = 0;
      let units = 0;

      for (const purchase of filteredPurchases) {
        total +=
          getPurchaseTotal(
            purchase
          );

        paid +=
          getPurchasePaid(
            purchase
          );

        outstanding +=
          getPurchaseBalance(
            purchase
          );

        units +=
          getPurchaseItemCount(
            purchase
          );
      }

      return {
        count:
          filteredPurchases.length,
        total,
        paid,
        outstanding,
        units,
      };
    }, [filteredPurchases]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* ==================================================================
            PAGE HEADER
        ================================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Purchases
              </h1>

              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                Procurement
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Manage supplier orders,
              incoming stock and
              outstanding payables.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setViewMode(
                  'HISTORY'
                )
              }
              className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${viewMode === 'HISTORY'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
            >
              Purchase History

              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${viewMode === 'HISTORY'
                  ? 'bg-white/15'
                  : 'bg-slate-100'
                  }`}
              >
                {purchases.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setViewMode('NEW')
              }
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${viewMode === 'NEW'
                ? 'bg-slate-900 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              <Plus className="h-4 w-4" />
              New Purchase
            </button>
          </div>
        </div>

        {/* ==================================================================
            SUMMARY
        ================================================================== */}

        {viewMode === 'HISTORY' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {/* PURCHASE ORDERS */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Purchase Orders
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {
                      historyStats.count
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {historyStats.units}{' '}
                    units received
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                  <Package className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* TOTAL COST */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Purchase Cost
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {formatCurrency(
                      historyStats.total
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Across displayed orders
                  </p>
                </div>

                <div className="rounded-lg bg-violet-50 p-3 text-violet-600">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* PAID */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Amount Paid
                  </p>

                  <p className="mt-2 text-xl font-bold text-emerald-600">
                    {formatCurrency(
                      historyStats.paid
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Supplier payments
                  </p>
                </div>

                <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* OUTSTANDING */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Outstanding
                  </p>

                  <p className="mt-2 text-xl font-bold text-rose-600">
                    {formatCurrency(
                      historyStats.outstanding
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Supplier payables
                  </p>
                </div>

                <div className="rounded-lg bg-rose-50 p-3 text-rose-600">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            NEW PURCHASE
        ================================================================== */}

        {viewMode === 'NEW' ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

            {/* ==============================================================
                LEFT
            ============================================================== */}

            <div className="space-y-6 xl:col-span-8">

              {/* PRODUCT ENTRY */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                      <Package className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="font-semibold text-slate-900">
                        Add Products
                      </h2>

                      <p className="text-sm text-slate-500">
                        Add incoming hardware to this purchase.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-12">

                  {/* PRODUCT */}
                  <div className="md:col-span-6">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Product
                    </label>

                    <select
                      value={
                        selectedProductId
                      }
                      onChange={(
                        event
                      ) => {
                        const id =
                          event.target.value;

                        setSelectedProductId(
                          id
                        );

                        const product =
                          products.find(
                            (item) =>
                              item.ProductID ===
                              id
                          );

                        if (product) {
                          setItemCost(
                            parseNumber(
                              product.CostPrice
                            )
                          );
                        }
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">
                        Select product
                      </option>

                      {products.map(
                        (product) => (
                          <option
                            key={
                              product.ProductID
                            }
                            value={
                              product.ProductID
                            }
                          >
                            {
                              product.ProductName
                            }{' '}
                            —{' '}
                            {product.SKU}
                            {' '}
                            (Stock:{' '}
                            {product.Quantity}
                            )
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* QUANTITY */}
                  <div className="md:col-span-3">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Quantity
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        itemQty
                      }
                      onChange={(
                        event
                      ) =>
                        setItemQty(
                          Number.parseInt(
                            event.target.value
                          ) || 1
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* COST */}
                  <div className="md:col-span-3">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Unit Cost (₦)
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={
                        itemCost
                      }
                      onChange={(
                        event
                      ) =>
                        setItemCost(
                          event.target.value ===
                            ''
                            ? ''
                            : Number.parseFloat(
                              event.target.value
                            ) || 0
                        )
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 p-5">
                  <button
                    type="button"
                    onClick={
                      handleAddLineItem
                    }
                    className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </button>
                </div>
              </div>

              {/* ORDER ITEMS */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

                <div className="flex items-center justify-between border-b border-slate-100 p-5">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Order Items
                    </h2>

                    <p className="text-sm text-slate-500">
                      {
                        lineItems.length
                      }{' '}
                      product line
                      {lineItems.length ===
                        1
                        ? ''
                        : 's'}
                    </p>
                  </div>

                  {lineItems.length >
                    0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setLineItems(
                            []
                          )
                        }
                        className="text-sm font-medium text-rose-600 hover:text-rose-700"
                      >
                        Remove all
                      </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-100">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Product
                        </th>

                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Qty
                        </th>

                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Unit Cost
                        </th>

                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Total
                        </th>

                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {lineItems.length ===
                        0 ? (
                        <tr>
                          <td
                            colSpan={
                              5
                            }
                            className="px-5 py-12 text-center text-sm text-slate-400"
                          >
                            No items added yet.
                          </td>
                        </tr>
                      ) : (
                        lineItems.map(
                          (
                            item
                          ) => {
                            const lineTotal =
                              item.costPrice *
                              item.quantity;

                            return (
                              <tr
                                key={
                                  item
                                    .product
                                    .ProductID
                                }
                                className="transition hover:bg-slate-50"
                              >
                                <td className="px-5 py-4">
                                  <div className="font-medium text-slate-900">
                                    {
                                      item
                                        .product
                                        .ProductName
                                    }
                                  </div>

                                  <div className="mt-1 font-mono text-xs text-slate-400">
                                    {
                                      item
                                        .product
                                        .SKU
                                    }
                                  </div>
                                </td>

                                <td className="px-5 py-4 text-center font-semibold text-slate-700">
                                  {
                                    item.quantity
                                  }
                                </td>

                                <td className="px-5 py-4 text-right text-sm text-slate-600">
                                  {formatCurrency(
                                    item.costPrice
                                  )}
                                </td>

                                <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                                  {formatCurrency(
                                    lineTotal
                                  )}
                                </td>

                                <td className="px-5 py-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeLineItem(
                                        item
                                          .product
                                          .ProductID
                                      )
                                    }
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                    title="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ==============================================================
                RIGHT
            ============================================================== */}

            <div className="xl:col-span-4">
              <form
                onSubmit={
                  handleSavePurchase
                }
                className="sticky top-6 space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >

                {/* TITLE */}
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-violet-50 p-2.5 text-violet-600">
                    <Building2 className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Supplier & Payment
                    </h2>

                    <p className="text-sm text-slate-500">
                      Complete purchase settlement.
                    </p>
                  </div>
                </div>

                {/* SUPPLIER */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Supplier
                  </label>

                  <select
                    required
                    value={
                      selectedSupplierId
                    }
                    onChange={(
                      event
                    ) =>
                      setSelectedSupplierId(
                        event.target.value
                      )
                    }
                    disabled={
                      loading.suppliers
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  >
                    <option value="">
                      {loading.suppliers
                        ? 'Loading suppliers...'
                        : suppliers.length ===
                          0
                          ? 'No suppliers found'
                          : 'Select supplier'}
                    </option>

                    {suppliers.map(
                      (
                        supplier
                      ) => {
                        const supplierId =
                          getSupplierIdSafe(
                            supplier as AnyRecord
                          );

                        const supplierName =
                          getSupplierNameSafe(
                            supplier as AnyRecord
                          );

                        const city =
                          getSupplierCitySafe(
                            supplier as AnyRecord
                          );

                        if (
                          !supplierId ||
                          !supplierName
                        ) {
                          return null;
                        }

                        return (
                          <option
                            key={
                              supplierId
                            }
                            value={
                              supplierId
                            }
                          >
                            {
                              supplierName
                            }
                            {city
                              ? ` — ${city}`
                              : ''}
                          </option>
                        );
                      }
                    )}
                  </select>

                  {!loading.suppliers &&
                    suppliers.length ===
                    0 && (
                      <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        No suppliers are available.
                        Add a supplier first.
                      </p>
                    )}
                </div>

                {/* PAYMENT METHOD */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Payment Method
                  </label>

                  <select
                    value={
                      paymentMethod
                    }
                    onChange={(
                      event
                    ) =>
                      setPaymentMethod(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Bank Transfer">
                      Bank Transfer
                    </option>

                    <option value="Cash">
                      Cash
                    </option>

                    <option value="Cheque">
                      Cheque
                    </option>

                    <option value="Credit">
                      Credit / Payable
                    </option>
                  </select>
                </div>

                {/* AMOUNT PAID */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Amount Paid
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        setAmountPaid(
                          totalAmount
                        )
                      }
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Pay full
                    </button>
                  </div>

                  <input
                    type="number"
                    min="0"
                    value={
                      amountPaid
                    }
                    onChange={(
                      event
                    ) =>
                      setAmountPaid(
                        event.target.value ===
                          ''
                          ? ''
                          : Number.parseFloat(
                            event.target.value
                          ) || 0
                      )
                    }
                    placeholder={String(
                      totalAmount
                    )}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* SUMMARY */}
                <div className="rounded-xl bg-slate-50 p-4">

                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-500">
                      Items
                    </span>

                    <span className="font-semibold text-slate-900">
                      {lineItems.reduce(
                        (
                          total,
                          item
                        ) =>
                          total +
                          item.quantity,
                        0
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 py-3">
                    <span className="text-sm font-medium text-slate-600">
                      Total Cost
                    </span>

                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(
                        totalAmount
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-500">
                      Paid
                    </span>

                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(
                        effectivePaid
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-500">
                      Outstanding
                    </span>

                    <span
                      className={`font-semibold ${balance > 0
                        ? 'text-rose-600'
                        : 'text-slate-900'
                        }`}
                    >
                      {formatCurrency(
                        balance
                      )}
                    </span>
                  </div>

                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatus ===
                        'Paid'
                        ? 'bg-emerald-50 text-emerald-700'
                        : paymentStatus ===
                          'Partial'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                        }`}
                    >
                      {paymentStatus}
                    </span>
                  </div>
                </div>

                {/* CONFIRM */}
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    lineItems.length ===
                    0 ||
                    !selectedSupplierId
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Purchase
                    </>
                  )}
                </button>

                {/* CLEAR */}
                <button
                  type="button"
                  onClick={() => {
                    setLineItems([]);
                    setSelectedSupplierId(
                      ''
                    );
                    setAmountPaid('');
                    setSelectedProductId(
                      ''
                    );
                    setItemQty(1);
                    setItemCost('');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ==================================================================
             PURCHASE HISTORY
          ================================================================== */

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* HISTORY HEADER */}
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Purchase History
                </h2>

                <p className="text-sm text-slate-500">
                  Complete record of
                  supplier procurement.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                {/* SEARCH */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={
                      searchHistory
                    }
                    onChange={(
                      event
                    ) =>
                      setSearchHistory(
                        event.target.value
                      )
                    }
                    placeholder="Search ID, order or supplier..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
                  />
                </div>

                {/* REFRESH */}
                <button
                  type="button"
                  onClick={() =>
                    refreshPurchases()
                  }
                  disabled={
                    loading.purchases
                  }
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading.purchases
                      ? 'animate-spin'
                      : ''
                      }`}
                  />

                  Refresh
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full">

                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Purchase
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Supplier
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total Cost
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount Paid
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Balance
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Method
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Recorded By
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {/* EMPTY */}
                  {filteredPurchases.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-5 py-16 text-center"
                      >
                        <Package className="mx-auto h-10 w-10 text-slate-300" />

                        <p className="mt-3 text-sm font-medium text-slate-500">
                          No purchase orders found
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Try another search
                          or create a new
                          purchase.
                        </p>
                      </td>
                    </tr>
                  ) : (

                    /* DATA */
                    paginatedPurchases.map(
                      (purchase) => {
                        const record =
                          purchase as AnyRecord;

                        const purchaseId =
                          getPurchaseId(
                            purchase
                          );

                        const purchaseNumber =
                          getPurchaseNumber(
                            purchase
                          );

                        const supplierId =
                          getPurchaseSupplierId(
                            purchase
                          );

                        const directSupplier =
                          record.supplier;

                        const directSupplierName =
                          getSupplierNameSafe(
                            directSupplier
                          );

                        const contextSupplierName =
                          String(
                            getSupplierName(
                              supplierId
                            ) || ''
                          ).trim();

                        const supplierName =
                          directSupplierName ||
                          contextSupplierName ||
                          supplierId ||
                          '—';

                        const purchaseDate =
                          getPurchaseDate(
                            purchase
                          );

                        const totalAmount =
                          getPurchaseTotal(
                            purchase
                          );

                        const paidAmount =
                          getPurchasePaid(
                            purchase
                          );

                        const purchaseBalance =
                          getPurchaseBalance(
                            purchase
                          );

                        const paymentMethodValue =
                          getPurchasePaymentMethod(
                            purchase
                          );

                        const paymentStatusValue =
                          getPurchasePaymentStatus(
                            purchase
                          );

                        const recordedBy =
                          getPurchaseRecordedBy(
                            purchase
                          );

                        return (
                          <tr
                            key={
                              purchaseId ||
                              purchaseNumber ||
                              String(
                                purchaseDate
                              )
                            }
                            className="transition hover:bg-slate-50"
                          >

                            {/* PURCHASE */}
                            <td className="px-5 py-4">
                              <div className="font-mono text-sm font-semibold text-slate-900">
                                {purchaseId ||
                                  '—'}
                              </div>

                              {purchaseNumber && (
                                <div className="mt-1 text-xs text-slate-400">
                                  {
                                    purchaseNumber
                                  }
                                </div>
                              )}
                            </td>

                            {/* DATE */}
                            <td className="px-5 py-4 text-sm text-slate-600">
                              {purchaseDate ? (
                                formatDate(
                                  purchaseDate
                                )
                              ) : (
                                '—'
                              )}
                            </td>

                            {/* SUPPLIER */}
                            <td className="px-5 py-4">
                              <div className="font-medium text-slate-900">
                                {
                                  supplierName
                                }
                              </div>

                              {supplierId && (
                                <div className="mt-1 font-mono text-xs text-slate-400">
                                  {
                                    supplierId
                                  }
                                </div>
                              )}
                            </td>

                            {/* TOTAL */}
                            <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                              {formatCurrency(
                                totalAmount
                              )}
                            </td>

                            {/* PAID */}
                            <td className="px-5 py-4 text-right text-sm font-semibold text-emerald-600">
                              {formatCurrency(
                                paidAmount
                              )}
                            </td>

                            {/* BALANCE */}
                            <td
                              className={`px-5 py-4 text-right text-sm font-semibold ${purchaseBalance >
                                0
                                ? 'text-rose-600'
                                : 'text-slate-600'
                                }`}
                            >
                              {formatCurrency(
                                purchaseBalance
                              )}
                            </td>

                            {/* METHOD */}
                            <td className="px-5 py-4 text-sm text-slate-600">
                              {
                                paymentMethodValue
                              }
                            </td>

                            {/* STATUS */}
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusValue.toLowerCase() ===
                                  'paid'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : paymentStatusValue.toLowerCase() ===
                                    'partial'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-rose-50 text-rose-700'
                                  }`}
                              >
                                {
                                  paymentStatusValue
                                }
                              </span>
                            </td>

                            {/* RECORDED BY */}
                            <td className="px-5 py-4 text-sm text-slate-600">
                              {
                                recordedBy
                              }
                            </td>
                          </tr>
                        );
                      }
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {filteredPurchases.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-800">
                    {pageStart}
                  </span>
                  {"–"}
                  <span className="font-semibold text-slate-800">
                    {pageEnd}
                  </span>
                  {" of "}
                  <span className="font-semibold text-slate-800">
                    {filteredPurchases.length}
                  </span>
                  {" purchase orders"}
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeCurrentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.max(1, page - 1)
                      )
                    }
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Previous
                  </button>

                  {visiblePages.map((page, index) =>
                    page < 0 ? (
                      <span
                        key={`ellipsis-${page}-${index}`}
                        className="flex h-9 w-8 items-center justify-center text-xs text-slate-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        onClick={() =>
                          setCurrentPage(page)
                        }
                        className={`h-9 min-w-9 rounded-lg px-2 text-xs font-bold transition ${safeCurrentPage === page
                          ? "bg-slate-900 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(
                          totalPages,
                          page + 1
                        )
                      )
                    }
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};