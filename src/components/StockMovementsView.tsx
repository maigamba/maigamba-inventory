import React, { useMemo, useState } from 'react';
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-bold text-[#1a1a1a] tracking-tight">
              Stock Movement Ledger
            </h2>
            <span className="px-2 py-0.5 rounded-sm bg-[#f4f0ea] border border-black/10 text-[9px] uppercase tracking-wider font-mono text-black/60">
              Inventory Audit
            </span>
          </div>

          <p className="text-xs text-black/60 font-light mt-1 max-w-3xl">
            Immutable inventory movement history for purchases, sales,
            returns, stock adjustments, and other quantity changes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshStockMovements()}
          disabled={isLoading}
          className="self-start lg:self-auto px-3.5 py-2.5 rounded-sm border border-black/15 bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] shadow-xs flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCw
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''
              }`}
          />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-black/10 rounded-sm p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-black/50 font-semibold">
              Total Movements
            </span>
            <Activity className="w-4 h-4 text-black/50" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#1a1a1a]">
            {totalMovements.toLocaleString()}
          </div>
          <p className="text-[10px] text-black/40 mt-1">
            All recorded inventory events
          </p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-sm p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-emerald-700 font-semibold">
              Inbound
            </span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-emerald-800">
            {inboundCount.toLocaleString()}
          </div>
          <p className="text-[10px] text-black/40 mt-1">
            Purchases, returns, found & initial stock
          </p>
        </div>

        <div className="bg-white border border-rose-200 rounded-sm p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-rose-700 font-semibold">
              Outbound
            </span>
            <ArrowUpRight className="w-4 h-4 text-rose-700" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-rose-800">
            {outboundCount.toLocaleString()}
          </div>
          <p className="text-[10px] text-black/40 mt-1">
            Sales, issues, losses & reductions
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-sm border border-black/10 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-black/50" />
          <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-black/60">
            Filter Ledger
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product, movement, reference, notes..."
              className="w-full pl-9 pr-3 py-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-black text-[#1a1a1a] text-xs"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full py-2.5 px-3 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-black text-[#1a1a1a] text-xs"
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
            className="w-full py-2.5 px-3 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-black text-[#1a1a1a] text-xs"
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

        <div className="mt-3 flex items-center justify-between text-[10px] text-black/40 font-mono">
          <span>
            Showing {filteredMovements.length.toLocaleString()} of{' '}
            {totalMovements.toLocaleString()} movement records
          </span>

          {(search || typeFilter !== 'ALL' || productFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
                setProductFilter('ALL');
              }}
              className="text-black/60 hover:text-black underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Ledger */}
      <div className="bg-white rounded-sm border border-black/10 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-black/10 bg-[#fcfaf7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-black/60" />
            <div>
              <h3 className="text-xs font-serif font-bold text-[#1a1a1a] uppercase tracking-wider">
                Movement Records
              </h3>
              <p className="text-[10px] text-black/40 mt-0.5">
                Read-only audit trail from PostgreSQL.
              </p>
            </div>
          </div>

          <RefreshCw
            className={`w-4 h-4 text-black/25 ${isLoading ? 'animate-spin' : ''
              }`}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f4f0ea] border-b border-black/10 text-black/60 font-semibold uppercase tracking-[0.12em] text-[9px]">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Date / Time</th>
                <th className="py-3 px-4">Movement ID</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">
                  Qty Delta
                </th>
                <th className="py-3 px-4 text-center whitespace-nowrap">
                  Previous
                </th>
                <th className="py-3 px-4 text-center whitespace-nowrap">
                  New Qty
                </th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Author</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5 text-black/80">
              {isLoading && movements.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-14 text-center text-black/40"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <RotateCw className="w-7 h-7 animate-spin text-black/25" />
                      <span className="text-xs font-semibold text-black/50">
                        Loading movement ledger...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-14 text-center text-black/40"
                  >
                    <Activity className="w-8 h-8 text-black/20 mx-auto mb-2" />
                    <p className="font-semibold text-black/60">
                      No stock movements found
                    </p>
                    <p className="text-[10px] mt-1">
                      Adjust the filters or create an inventory movement.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement, index) => {
                  const quantity = parseNumber(movement.Quantity);
                  const movementType = String(
                    movement.MovementType ?? ''
                  ).trim();

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

                  // StockMovement.Quantity is stored as an absolute quantity.
                  // Prefer the movement type to determine direction. This is
                  // important for sales because their stored Quantity may be +1
                  // even though the stock change is -1.
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

                  return (
                    <tr
                      key={rowKey}
                      className="hover:bg-[#fcfaf7]/70 transition-colors"
                    >
                      <td className="py-3 px-4 text-black/60 font-light whitespace-nowrap">
                        {dateValue ? formatDate(String(dateValue)) : '—'}
                      </td>

                      <td className="py-3 px-4 font-mono text-[10px] text-black/55 whitespace-nowrap">
                        {movement.MovementID || '—'}
                      </td>

                      <td className="py-3 px-4 font-medium text-[#1a1a1a] min-w-[180px]">
                        <span className="block">
                          {getProductName(
                            String(movement.ProductID ?? '')
                          )}
                        </span>
                        <span className="block text-[10px] font-mono text-black/40 font-normal mt-0.5">
                          {movement.ProductID || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider border ${movementType === 'Sale'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : movementType === 'Purchase'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : movementType === 'Return Restock'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-[#f4f0ea] text-black/80 border-black/10'
                            }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          {movementType || 'Unknown'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span
                          className={
                            isPositive
                              ? 'text-emerald-700'
                              : quantity < 0
                                ? 'text-rose-700'
                                : 'text-black/60'
                          }
                        >
                          {displayDelta > 0 ? '+' : ''}
                          {displayDelta}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-black/50">
                        {movement.PreviousQuantity ?? '—'}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-[#1a1a1a]">
                        {movement.NewQuantity ?? '—'}
                      </td>

                      <td className="py-3 px-4 font-mono text-[10px] text-black/60 min-w-[150px]">
                        {referenceId ? (
                          <>
                            <span className="block text-[9px] uppercase text-black/35">
                              {referenceType || 'Reference'}
                            </span>
                            <span className="block font-semibold text-[#1a1a1a] mt-0.5 break-all">
                              {referenceId}
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-4 text-black/60 max-w-[260px]">
                        <span
                          className="block truncate"
                          title={
                            movement.Notes ||
                            movement.Reason ||
                            ''
                          }
                        >
                          {movement.Notes ||
                            movement.Reason ||
                            '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-black/60 font-light whitespace-nowrap">
                        {author || 'System'}
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
  );
};
