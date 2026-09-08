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
    <header className="sticky top-0 z-20 bg-[#fcfaf7]/95 backdrop-blur-md border-b border-black/10 px-4 sm:px-8 py-3.5 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + Active Tab Title */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-1.5 text-[#1a1a1a] hover:bg-black/5 transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-serif text-[#1a1a1a] tracking-tight font-semibold truncate">
                {tabInfo.title}
              </h1>
              <span className="hidden md:inline-block text-[9px] font-mono uppercase tracking-widest text-black/30 border border-black/10 px-1.5 py-0.2">
                FOLIO
              </span>
            </div>
            <p className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-black/50 truncate mt-0.5">
              {tabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex items-center flex-1 max-w-xs lg:max-w-md mx-2">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#f4f0ea] border border-black/10 rounded-sm text-[#1a1a1a] placeholder:text-black/40 focus:outline-none focus:border-black focus:bg-white transition-all font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-black/40 hover:text-black font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions (Refresh, Live Status, User Profile) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Refresh button */}
          <button
            id="btn-global-refresh"
            type="button"
            onClick={() => refreshAll()}
            disabled={isGlobalRefreshing}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-sm text-[10px] uppercase tracking-[0.15em] font-medium transition-all ${
              isGlobalRefreshing
                ? 'bg-[#1a1a1a] text-white border-black'
                : 'bg-white border-black/15 text-[#1a1a1a] hover:border-black hover:bg-[#f4f0ea]'
            }`}
            title="Reload latest data from Database"
          >
            <RotateCw className={`w-3 h-3 ${isGlobalRefreshing ? 'animate-spin text-white' : 'text-black/60'}`} />
            <span className="hidden sm:inline">
              {isGlobalRefreshing ? 'Syncing...' : lastUpdated ? `Synced ${lastUpdated}` : 'Sync Data'}
            </span>
          </button>

          {/* Database connection badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full border border-black/10 bg-[#f4f0ea] text-[9px] uppercase tracking-[0.2em] font-semibold text-black/70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Database Active</span>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-black/10">
            <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-[#fcfaf7] font-serif italic text-xs flex items-center justify-center border border-black/20 shadow-xs">
              {currentUser?.FullName ? currentUser.FullName.substring(0, 1).toUpperCase() : 'M'}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <p className="text-xs font-semibold text-[#1a1a1a] truncate max-w-[120px]">
                {currentUser?.FullName}
              </p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-black/40 capitalize">{currentUser?.Role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
