import React, { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { formatCurrency, formatDate, parseNumber } from '../utils/formatters';
import { getProductImageUrl } from '../utils/productImages';
import { playCriticalStockAlertChime } from '../utils/audioBeep';
import { Product } from '../types/inventory';
import { ActiveTab } from './Sidebar';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Users,
  DollarSign,
  Truck,
  Receipt,
  PieChart,
  PlusCircle,
  ShoppingCart,
  Building2,
  ArrowRight,
  RotateCw,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Bell,
  Volume2,
  VolumeX,
  Download,
  Eye,
  X,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenQuickAction: (action: string) => void;
}

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
    getCustomerName,
    getSupplierName,
    refreshDashboard,
  } = useInventory();

  const isDashboardLoading = loading.dashboard;
  const dashboardError = errors.dashboard;

  // Notification Drawer & Sound State
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Automated Stock Level Evaluation
  const { outOfStockProducts, criticalLowProducts, allCriticalProducts, totalDeficitCost } = useMemo(() => {
    const outOfStock: Product[] = [];
    const criticalLow: Product[] = [];
    let totalDeficit = 0;

    products.forEach((p) => {
      if (p.Status === 'Archived') return;
      const qty = parseNumber(p.Quantity);
      const reorder = parseNumber(p.ReorderLevel, 5);

      if (qty <= 0) {
        outOfStock.push(p);
        const cost = parseNumber(p.CostPrice);
        totalDeficit += reorder * cost;
      } else if (qty <= reorder) {
        criticalLow.push(p);
        const deficit = Math.max(0, reorder - qty);
        const cost = parseNumber(p.CostPrice);
        totalDeficit += deficit * cost;
      }
    });

    return {
      outOfStockProducts: outOfStock,
      criticalLowProducts: criticalLow,
      allCriticalProducts: [...outOfStock, ...criticalLow],
      totalDeficitCost: totalDeficit,
    };
  }, [products]);

  // Audio advisory chime
  useEffect(() => {
    if (soundEnabled && allCriticalProducts.length > 0) {
      playCriticalStockAlertChime();
    }
  }, [soundEnabled, allCriticalProducts.length]);

  // Export Shortage CSV
  const exportCriticalShortageCSV = () => {
    const headers = ['Product ID', 'SKU', 'Product Name', 'Current Stock', 'Min Threshold', 'Deficit Units', 'Unit Cost Price', 'Est. Restock Total'];
    const rows = allCriticalProducts.map((p) => {
      const current = parseNumber(p.Quantity);
      const reorder = parseNumber(p.ReorderLevel, 5);
      const deficit = Math.max(0, reorder - current);
      const cost = parseNumber(p.CostPrice);
      const restockCost = deficit * cost;
      return [
        p.ProductID,
        `"${p.SKU}"`,
        `"${p.ProductName.replace(/"/g, '""')}"`,
        current,
        reorder,
        deficit,
        cost,
        restockCost,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hardware_Shortage_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Use actual API dashboard data
  const totalProducts = dashboard?.products ?? products.length;
  const stockValue = dashboard?.stockValue ?? 0;
  const lowStockCount = allCriticalProducts.length;
  const todaySales = dashboard?.todaySales ?? 0;
  const totalCustomers = dashboard?.customers ?? 0;
  const totalRevenue = dashboard?.revenue ?? 0;
  const totalPurchases = dashboard?.purchases ?? 0;
  const totalExpenses = dashboard?.expenses ?? 0;
  const estimatedGrossPosition = dashboard?.estimatedGrossPosition ?? (totalRevenue - totalPurchases - totalExpenses);

  // Recent 5 sales
  const recentSales = [...sales].slice(0, 5);

  // Recent 5 purchases
  const recentPurchases = [...purchases].slice(0, 5);

  return (
    <div className="p-4 sm:p-8 lg:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Editorial Header with Photography Backdrop */}
      <div className="relative bg-[#111111] text-[#fcfaf7] p-8 sm:p-12 border border-black/20 shadow-none overflow-hidden rounded-xs">
        {/* Subtle hardware circuit / inventory photography backdrop overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-luminosity pointer-events-none"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80')`
          }}
        />
        <div className="absolute top-0 right-0 w-80 h-full bg-[#252525]/30 -skew-x-12 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-6 h-[1px] bg-white/40" />
              <span className="text-[9px] uppercase tracking-[0.35em] text-white/60 font-medium">
                Volume 26 / Central Command
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif tracking-tight text-white font-normal">
              Inventory & Commercial <span className="italic font-light">Ledger</span>
            </h2>
            <p className="text-xs text-white/70 max-w-md font-light leading-relaxed">
              Enterprise hardware inventory, automated minimum stock surveillance, point of sale register, and real-time asset ledger.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {allCriticalProducts.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAlertDrawerOpen(true)}
                className="px-4 py-3 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-2 transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>{allCriticalProducts.length} Stock Alerts</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('sales')}
              className="px-5 py-3 bg-[#fcfaf7] hover:bg-white text-[#1a1a1a] text-[10px] uppercase tracking-[0.2em] font-semibold border border-transparent hover:border-black/20 flex items-center gap-2.5 transition-all shadow-sm"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-[#1a1a1a]" />
              <span>Launch Point of Sale</span>
            </button>
          </div>
        </div>
      </div>

      {/* Automated Stock Notification System Bar */}
      {allCriticalProducts.length > 0 ? (
        <div className="bg-amber-50/90 border border-amber-300/80 p-4 sm:p-5 rounded-xs transition-all text-[#1a1a1a]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="relative p-2 bg-amber-100 border border-amber-300 rounded-xs text-amber-900 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 text-rose-700" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-rose-800">
                    Automated Stock Alert System
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                    {outOfStockProducts.length} Depleted (Zero Qty)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    {criticalLowProducts.length} Reorder Threshold
                  </span>
                </div>
                <p className="text-xs text-black/75 max-w-2xl font-normal leading-relaxed">
                  Automated telemetry flagged <span className="font-semibold text-rose-900">{allCriticalProducts.length} hardware products</span> reaching or breaching critical minimum stock reserve levels. Estimated replenishment cost to restore baseline reserves: <span className="font-serif font-bold text-[#1a1a1a]">{formatCurrency(totalDeficitCost)}</span>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xs border text-xs transition-colors flex items-center gap-1.5 ${
                  soundEnabled
                    ? 'bg-amber-200 border-amber-400 text-amber-900'
                    : 'bg-white border-black/15 text-black/60 hover:text-black'
                }`}
                title={soundEnabled ? 'Stock Chime: Active' : 'Stock Chime: Muted'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-800" /> : <VolumeX className="w-4 h-4" />}
                <span className="text-[10px] hidden sm:inline">{soundEnabled ? 'Chime On' : 'Muted'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAlertDrawerOpen(true)}
                className="px-3 py-2 bg-white hover:bg-[#fcfaf7] border border-black/20 text-[#1a1a1a] text-[10px] uppercase tracking-wider font-semibold rounded-xs flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Review Deficit ({allCriticalProducts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenQuickAction('newPurchase')}
                className="px-3.5 py-2 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] text-[10px] uppercase tracking-wider font-semibold rounded-xs flex items-center gap-1.5 transition-colors"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Procure Restock</span>
              </button>

              <button
                type="button"
                onClick={exportCriticalShortageCSV}
                className="p-2 bg-white hover:bg-[#fcfaf7] border border-black/20 text-[#1a1a1a] rounded-xs transition-colors"
                title="Export Critical Shortage Audit (.CSV)"
              >
                <Download className="w-4 h-4 text-black/70" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-white border border-black/10 rounded-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-black/70 font-light">
              <span className="font-semibold text-[#1a1a1a]">Stock Reserve Nominal:</span> All active hardware catalog items exceed minimum safety reorder thresholds.
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-black/40">Surveillance Active</span>
        </div>
      )}

      {/* Error alert if dashboard failed */}
      {dashboardError && (
        <div className="p-4 bg-[#f4f0ea] border border-black/15 text-[#1a1a1a] flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold">System Advisory</p>
              <p className="text-xs text-black/70">{dashboardError}</p>
            </div>
          </div>
          <button
            onClick={() => refreshDashboard()}
            className="text-[10px] uppercase tracking-wider font-semibold underline text-[#1a1a1a] hover:opacity-70"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Primary KPI Grid with Stat-Card-Flop Hover Animations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Products */}
        <div className="bg-white p-6 border border-black/10 hover:border-black/30 transition-all flex flex-col justify-between stat-card-flop cursor-default rounded-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">Catalog Volume</span>
            <div className="p-1.5 border border-black/10 bg-[#fcfaf7] text-[#1a1a1a]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-serif text-[#1a1a1a] tracking-tight">
              {isDashboardLoading ? '...' : totalProducts}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-3 h-[1px] bg-black/20" />
              <p className="text-[10px] uppercase tracking-widest text-black/50">Active line items</p>
            </div>
          </div>
        </div>

        {/* Stock Value */}
        <div className="bg-white p-6 border border-black/10 hover:border-black/30 transition-all flex flex-col justify-between stat-card-flop cursor-default rounded-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">Asset Valuation</span>
            <div className="p-1.5 border border-black/10 bg-[#fcfaf7] text-[#1a1a1a]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-serif text-[#1a1a1a] tracking-tight">
              {isDashboardLoading ? '...' : formatCurrency(stockValue)}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-3 h-[1px] bg-black/20" />
              <p className="text-[10px] uppercase tracking-widest text-black/50">Aggregate cost basis</p>
            </div>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div 
          onClick={() => allCriticalProducts.length > 0 && setIsAlertDrawerOpen(true)}
          className={`p-6 border transition-all flex flex-col justify-between stat-card-flop cursor-pointer rounded-xs ${
            allCriticalProducts.length > 0 
              ? 'bg-amber-50/60 border-amber-300 hover:border-amber-500' 
              : 'bg-white border-black/10 hover:border-black/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">Reorder Alert</span>
            <div className={`p-1.5 border ${allCriticalProducts.length > 0 ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-black/10 bg-[#fcfaf7] text-black/40'}`}>
              <AlertTriangle className={`w-4 h-4 ${allCriticalProducts.length > 0 ? 'text-rose-600' : ''}`} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-3xl font-serif tracking-tight ${allCriticalProducts.length > 0 ? 'text-rose-700' : 'text-[#1a1a1a]'}`}>
              {isDashboardLoading ? '...' : lowStockCount}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-3 h-[1px] bg-black/20" />
              <p className="text-[10px] uppercase tracking-widest text-black/50">
                {allCriticalProducts.length > 0 ? 'Breached items (Click details)' : 'Optimal reserves'}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="bg-white p-6 border border-black/10 hover:border-black/30 transition-all flex flex-col justify-between stat-card-flop cursor-default rounded-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">Daily Receipts</span>
            <div className="p-1.5 border border-black/10 bg-[#fcfaf7] text-[#1a1a1a]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-serif text-[#1a1a1a] tracking-tight">
              {isDashboardLoading ? '...' : formatCurrency(todaySales)}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-3 h-[1px] bg-black/20" />
              <p className="text-[10px] uppercase tracking-widest text-black/50">Recorded today</p>
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-6 border border-black/10 hover:border-black/30 transition-all flex flex-col justify-between stat-card-flop cursor-default rounded-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">Client Accounts</span>
            <div className="p-1.5 border border-black/10 bg-[#fcfaf7] text-[#1a1a1a]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-serif text-[#1a1a1a] tracking-tight">
              {isDashboardLoading ? '...' : totalCustomers}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-3 h-[1px] bg-black/20" />
              <p className="text-[10px] uppercase tracking-widest text-black/50">Enterprise & retail</p>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-6 border border-black/10 hover:border-black/30 transition-all flex flex-col justify-between stat-card-flop cursor-default rounded-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">Cumulative Sales</span>
            <div className="p-1.5 border border-black/10 bg-[#fcfaf7] text-[#1a1a1a]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-serif text-[#1a1a1a] tracking-tight">
              {isDashboardLoading ? '...' : formatCurrency(totalRevenue)}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-3 h-[1px] bg-black/20" />
              <p className="text-[10px] uppercase tracking-widest text-black/50">Historical invoicing</p>
            </div>
          </div>
        </div>

        {/* Total Purchases */}
        <div className="bg-white p-6 border border-black/10 hover:border-black/30 transition-all flex flex-col justify-between stat-card-flop cursor-default rounded-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">Procurement Spend</span>
            <div className="p-1.5 border border-black/10 bg-[#fcfaf7] text-[#1a1a1a]">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-serif text-[#1a1a1a] tracking-tight">
              {isDashboardLoading ? '...' : formatCurrency(totalPurchases)}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-3 h-[1px] bg-black/20" />
              <p className="text-[10px] uppercase tracking-widest text-black/50">Supplier order total</p>
            </div>
          </div>
        </div>

        {/* Estimated Gross Position */}
        <div className="bg-white p-6 border border-black/10 hover:border-black/30 transition-all flex flex-col justify-between stat-card-flop cursor-default rounded-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">Operating Surplus</span>
            <div className="p-1.5 border border-black/10 bg-[#fcfaf7] text-[#1a1a1a]">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-serif tracking-tight ${estimatedGrossPosition >= 0 ? 'text-[#1a1a1a]' : 'text-rose-700'}`}>
              {isDashboardLoading ? '...' : formatCurrency(estimatedGrossPosition)}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-3 h-[1px] bg-black/20" />
              <p className="text-[10px] uppercase tracking-widest text-black/50">Revenue less outflows</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white p-6 border border-black/10 shadow-none">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-4 h-[1px] bg-black" />
          <h4 className="text-[10px] uppercase tracking-[0.25em] font-semibold text-black/60">
            Operations & Actions
          </h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => onOpenQuickAction('addProduct')}
            className="flex flex-col items-center justify-center p-4 border border-black/10 hover:border-black bg-white hover:bg-[#fcfaf7] text-[#1a1a1a] transition-all text-center group"
          >
            <PlusCircle className="w-4 h-4 text-[#1a1a1a] mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase tracking-[0.15em] font-medium">Add Product</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('sales')}
            className="flex flex-col items-center justify-center p-4 border border-black/10 hover:border-black bg-white hover:bg-[#fcfaf7] text-[#1a1a1a] transition-all text-center group"
          >
            <ShoppingCart className="w-4 h-4 text-[#1a1a1a] mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase tracking-[0.15em] font-medium">New Sale / POS</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAction('newPurchase')}
            className="flex flex-col items-center justify-center p-4 border border-black/10 hover:border-black bg-white hover:bg-[#fcfaf7] text-[#1a1a1a] transition-all text-center group"
          >
            <Truck className="w-4 h-4 text-[#1a1a1a] mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase tracking-[0.15em] font-medium">New Purchase</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAction('addCustomer')}
            className="flex flex-col items-center justify-center p-4 border border-black/10 hover:border-black bg-white hover:bg-[#fcfaf7] text-[#1a1a1a] transition-all text-center group"
          >
            <Users className="w-4 h-4 text-[#1a1a1a] mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase tracking-[0.15em] font-medium">Add Customer</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAction('addSupplier')}
            className="flex flex-col items-center justify-center p-4 border border-black/10 hover:border-black bg-white hover:bg-[#fcfaf7] text-[#1a1a1a] transition-all text-center group"
          >
            <Building2 className="w-4 h-4 text-[#1a1a1a] mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase tracking-[0.15em] font-medium">Add Supplier</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAction('addExpense')}
            className="flex flex-col items-center justify-center p-4 border border-black/10 hover:border-black bg-white hover:bg-[#fcfaf7] text-[#1a1a1a] transition-all text-center group"
          >
            <Receipt className="w-4 h-4 text-[#1a1a1a] mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase tracking-[0.15em] font-medium">Add Expense</span>
          </button>
        </div>
      </div>

      {/* Main Content Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Sales */}
        <div className="bg-white p-6 border border-black/10 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <div>
                <span className="text-[9px] uppercase tracking-[0.25em] text-black/40 font-medium">Chronicle</span>
                <h3 className="text-base font-serif text-[#1a1a1a] tracking-tight font-semibold">Recent Sales Orders</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('sales')}
                className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#1a1a1a] hover:underline flex items-center gap-1.5"
              >
                <span>POS Registry</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-black/5 mt-3">
              {recentSales.length === 0 ? (
                <div className="py-8 text-center text-black/40 text-xs font-light">
                  No sales recorded yet. Process your first sale in POS.
                </div>
              ) : (
                recentSales.map((sale) => (
                  <div key={sale.SaleID} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1a1a1a] truncate font-mono">
                        {sale.InvoiceNumber || sale.SaleID}
                      </p>
                      <p className="text-[11px] text-black/50">
                        {getCustomerName(sale.CustomerID)} • {formatDate(sale.SaleDate || sale.CreatedAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-serif font-bold text-[#1a1a1a]">
                        {formatCurrency(sale.TotalAmount)}
                      </p>
                      <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider font-semibold border border-black/15 px-2 py-0.5 rounded-full bg-[#fcfaf7] text-[#1a1a1a]">
                        {sale.PaymentStatus || 'Paid'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Watchlist with Hardware Photography */}
        <div className="bg-white p-6 border border-black/10 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <div>
                <span className="text-[9px] uppercase tracking-[0.25em] text-black/40 font-medium">Inventory Focus</span>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-serif text-[#1a1a1a] tracking-tight font-semibold">Low Stock Watchlist</h3>
                  {allCriticalProducts.length > 0 && (
                    <span className="border border-black/20 px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-[#1a1a1a] text-white">
                      {allCriticalProducts.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {allCriticalProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAlertDrawerOpen(true)}
                    className="text-[10px] uppercase tracking-[0.15em] font-semibold text-rose-700 hover:underline flex items-center gap-1"
                  >
                    <span>Full Audit</span>
                    <Eye className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate('products')}
                  className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#1a1a1a] hover:underline flex items-center gap-1.5"
                >
                  <span>Catalog</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-black/5 mt-3">
              {allCriticalProducts.length === 0 ? (
                <div className="py-12 text-center text-black/60 text-xs flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <span className="font-serif font-semibold text-[#1a1a1a]">Healthy Reserve Levels</span>
                  <span className="text-[11px] text-black/40 font-light max-w-xs">
                    All hardware inventory lines exceed minimum safety stock reorder thresholds.
                  </span>
                </div>
              ) : (
                allCriticalProducts.slice(0, 5).map((prod) => {
                  const qty = parseNumber(prod.Quantity);
                  const isOut = qty <= 0;
                  const reorder = parseNumber(prod.ReorderLevel, 5);
                  const percent = Math.min(100, Math.round((Math.max(0, qty) / Math.max(1, reorder)) * 100));
                  const imageUrl = getProductImageUrl(prod.ProductImage, prod.ProductName, undefined, prod.Model);

                  return (
                    <div key={prod.ProductID} className="py-3 flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={imageUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-xs object-cover border border-black/10 bg-[#f4f0ea] shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#1a1a1a] truncate">
                            {prod.ProductName}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-black/50 mt-0.5">
                            <span className="font-mono">{prod.SKU}</span>
                            <span>•</span>
                            <span>Min: {reorder}</span>
                          </div>
                          {/* Stock ratio meter */}
                          <div className="w-full bg-[#f4f0ea] h-1.5 rounded-full overflow-hidden mt-1.5 border border-black/5">
                            <div
                              className={`h-full transition-all ${
                                isOut ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <span className={`inline-block text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${
                          isOut ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-amber-300 bg-amber-50 text-amber-900'
                        }`}>
                          {isOut ? 'Depleted (0)' : `${qty} remaining`}
                        </span>
                        <div>
                          <button
                            type="button"
                            onClick={() => onOpenQuickAction('newPurchase')}
                            className="text-[9px] uppercase tracking-wider font-semibold text-black/60 hover:text-black underline"
                          >
                            + Reorder
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Purchases Section */}
      <div className="bg-white p-6 border border-black/10 shadow-none">
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <div>
            <span className="text-[9px] uppercase tracking-[0.25em] text-black/40 font-medium">Supply Chain</span>
            <h3 className="text-base font-serif text-[#1a1a1a] tracking-tight font-semibold">Recent Hardware Intake & Procurement</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('purchases')}
            className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#1a1a1a] hover:underline flex items-center gap-1.5"
          >
            <span>Procurement Archive</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-black/50 border-b border-black/10 text-[9px] uppercase tracking-[0.2em] font-medium">
                <th className="pb-2.5">Intake Ref #</th>
                <th className="pb-2.5">Vendor / Supplier</th>
                <th className="pb-2.5">Log Date</th>
                <th className="pb-2.5">Invoice Sum</th>
                <th className="pb-2.5">Payment State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-[#1a1a1a]">
              {recentPurchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-black/40 font-light">
                    No purchase intake orders recorded yet.
                  </td>
                </tr>
              ) : (
                recentPurchases.map((pur) => (
                  <tr key={pur.PurchaseID} className="hover:bg-[#fcfaf7]">
                    <td className="py-3 font-mono font-medium text-[#1a1a1a]">{pur.PurchaseNumber || pur.PurchaseID}</td>
                    <td className="py-3 font-medium">{getSupplierName(pur.SupplierID)}</td>
                    <td className="py-3 text-black/50">{formatDate(pur.PurchaseDate || pur.CreatedAt)}</td>
                    <td className="py-3 font-serif font-bold text-[#1a1a1a]">{formatCurrency(pur.TotalAmount)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold border border-black/15 bg-[#fcfaf7] text-black/70">
                        {pur.PaymentStatus || 'Paid'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical Stock Deficit Audit Modal Drawer */}
      {isAlertDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[85vh] bg-white rounded-xs shadow-2xl border border-black/20 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-[#1a1a1a] text-white flex items-center justify-between border-b border-black/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-950 border border-rose-500/50 rounded-xs text-rose-300">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-[0.3em] text-white/50 font-medium">
                    Automated Surveillance Telemetry
                  </span>
                  <h3 className="text-base font-serif font-bold tracking-tight text-white">
                    Critical Minimum Stock Deficit Audit ({allCriticalProducts.length} Items)
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportCriticalShortageCSV}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAlertDrawerOpen(false)}
                  className="p-1.5 text-white/60 hover:text-white rounded-xs"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Financial replenishment summary */}
            <div className="p-4 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wider font-bold text-amber-900">
                  Total Replenishment Capital Required
                </p>
                <p className="text-base font-serif font-bold text-[#1a1a1a]">
                  {formatCurrency(totalDeficitCost)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-black/70">
                <span>
                  <strong>{outOfStockProducts.length}</strong> Zero Stock Depleted
                </span>
                <span>•</span>
                <span>
                  <strong>{criticalLowProducts.length}</strong> Safety Threshold Breached
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAlertDrawerOpen(false);
                  onOpenQuickAction('newPurchase');
                }}
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Create Purchase Order</span>
              </button>
            </div>

            {/* Product Deficit Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-black/10 text-black/50 text-[9px] uppercase tracking-[0.2em] font-medium">
                    <th className="pb-3">Hardware Product</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-right">Current Stock</th>
                    <th className="pb-3 text-right">Reorder Limit</th>
                    <th className="pb-3 text-right">Deficit</th>
                    <th className="pb-3 text-right">Unit Cost</th>
                    <th className="pb-3 text-right">Restock Cost</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {allCriticalProducts.map((p) => {
                    const current = parseNumber(p.Quantity);
                    const isOut = current <= 0;
                    const reorder = parseNumber(p.ReorderLevel, 5);
                    const deficit = Math.max(0, reorder - current);
                    const cost = parseNumber(p.CostPrice);
                    const estRestockCost = deficit * cost;
                    const imgUrl = getProductImageUrl(p.ProductImage, p.ProductName, undefined, p.Model);

                    return (
                      <tr key={p.ProductID} className="hover:bg-[#fcfaf7] transition-colors">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={imgUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xs object-cover border border-black/10 bg-[#f4f0ea] shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-[#1a1a1a] truncate max-w-xs">{p.ProductName}</p>
                              <p className="text-[10px] text-black/50 font-mono">SKU: {p.SKU}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold border ${
                              isOut
                                ? 'border-rose-300 bg-rose-50 text-rose-800'
                                : 'border-amber-300 bg-amber-50 text-amber-900'
                            }`}
                          >
                            {isOut ? 'Depleted' : 'Low Stock'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-[#1a1a1a]">
                          {current}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-black/60">
                          {reorder}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-rose-700">
                          +{deficit}
                        </td>
                        <td className="py-3 px-2 text-right font-serif text-black/70">
                          {formatCurrency(cost)}
                        </td>
                        <td className="py-3 px-2 text-right font-serif font-bold text-[#1a1a1a]">
                          {formatCurrency(estRestockCost)}
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAlertDrawerOpen(false);
                              onOpenQuickAction('newPurchase');
                            }}
                            className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] rounded-xs text-[9px] uppercase tracking-wider font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Procure</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#fcfaf7] border-t border-black/10 flex items-center justify-between text-xs">
              <span className="text-black/50 text-[11px]">
                Threshold calculation dynamically synced with real-time catalog quantity.
              </span>
              <button
                type="button"
                onClick={() => setIsAlertDrawerOpen(false)}
                className="px-4 py-2 border border-black/15 hover:bg-[#f4f0ea] rounded-xs text-[10px] uppercase tracking-wider font-semibold text-[#1a1a1a]"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
