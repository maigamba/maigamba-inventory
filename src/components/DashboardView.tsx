import React, { useEffect, useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { formatCurrency, formatDate, parseNumber } from '../utils/formatters';
import { getProductImageUrl } from '../utils/productImages';
import { playCriticalStockAlertChime } from '../utils/audioBeep';
import { Product } from '../types/inventory';
import { ActiveTab } from './Sidebar';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Cpu,
  DollarSign,
  Download,
  Eye,
  Package,
  PieChart,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  Truck,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenQuickAction: (action: string) => void;
}

type RangeKey = '7d' | '30d' | '90d';

const safeDate = (value?: string) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const getSaleTotal = (sale: any) =>
  parseNumber(sale?.TotalAmount ?? sale?.totalAmount ?? 0);

const getSaleDate = (sale: any) =>
  sale?.SaleDate ?? sale?.saleDate ?? sale?.CreatedAt ?? sale?.createdAt;

const getSaleId = (sale: any) =>
  String(sale?.SaleID ?? sale?.saleId ?? sale?.id ?? '').trim();

const getSaleInvoice = (sale: any) =>
  String(sale?.InvoiceNumber ?? sale?.invoiceNumber ?? getSaleId(sale)).trim();

const getSaleCustomerId = (sale: any) =>
  String(sale?.CustomerID ?? sale?.customerId ?? '').trim();

const getPurchaseTotal = (purchase: any) =>
  parseNumber(purchase?.TotalAmount ?? purchase?.totalAmount ?? 0);

const getPurchaseDate = (purchase: any) =>
  purchase?.PurchaseDate ?? purchase?.purchaseDate ?? purchase?.CreatedAt ?? purchase?.createdAt;

const getPurchaseId = (purchase: any) =>
  String(purchase?.PurchaseID ?? purchase?.purchaseId ?? purchase?.id ?? '').trim();

const getPurchaseNumber = (purchase: any) =>
  String(purchase?.PurchaseNumber ?? purchase?.purchaseNumber ?? getPurchaseId(purchase)).trim();

const getPurchaseSupplierId = (purchase: any) =>
  String(purchase?.SupplierID ?? purchase?.supplierId ?? '').trim();

const getPurchaseStatus = (purchase: any) =>
  String(purchase?.PaymentStatus ?? purchase?.paymentStatus ?? 'Paid').trim();

const currencyCompact = (value: number) =>
  formatCurrency(value).replace(/\.00$/, '');

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenQuickAction,
}) => {
  const {
    dashboard,
    loading,
    errors,
    products,
    sales,
    purchases,
    customers,
    getCustomerName,
    getSupplierName,
    refreshDashboard,
  } = useInventory();

  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [range, setRange] = useState<RangeKey>('30d');

  const isDashboardLoading = Boolean(loading.dashboard);
  const dashboardError = errors.dashboard;

  const {
    outOfStockProducts,
    criticalLowProducts,
    allCriticalProducts,
    totalDeficitCost,
  } = useMemo(() => {
    const outOfStock: Product[] = [];
    const criticalLow: Product[] = [];
    let totalDeficit = 0;

    products.forEach((product) => {
      if (product.Status === 'Archived') return;

      const qty = parseNumber(product.Quantity);
      const reorder = parseNumber(product.ReorderLevel, 5);
      const cost = parseNumber(product.CostPrice);

      if (qty <= 0) {
        outOfStock.push(product);
        totalDeficit += Math.max(0, reorder) * cost;
      } else if (qty <= reorder) {
        criticalLow.push(product);
        totalDeficit += Math.max(0, reorder - qty) * cost;
      }
    });

    return {
      outOfStockProducts: outOfStock,
      criticalLowProducts: criticalLow,
      allCriticalProducts: [...outOfStock, ...criticalLow],
      totalDeficitCost: totalDeficit,
    };
  }, [products]);

  useEffect(() => {
    if (soundEnabled && allCriticalProducts.length > 0) {
      playCriticalStockAlertChime();
    }
  }, [allCriticalProducts.length, soundEnabled]);

  const exportCriticalShortageCSV = () => {
    const headers = [
      'Product ID',
      'SKU',
      'Product Name',
      'Current Stock',
      'Min Threshold',
      'Deficit Units',
      'Unit Cost Price',
      'Est. Restock Total',
    ];

    const rows = allCriticalProducts.map((product) => {
      const current = parseNumber(product.Quantity);
      const reorder = parseNumber(product.ReorderLevel, 5);
      const deficit = Math.max(0, reorder - current);
      const cost = parseNumber(product.CostPrice);
      const restockCost = deficit * cost;

      return [
        product.ProductID,
        `"${product.SKU}"`,
        `"${product.ProductName.replace(/"/g, '""')}"`,
        current,
        reorder,
        deficit,
        cost,
        restockCost,
      ].join(',');
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute(
      'download',
      `Hardware_Shortage_Audit_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalProducts = dashboard?.products ?? products.length;
  const stockValue = dashboard?.stockValue ?? 0;
  const lowStockCount = allCriticalProducts.length;
  const todaySales = dashboard?.todaySales ?? 0;
  const totalCustomers = dashboard?.customers ?? customers.length;
  const totalRevenue = dashboard?.revenue ?? 0;
  const totalPurchases = dashboard?.purchases ?? 0;
  const totalExpenses = dashboard?.expenses ?? 0;
  const estimatedGrossPosition =
    dashboard?.estimatedGrossPosition ??
    (totalRevenue - totalPurchases - totalExpenses);

  const sortedSales = useMemo(
    () =>
      [...sales].sort(
        (a: any, b: any) => safeDate(getSaleDate(b)) - safeDate(getSaleDate(a)),
      ),
    [sales],
  );

  const sortedPurchases = useMemo(
    () =>
      [...purchases].sort(
        (a: any, b: any) =>
          safeDate(getPurchaseDate(b)) - safeDate(getPurchaseDate(a)),
      ),
    [purchases],
  );

  const recentSales = sortedSales.slice(0, 5);
  const recentPurchases = sortedPurchases.slice(0, 5);

  const rangeDays = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const rangeStart = Date.now() - rangeDays * 24 * 60 * 60 * 1000;

  const salesInRange = useMemo(
    () =>
      sortedSales.filter((sale: any) => {
        const date = safeDate(getSaleDate(sale));
        return date >= rangeStart;
      }),
    [rangeStart, sortedSales],
  );

  const salesByCustomer = useMemo(() => {
    const totals = new Map<
      string,
      { customerId: string; amount: number; orders: number }
    >();

    sales.forEach((sale: any) => {
      const customerId = getSaleCustomerId(sale);
      if (!customerId) return;

      const previous = totals.get(customerId) ?? {
        customerId,
        amount: 0,
        orders: 0,
      };

      previous.amount += getSaleTotal(sale);
      previous.orders += 1;
      totals.set(customerId, previous);
    });

    return [...totals.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [sales]);

  const dailySeries = useMemo(() => {
    const buckets = new Map<string, number>();

    salesInRange.forEach((sale: any) => {
      const raw = getSaleDate(sale);
      if (!raw) return;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      });
      buckets.set(key, (buckets.get(key) ?? 0) + getSaleTotal(sale));
    });

    const entries = [...buckets.entries()].slice(-8);
    const max = Math.max(...entries.map(([, value]) => value), 1);

    return entries.map(([label, value]) => ({
      label,
      value,
      percent: Math.max(6, Math.round((value / max) * 100)),
    }));
  }, [salesInRange]);

  const countryDataAvailable = useMemo(
    () =>
      customers.some((customer: any) =>
        Boolean(customer?.Country ?? customer?.country),
      ),
    [customers],
  );

  const quickActions = [
    {
      label: 'New Sale',
      description: 'Open POS',
      icon: ShoppingCart,
      action: () => onOpenQuickAction('new-sale'),
    },
    {
      label: 'New Purchase',
      description: 'Restock inventory',
      icon: Truck,
      action: () => onOpenQuickAction('new-purchase'),
    },
    {
      label: 'Add Product',
      description: 'Catalog item',
      icon: Package,
      action: () => onOpenQuickAction('add-product'),
    },
    {
      label: 'Add Customer',
      description: 'Create account',
      icon: Users,
      action: () => onOpenQuickAction('add-customer'),
    },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        {/* Header */}
        <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Maigamba Inventory • Operations Center
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">
                Good business starts with a clear view of stock, sales and cash.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Monitor inventory health, daily sales, procurement activity and
                customer performance from one operating dashboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {allCriticalProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAlertDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
                >
                  <Bell className="h-4 w-4" />
                  {allCriticalProducts.length} stock alerts
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate('sales')}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                <ShoppingCart className="h-4 w-4" />
                Open POS
              </button>
            </div>
          </div>
        </section>

        {/* Stock alert */}
        {allCriticalProducts.length > 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex gap-3">
                <div className="mt-0.5 rounded-xl bg-rose-100 p-2.5 text-rose-700">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-amber-950">
                      Inventory needs attention
                    </p>
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                      {outOfStockProducts.length} out of stock
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                      {criticalLowProducts.length} at reorder level
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-amber-900/70">
                    Estimated capital required to restore minimum reserve:
                    <span className="ml-1 font-semibold text-amber-950">
                      {formatCurrency(totalDeficitCost)}
                    </span>
                    .
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsAlertDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 transition hover:bg-amber-50"
                >
                  <Eye className="h-4 w-4" />
                  Review
                </button>
                <button
                  type="button"
                  onClick={() => onOpenQuickAction('new-purchase')}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Truck className="h-4 w-4" />
                  Restock
                </button>
                <button
                  type="button"
                  onClick={() => setSoundEnabled((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-amber-50"
                  title={soundEnabled ? 'Mute stock alerts' : 'Enable stock alert sound'}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {soundEnabled ? 'Sound on' : 'Muted'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={exportCriticalShortageCSV}
                  className="rounded-xl border border-amber-300 bg-white p-2.5 text-slate-700 transition hover:bg-amber-50"
                  title="Export shortage audit"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white p-2 text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  Inventory is within safety levels
                </p>
                <p className="text-xs text-emerald-900/70">
                  No active products are currently below their reorder threshold.
                </p>
              </div>
            </div>
            <span className="hidden text-xs font-semibold text-emerald-700 sm:block">
              Stock monitoring active
            </span>
          </section>
        )}

        {dashboardError && (
          <section className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" />
              <div>
                <p className="text-sm font-semibold text-rose-950">
                  Dashboard sync issue
                </p>
                <p className="text-sm text-rose-800/80">{dashboardError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refreshDashboard()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-rose-800 ring-1 ring-rose-200 transition hover:bg-rose-50"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </section>
        )}

        {/* KPI cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total products',
              value: totalProducts,
              helper: 'Active catalog items',
              icon: Package,
              tone: 'text-blue-600 bg-blue-50',
            },
            {
              label: 'Stock value',
              value: formatCurrency(stockValue),
              helper: 'Current cost basis',
              icon: PieChart,
              tone: 'text-violet-600 bg-violet-50',
            },
            {
              label: 'Sales today',
              value: formatCurrency(todaySales),
              helper: 'Recorded today',
              icon: DollarSign,
              tone: 'text-emerald-600 bg-emerald-50',
            },
            {
              label: 'Low stock',
              value: lowStockCount,
              helper: lowStockCount ? 'Needs action' : 'Healthy reserves',
              icon: AlertTriangle,
              tone: lowStockCount
                ? 'text-rose-600 bg-rose-50'
                : 'text-slate-600 bg-slate-100',
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{card.label}</p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                      {isDashboardLoading ? '—' : card.value}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{card.helper}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Business snapshot */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[
            {
              label: 'Total revenue',
              value: formatCurrency(totalRevenue),
              helper: 'Historical invoicing',
              icon: ArrowUpRight,
            },
            {
              label: 'Procurement spend',
              value: formatCurrency(totalPurchases),
              helper: 'Supplier order total',
              icon: Truck,
            },
            {
              label: 'Operating position',
              value: formatCurrency(estimatedGrossPosition),
              helper: 'Revenue less purchases and expenses',
              icon: ClipboardList,
              negative: estimatedGrossPosition < 0,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{card.label}</p>
                    <p
                      className={`mt-1 text-xl font-semibold ${card.negative ? 'text-rose-700' : 'text-slate-950'
                        }`}
                    >
                      {isDashboardLoading ? '—' : card.value}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">{card.helper}</p>
              </div>
            );
          })}
        </section>

        {/* Chart + quick actions */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingIcon />
                  <h2 className="text-base font-semibold text-slate-950">
                    Sales activity
                  </h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Real sales recorded in the selected period.
                </p>
              </div>

              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                {([
                  ['7d', '7 days'],
                  ['30d', '30 days'],
                  ['90d', '90 days'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRange(key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === key
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              {dailySeries.length === 0 ? (
                <div className="flex min-h-[210px] items-center justify-center rounded-2xl bg-slate-50">
                  <div className="text-center">
                    <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      No sales in this period
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid min-h-[220px] grid-cols-8 items-end gap-2 rounded-2xl bg-slate-50 p-4 sm:gap-3">
                  {dailySeries.map((point) => (
                    <div key={point.label} className="flex h-full flex-col items-center justify-end gap-2">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-xl bg-slate-900 transition-all hover:bg-blue-600"
                          style={{ height: `${point.percent}%` }}
                          title={formatCurrency(point.value)}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500">
                        {point.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Quick actions
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-950">
                  Common tasks
                </h2>
              </div>
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <Plus className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-700 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.label}
                      </p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Top customers + country */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Customer intelligence
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-950">
                  Top customers
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ranked by recorded sales value.
                </p>
              </div>
              <Users className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-5 space-y-3">
              {salesByCustomer.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No customer sales data yet.
                </div>
              ) : (
                salesByCustomer.map((entry, index) => (
                  <div
                    key={entry.customerId}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {getCustomerName(entry.customerId) || 'Walk-in customer'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {entry.orders} order{entry.orders === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-950">
                      {currencyCompact(entry.amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Buyer geography
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-950">
                  Top countries of buyers
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This section will use the real Country field from customer records.
                </p>
              </div>
              <Cpu className="h-5 w-5 text-slate-400" />
            </div>

            {!countryDataAvailable ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <div className="mx-auto flex max-w-md flex-col items-center text-center">
                  <div className="rounded-xl bg-white p-3 text-slate-500 shadow-sm">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    Country data is not yet configured
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Existing customer records do not currently provide a country.
                    We will add the field to customer records before calculating this
                    ranking, so no location data is fabricated.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('customers')}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Manage customers
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
                Country analytics are ready once customer country values are available
                in the API response.
              </div>
            )}
          </div>
        </section>

        {/* Recent activity */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ActivityCard
            title="Recent sales"
            eyebrow="Sales"
            actionLabel="Open sales"
            onAction={() => onNavigate('sales')}
          >
            {recentSales.length === 0 ? (
              <EmptyActivity icon={ShoppingCart} text="No sales recorded yet." />
            ) : (
              recentSales.map((sale: any) => (
                <div
                  key={getSaleId(sale)}
                  className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"
                >
                  <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {getSaleInvoice(sale)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {getCustomerName(getSaleCustomerId(sale)) || 'Walk-in customer'} •{' '}
                      {formatDate(getSaleDate(sale))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-950">
                      {formatCurrency(getSaleTotal(sale))}
                    </p>
                    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {sale?.PaymentStatus ?? sale?.paymentStatus ?? 'Paid'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </ActivityCard>

          <ActivityCard
            title="Recent procurement"
            eyebrow="Supply chain"
            actionLabel="Open purchases"
            onAction={() => onNavigate('purchases')}
          >
            {recentPurchases.length === 0 ? (
              <EmptyActivity icon={Truck} text="No purchases recorded yet." />
            ) : (
              recentPurchases.map((purchase: any) => (
                <div
                  key={getPurchaseId(purchase)}
                  className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"
                >
                  <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {getPurchaseNumber(purchase)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {getSupplierName(getPurchaseSupplierId(purchase)) || 'Supplier not linked'} •{' '}
                      {formatDate(getPurchaseDate(purchase))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-950">
                      {formatCurrency(getPurchaseTotal(purchase))}
                    </p>
                    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {getPurchaseStatus(purchase)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </ActivityCard>
        </section>

        {/* Low stock */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Inventory focus
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-950">
                Low stock watchlist
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate('products')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open catalog
                <ArrowRight className="h-4 w-4" />
              </button>
              {allCriticalProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAlertDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Review {allCriticalProducts.length}
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-2 p-4 sm:p-5">
            {allCriticalProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 px-4 py-12 text-center">
                <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  Healthy reserve levels
                </p>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  All active hardware products are above their current minimum
                  reorder levels.
                </p>
              </div>
            ) : (
              allCriticalProducts.slice(0, 6).map((product) => {
                const qty = parseNumber(product.Quantity);
                const reorder = parseNumber(product.ReorderLevel, 5);
                const percent = Math.min(
                  100,
                  Math.round(
                    (Math.max(0, qty) / Math.max(1, reorder)) * 100,
                  ),
                );
                const isOut = qty <= 0;
                const imageUrl = getProductImageUrl(
                  product.ProductImage,
                  product.ProductName,
                  undefined,
                  product.Model,
                );

                return (
                  <div
                    key={product.ProductID}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50"
                  >
                    <img
                      src={imageUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-xl border border-slate-200 bg-slate-100 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {product.ProductName}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {product.SKU} • Minimum {reorder}
                          </p>
                        </div>
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${isOut
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-800'
                            }`}
                        >
                          {isOut ? 'Out of stock' : `${qty} remaining`}
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${isOut ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          style={{ width: `${Math.max(4, percent)}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenQuickAction('new-purchase')}
                      className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
                    >
                      Reorder
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Customer / operations snapshot */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoTile
            icon={Users}
            title="Customers"
            value={String(totalCustomers)}
            description="Active customer accounts"
            onClick={() => onNavigate('customers')}
          />
          <InfoTile
            icon={Truck}
            title="Purchases"
            value={String(purchases.length)}
            description="Purchase records currently loaded"
            onClick={() => onNavigate('purchases')}
          />
          <InfoTile
            icon={Clock3}
            title="Last sync"
            value={loading.dashboard ? 'Syncing…' : 'Live'}
            description="Dashboard data from the inventory API"
            onClick={() => refreshDashboard()}
          />
        </section>
      </div>

      {/* Stock audit drawer */}
      {isAlertDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Critical stock audit"
        >
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-950 p-5 text-white sm:p-6">
              <div className="flex gap-3">
                <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-300">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Inventory audit
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    Critical stock deficit
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {allCriticalProducts.length} item
                    {allCriticalProducts.length === 1 ? '' : 's'} need
                    {allCriticalProducts.length === 1 ? 's' : ''} attention.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportCriticalShortageCSV}
                  className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <button
                  type="button"
                  onClick={() => setIsAlertDrawerOpen(false)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close stock audit"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50 p-4 sm:grid-cols-3 sm:p-5">
              <SummaryMini
                label="Restock capital"
                value={formatCurrency(totalDeficitCost)}
              />
              <SummaryMini
                label="Out of stock"
                value={String(outOfStockProducts.length)}
              />
              <SummaryMini
                label="At threshold"
                value={String(criticalLowProducts.length)}
              />
            </div>

            <div className="flex-1 overflow-auto p-4 sm:p-6">
              <div className="min-w-[820px] overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Stock</th>
                      <th className="px-4 py-3 text-right font-semibold">Minimum</th>
                      <th className="px-4 py-3 text-right font-semibold">Deficit</th>
                      <th className="px-4 py-3 text-right font-semibold">Unit cost</th>
                      <th className="px-4 py-3 text-right font-semibold">Restock</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allCriticalProducts.map((product) => {
                      const current = parseNumber(product.Quantity);
                      const reorder = parseNumber(product.ReorderLevel, 5);
                      const deficit = Math.max(0, reorder - current);
                      const cost = parseNumber(product.CostPrice);
                      const isOut = current <= 0;
                      const imageUrl = getProductImageUrl(
                        product.ProductImage,
                        product.ProductName,
                        undefined,
                        product.Model,
                      );

                      return (
                        <tr
                          key={product.ProductID}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={imageUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="h-10 w-10 rounded-xl border border-slate-200 object-cover"
                              />
                              <div className="min-w-0">
                                <p className="max-w-xs truncate font-semibold text-slate-900">
                                  {product.ProductName}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  SKU {product.SKU}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isOut
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-800'
                                }`}
                            >
                              {isOut ? 'Depleted' : 'Low stock'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {current}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            {reorder}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-rose-700">
                            {deficit}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatCurrency(cost)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-950">
                            {formatCurrency(deficit * cost)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAlertDrawerOpen(false);
                                onOpenQuickAction('new-purchase');
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              Procure
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <p className="text-xs text-slate-500">
                Calculations use current product quantity, reorder level and cost price.
              </p>
              <button
                type="button"
                onClick={() => setIsAlertDrawerOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TrendingIcon: React.FC = () => (
  <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
    <ArrowUpRight className="h-4 w-4" />
  </div>
);

interface ActivityCardProps {
  title: string;
  eyebrow: string;
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  title,
  eyebrow,
  actionLabel,
  onAction,
  children,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-950">{title}</h2>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-950"
      >
        {actionLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
    <div className="mt-4">{children}</div>
  </div>
);

const EmptyActivity: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}> = ({ icon: Icon, text }) => (
  <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center">
    <Icon className="mx-auto h-7 w-7 text-slate-300" />
    <p className="mt-2 text-sm text-slate-500">{text}</p>
  </div>
);

const SummaryMini: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
  </div>
);

const InfoTile: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  description: string;
  onClick: () => void;
}> = ({ icon: Icon, title, value, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
  >
    <div className="flex items-center justify-between">
      <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <ArrowRight className="h-4 w-4 text-slate-300" />
    </div>
    <p className="mt-4 text-sm font-medium text-slate-500">{title}</p>
    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{description}</p>
  </button>
);
