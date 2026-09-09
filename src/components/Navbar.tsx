import React from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Menu,
  RotateCw,
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  LogOut,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface NavbarProps {
  activeTab: ActiveTab;
  onOpenMobileSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Business Overview', subtitle: 'Real-time performance and financial health' },
  products: { title: 'Product Inventory', subtitle: 'Laptops, computers, parts & hardware catalog' },
  categories: { title: 'Categories', subtitle: 'Groupings for computers, parts and electronics' },
  brands: { title: 'Brands', subtitle: 'HP, Dell, Lenovo, Apple, Asus, etc.' },
  stockMovements: { title: 'Stock Movement History', subtitle: 'Full audit of stock additions, sales, and adjustments' },
  sales: { title: 'Point of Sale (POS)', subtitle: 'Checkout, customer billing, and invoice creation' },
  customers: { title: 'Customers', subtitle: 'Client records, contact details and credit balances' },
  returns: { title: 'Returns & RMA', subtitle: 'Customer item returns, refunds, and restock handling' },
  purchases: { title: 'Purchase Orders', subtitle: 'Stock intake and supplier procurement records' },
  suppliers: { title: 'Suppliers & Vendors', subtitle: 'Hardware distributors and wholesale vendor accounts' },
  expenses: { title: 'Business Expenses', subtitle: 'Store overhead, repairs, utilities, and daily operations' },
  reports: { title: 'Analytics & Financial Reports', subtitle: 'Comprehensive statements, margin reviews, and CSV exports' },
  users: { title: 'User Management', subtitle: 'Staff accounts, roles, and administrative permissions' },
  auditLogs: { title: 'System Audit Logs', subtitle: 'Complete chronological history of changes and operations' },
  settings: { title: 'System Settings', subtitle: 'Business identity, currency, timezones, and reorder levels' },
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onOpenMobileSidebar,
  searchQuery,
  setSearchQuery,
}) => {
  const {
    currentUser,
    logout,
    refreshAll,
    isGlobalRefreshing,
    lastUpdated,
    dashboard,
  } = useInventory();

  const tabInfo = TAB_TITLES[activeTab] || { title: 'Maigamba Inventory', subtitle: 'Computer Technology' };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-h-[56px] items-center justify-between gap-3">
        {/* Left: mobile menu + page identity */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 lg:hidden"
            aria-label="Open Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="hidden h-2 w-2 rounded-full bg-slate-950 sm:block" />
              <h1 className="truncate text-base font-bold tracking-tight text-slate-950 sm:text-xl">
                {tabInfo.title}
              </h1>
            </div>
            <p className="mt-0.5 hidden truncate text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 sm:block">
              {tabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Center: global search */}
        <div className="hidden flex-1 justify-center px-4 md:flex">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-16 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Clear
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 lg:block">
                SEARCH
              </span>
            )}
          </div>
        </div>

        {/* Right: sync + connection + profile */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            id="btn-global-refresh"
            type="button"
            onClick={() => refreshAll()}
            disabled={isGlobalRefreshing}
            className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all ${isGlobalRefreshing
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              }`}
            title="Reload latest data from Database"
          >
            <RotateCw
              className={`h-4 w-4 ${isGlobalRefreshing ? "animate-spin" : ""
                }`}
            />
            <span className="hidden xl:inline">
              {isGlobalRefreshing
                ? "Syncing..."
                : lastUpdated
                  ? `Synced ${lastUpdated}`
                  : "Sync Data"}
            </span>
          </button>

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 xl:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.10)]" />
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Database Active
            </span>
          </div>

          <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white shadow-sm">
              {currentUser?.FullName
                ? currentUser.FullName.substring(0, 1).toUpperCase()
                : "M"}
            </div>

            <div className="hidden min-w-0 lg:block">
              <p className="max-w-[140px] truncate text-xs font-bold text-slate-900">
                {currentUser?.FullName || "Staff User"}
              </p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {currentUser?.Role || "Admin"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search */}
      <div className="mt-2 md:hidden">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-16 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
