import React from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  LayoutDashboard,
  Package,
  Tags,
  Bookmark,
  ArrowLeftRight,
  ShoppingCart,
  Users,
  Undo2,
  Truck,
  Building2,
  Receipt,
  BarChart3,
  UserCog,
  FileText,
  Settings,
  LogOut,
  Monitor,
  X,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'brands'
  | 'stockMovements'
  | 'sales'
  | 'customers'
  | 'returns'
  | 'purchases'
  | 'suppliers'
  | 'expenses'
  | 'reports'
  | 'users'
  | 'auditLogs'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}


// ============================================================================
// TAB -> PERMISSION MAPPING
// ============================================================================

const TAB_PERMISSIONS: Record<
  ActiveTab,
  string[]
> = {
  dashboard: [
    'dashboard.view',
  ],

  products: [
    'products.view',
  ],

  categories: [
    'categories.view',
    'categories.manage',
  ],

  brands: [
    'brands.view',
    'brands.manage',
  ],

  stockMovements: [
    'stock.view',
    'stock.movements',
  ],

  sales: [
    'sales.view',
  ],

  customers: [
    'customers.view',
  ],

  returns: [
    'returns.view',
  ],

  purchases: [
    'purchases.view',
  ],

  suppliers: [
    'suppliers.view',
  ],

  expenses: [
    'expenses.view',
  ],

  reports: [
    'reports.view',
  ],

  users: [
    'users.view',
  ],

  auditLogs: [
    'audit.view',
  ],

  settings: [
    'settings.view',
  ],
};


// ============================================================================
// SIDEBAR
// ============================================================================

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  const {
    currentUser,
    logout,
    dashboard,
    hasPermission,
  } = useInventory();


  // ==========================================================================
  // CHECK TAB ACCESS
  // ==========================================================================

  const canAccessTab = (
    tab: ActiveTab
  ): boolean => {
    // Admin keeps full access.
    if (
      String(
        currentUser?.Role ?? ''
      )
        .trim()
        .toLowerCase() === 'admin'
    ) {
      return true;
    }

    const requiredPermissions =
      TAB_PERMISSIONS[tab] ?? [];

    return requiredPermissions.some(
      (permission) =>
        hasPermission(permission)
    );
  };


  // ==========================================================================
  // SAFE NAVIGATION
  // ==========================================================================

  const handleSelect = (
    tab: ActiveTab
  ) => {
    if (!canAccessTab(tab)) {
      return;
    }

    setActiveTab(tab);
    setIsOpenMobile(false);
  };


  // ==========================================================================
  // NAVIGATION DATA
  // ==========================================================================

  const navSections = [
    {
      title: 'MAIN',

      items: [
        {
          id: 'dashboard' as ActiveTab,
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
      ],
    },

    {
      title: 'INVENTORY',

      items: [
        {
          id: 'products' as ActiveTab,
          label: 'Products',
          icon: Package,
          badge:
            dashboard?.lowStock &&
              dashboard.lowStock > 0
              ? `${dashboard.lowStock} low`
              : undefined,
          badgeColor:
            'bg-amber-100 text-amber-800 border-amber-200',
        },

        {
          id: 'categories' as ActiveTab,
          label: 'Categories',
          icon: Tags,
        },

        {
          id: 'brands' as ActiveTab,
          label: 'Brands',
          icon: Bookmark,
        },

        {
          id: 'stockMovements' as ActiveTab,
          label: 'Stock Movements',
          icon: ArrowLeftRight,
        },
      ],
    },

    {
      title: 'SALES',

      items: [
        {
          id: 'sales' as ActiveTab,
          label: 'Sales / POS',
          icon: ShoppingCart,
        },

        {
          id: 'customers' as ActiveTab,
          label: 'Customers',
          icon: Users,
        },

        {
          id: 'returns' as ActiveTab,
          label: 'Returns',
          icon: Undo2,
        },
      ],
    },

    {
      title: 'PURCHASES',

      items: [
        {
          id: 'purchases' as ActiveTab,
          label: 'Purchases',
          icon: Truck,
        },

        {
          id: 'suppliers' as ActiveTab,
          label: 'Suppliers',
          icon: Building2,
        },
      ],
    },

    {
      title: 'FINANCE',

      items: [
        {
          id: 'expenses' as ActiveTab,
          label: 'Expenses',
          icon: Receipt,
        },

        {
          id: 'reports' as ActiveTab,
          label: 'Reports',
          icon: BarChart3,
        },
      ],
    },

    {
      title: 'SYSTEM',

      items: [
        {
          id: 'users' as ActiveTab,
          label: 'Users',
          icon: UserCog,
        },

        {
          id: 'auditLogs' as ActiveTab,
          label: 'Audit Logs',
          icon: FileText,
        },

        {
          id: 'settings' as ActiveTab,
          label: 'Settings',
          icon: Settings,
        },
      ],
    },
  ]
    .map((section) => ({
      ...section,

      items: section.items.filter(
        (item) =>
          canAccessTab(item.id)
      ),
    }))

    .filter(
      (section) =>
        section.items.length > 0
    );


  // ==========================================================================
  // SIDEBAR CONTENT
  // ==========================================================================

  const sidebarContent = (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950 text-slate-100 shadow-2xl">
      <div className="relative border-b border-white/10 px-5 py-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-950 shadow-lg">
            <Monitor className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-sm font-bold tracking-[0.18em] text-white">MAIGAMBA</h2>
              <span className="text-[8px] font-semibold text-slate-500">TM</span>
            </div>
            <p className="mt-0.5 truncate text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Computer Technology
            </p>
          </div>
          <button type="button" onClick={() => setIsOpenMobile(false)}
            className="ml-auto rounded-lg p-2 text-slate-500 transition-all hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
        <div className="space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="mb-2 flex items-center gap-2 px-2">
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <h3 className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{section.title}</h3>
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button key={item.id} id={`nav-item-${item.id}`} type="button"
                      onClick={() => handleSelect(item.id)}
                      className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 ${isActive ? "bg-white text-slate-950 shadow-lg" : "text-slate-400 hover:bg-white/[0.07] hover:text-white"
                        }`}>
                      {isActive && <span className="absolute -left-3 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-white" />}
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${isActive ? "bg-slate-950 text-white" : "bg-white/[0.04] text-slate-500 group-hover:bg-white/[0.08] group-hover:text-slate-200"
                          }`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className={`truncate ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`ml-2 shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${isActive ? "border-slate-200 bg-slate-100 text-slate-700" :
                          item.badgeColor || "border-white/10 bg-white/[0.06] text-slate-300"
                          }`}>{item.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 bg-slate-950 p-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-slate-950 shadow-sm">
              {currentUser?.FullName ? currentUser.FullName.substring(0, 2).toUpperCase() : "MG"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{currentUser?.FullName || "Staff User"}</p>
              <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {currentUser?.Role || "Admin"}
              </p>
            </div>
            <button id="btn-logout-sidebar" type="button" onClick={logout} title="Sign Out"
              className="rounded-lg p-2 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-300">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[8px] font-medium uppercase tracking-[0.18em] text-slate-700">Maigamba Inventory</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 lg:block">{sidebarContent}</aside>
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setIsOpenMobile(false)} />
          <div className="relative z-10 h-full w-72 max-w-[88vw] shadow-2xl">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
