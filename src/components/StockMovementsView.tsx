import React, { useEffect, useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { formatDate, parseNumber } from '../utils/formatters';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Layers,
  RefreshCw,
  RotateCw,
  Search,
} from 'lucide-react';

/**
 * PostgreSQL stock-movement records are normalized by InventoryContext.
 * The legacy StockMovement interface does not declare every normalized field,
 * so this local view type safely includes the additional fields used here.
 */
type MovementView = {
  MovementID?: string;
  ProductID?: string;
  MovementType?: string;
  Quantity?: number | string;
  PreviousQuantity?: number | string;
  NewQuantity?: number | string;
  Reference?: string;
  ReferenceID?: string;
  ReferenceType?: string;
  Reason?: string;
  StaffID?: string;
  CreatedBy?: string;
  MovementDate?: string | Date;
  CreatedAt?: string | Date;
  Notes?: string;
};

export const StockMovementsView: React.FC = () => {
  const {
    stockMovements,
    products,
    refreshStockMovements,
    getProductName,
    loading,
  } = useInventory();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');

  // Pagination for the movement ledger
  const movementsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const movements = useMemo(
    () => (stockMovements || []) as unknown as MovementView[],
    [stockMovements]
  );

  const isLoading = Boolean(
    (loading as any)?.stockMovements || (loading as any)?.movements
  );

  const filteredMovements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return movements.filter((movement) => {
      const productId = String(movement.ProductID ?? '').trim();
      const movementId = String(movement.MovementID ?? '').trim();
      const productName = getProductName(productId).toLowerCase();
      const referenceId = String(
        movement.ReferenceID ?? movement.Reference ?? ''
      )
        .trim()
        .toLowerCase();
      const notes = String(
        movement.Notes ?? movement.Reason ?? ''
      )
        .trim()
        .toLowerCase();
      const movementType = String(movement.MovementType ?? '').trim();

      const matchesSearch =
        !query ||
        productName.includes(query) ||
        productId.toLowerCase().includes(query) ||
        movementId.toLowerCase().includes(query) ||
        referenceId.includes(query) ||
        notes.includes(query);

      const matchesType =
        typeFilter === 'ALL' || movementType === typeFilter;

      const matchesProduct =
        productFilter === 'ALL' || productId === productFilter;

      return matchesSearch && matchesType && matchesProduct;
    });
  }, [
    movements,
    search,
    typeFilter,
    productFilter,
    getProductName,
  ]);

  // Reset pagination whenever the active filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, productFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / movementsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * movementsPerPage;
  const paginatedMovements = filteredMovements.slice(
    pageStartIndex,
    pageStartIndex + movementsPerPage
  );
  const pageStart = filteredMovements.length === 0 ? 0 : pageStartIndex + 1;
  const pageEnd = Math.min(pageStartIndex + movementsPerPage, filteredMovements.length);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis-end', totalPages] as const;
    }

    if (safeCurrentPage >= totalPages - 3) {
      return [1, 'ellipsis-start', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
    }

    return [1, 'ellipsis-start', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, 'ellipsis-end', totalPages] as const;
  }, [totalPages, safeCurrentPage]);

  const movementTypes = useMemo(() => {
    const uniqueTypes = new Set<string>();

    movements.forEach((movement) => {
      const type = String(movement.MovementType ?? '').trim();
      if (type) uniqueTypes.add(type);
    });

    return Array.from(uniqueTypes).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [movements]);

  const totalMovements = movements.length;

  const inboundCount = useMemo(
    () =>
      movements.filter((movement) => {
        const quantity = parseNumber(movement.Quantity);
        const type = String(movement.MovementType ?? '').toLowerCase();

        return (
          quantity > 0 ||
          type.includes('purchase') ||
          type.includes('return') ||
          type.includes('found') ||
          type.includes('initial')
        );
      }).length,
    [movements]
  );

  const outboundCount = useMemo(
    () =>
      movements.filter((movement) => {
        const quantity = parseNumber(movement.Quantity);
        const type = String(movement.MovementType ?? '').toLowerCase();

        return (
          quantity < 0 ||
          type.includes('sale') ||
          type.includes('issue') ||
          type.includes('damage') ||
          type.includes('loss')
        );
      }).length,
    [movements]
  );

  const getMovementDate = (movement: MovementView) =>
    movement.MovementDate ??
    movement.CreatedAt ??
    '';

  const getReferenceType = (movement: MovementView) =>
    String(
      movement.ReferenceType ??
      movement.MovementType ??
      ''
    ).trim();

  const getReferenceId = (movement: MovementView) =>
    String(
      movement.ReferenceID ??
      movement.Reference ??
      ''
    ).trim();

  const getAuthor = (movement: MovementView) =>
    String(
      movement.CreatedBy ??
      movement.StaffID ??
      'System'
    ).trim();

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Activity className="h-4.5 w-4.5" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                Inventory Control
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Stock Movements
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Review the real-time inventory movement ledger for purchases, sales, returns,
              adjustments, and stock corrections.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refreshStockMovements()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto"
          >
            <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Ledger
          </button>
        </section>

        {/* KPI cards */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setTypeFilter('ALL');
              setProductFilter('ALL');
            }}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Movements
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  {totalMovements.toLocaleString()}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:scale-105">
                <Activity className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">All recorded inventory events</p>
          </button>

          <button
            type="button"
            onClick={() => {
              const inbound = movementTypes.find(type =>
                /purchase|return|found|initial|in/i.test(type)
              );
              setTypeFilter(inbound || 'ALL');
            }}
            className="group rounded-2xl border border-emerald-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Inbound
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
                  {inboundCount.toLocaleString()}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:scale-105">
                <ArrowDownLeft className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Purchases, returns, found and initial stock
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              const outbound = movementTypes.find(type =>
                /sale|issue|damage|loss|out|reduction/i.test(type)
              );
              setTypeFilter(outbound || 'ALL');
            }}
            className="group rounded-2xl border border-rose-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                  Outbound
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-rose-700">
                  {outboundCount.toLocaleString()}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition group-hover:scale-105">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Sales, issues, losses and reductions
            </p>
          </button>
        </section>

        {/* Filter area */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Filter movement ledger</h2>
                <p className="text-xs text-slate-500">
                  Narrow results by product, movement type, reference, or notes.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product, movement ID, reference, notes..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="ALL">All Movement Types</option>
                {movementTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select
                value={productFilter}
                onChange={(event) => setProductFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="ALL">All Products</option>
                {products.map((product) => (
                  <option
                    key={product.ProductID}
                    value={product.ProductID}
                  >
                    {product.ProductName}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing <strong className="text-slate-800">{filteredMovements.length.toLocaleString()}</strong>{' '}
                of <strong className="text-slate-800">{totalMovements.toLocaleString()}</strong> records
              </span>

              {(search || typeFilter !== 'ALL' || productFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setTypeFilter('ALL');
                    setProductFilter('ALL');
                  }}
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Ledger */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Movement Records</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Read-only inventory audit trail from PostgreSQL.
                </p>
              </div>
            </div>
            <RefreshCw className={`h-4 w-4 text-slate-300 ${isLoading ? 'animate-spin' : ''}`} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr>
                  {[
                    'Date / Time',
                    'Movement ID',
                    'Product',
                    'Type',
                    'Qty Delta',
                    'Previous',
                    'New Qty',
                    'Reference',
                    'Reason / Notes',
                    'Author',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading && movements.length === 0 ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      {Array.from({ length: 10 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="px-5 py-4">
                          <div className="h-4 animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Activity className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-slate-800">
                        No stock movements found
                      </h3>
                      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                        Adjust the filters or create an inventory event to populate this ledger.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedMovements.map((movement, index) => {
                    const quantity = parseNumber(movement.Quantity);
                    const movementType = String(movement.MovementType ?? '').trim();
                    const normalizedMovementType = movementType.toLowerCase();

                    const isOutbound =
                      normalizedMovementType.includes('sale') ||
                      normalizedMovementType.includes('issue') ||
                      normalizedMovementType.includes('damage') ||
                      normalizedMovementType.includes('loss') ||
                      normalizedMovementType.includes('out') ||
                      normalizedMovementType.includes('reduction');

                    const isInbound =
                      normalizedMovementType.includes('purchase') ||
                      normalizedMovementType.includes('return') ||
                      normalizedMovementType.includes('found') ||
                      normalizedMovementType.includes('initial') ||
                      normalizedMovementType.includes('in');

                    const displayDelta = isOutbound
                      ? -Math.abs(quantity)
                      : isInbound
                        ? Math.abs(quantity)
                        : quantity;

                    const isPositive = displayDelta > 0;
                    const referenceType = getReferenceType(movement);
                    const referenceId = getReferenceId(movement);
                    const dateValue = getMovementDate(movement);
                    const author = getAuthor(movement);

                    const rowKey =
                      movement.MovementID ||
                      `${movement.ProductID || 'product'}-${dateValue || index}`;

                    const typeClasses = isOutbound
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : isInbound
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-100 text-slate-600';

                    return (
                      <tr
                        key={rowKey}
                        className="group transition-colors hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                          {dateValue ? formatDate(String(dateValue)) : '—'}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[10px] text-slate-600">
                            {movement.MovementID || '—'}
                          </span>
                        </td>

                        <td className="min-w-[220px] px-5 py-4">
                          <div className="font-medium text-slate-900">
                            {getProductName(String(movement.ProductID ?? ''))}
                          </div>
                          <div className="mt-1 font-mono text-[10px] text-slate-400">
                            {movement.ProductID || '—'}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${typeClasses}`}
                          >
                            {isPositive ? (
                              <ArrowDownLeft className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            {movementType || 'Unknown'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`font-mono text-sm font-bold ${displayDelta > 0
                              ? 'text-emerald-600'
                              : displayDelta < 0
                                ? 'text-rose-600'
                                : 'text-slate-500'
                              }`}
                          >
                            {displayDelta > 0 ? '+' : ''}
                            {displayDelta}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center font-mono text-sm text-slate-500">
                          {movement.PreviousQuantity ?? '—'}
                        </td>

                        <td className="px-5 py-4 text-center font-mono text-sm font-bold text-slate-900">
                          {movement.NewQuantity ?? '—'}
                        </td>

                        <td className="px-5 py-4">
                          {referenceId ? (
                            <div className="min-w-[160px]">
                              <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                                {referenceType || 'Reference'}
                              </span>
                              <span className="mt-1 block break-all font-mono text-[10px] font-semibold text-slate-700">
                                {referenceId}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="max-w-[280px] px-5 py-4 text-xs text-slate-500">
                          <span
                            className="block truncate"
                            title={movement.Notes || movement.Reason || ''}
                          >
                            {movement.Notes || movement.Reason || '—'}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                          {author || 'System'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Showing{' '}
              <span className="font-semibold text-slate-800">
                {pageStart.toLocaleString()}–{pageEnd.toLocaleString()}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-800">
                {filteredMovements.length.toLocaleString()}
              </span>{' '}
              movement records
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {pageNumbers.map((page) =>
                    typeof page === 'string' ? (
                      <span
                        key={page}
                        className="px-2 text-xs font-semibold text-slate-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`h-9 min-w-9 rounded-lg border px-2.5 text-xs font-semibold transition ${page === safeCurrentPage
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
