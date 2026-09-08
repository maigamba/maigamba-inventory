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
    <div className="flex flex-col h-full bg-[#1a1a1a] text-[#fcfaf7] border-r border-black/20 selection:bg-white selection:text-[#1a1a1a]">

      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div className="w-9 h-9 border border-white/20 bg-[#262626] flex items-center justify-center text-white">
            <Monitor className="w-4 h-4 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">

              <h2 className="font-serif tracking-widest text-sm text-white font-semibold">
                MAIGAMBA
              </h2>

              <span className="text-[9px] text-white/40 font-mono tracking-widest">
                &trade;
              </span>

            </div>

            <p className="text-[9px] text-white/40 uppercase tracking-[0.25em] font-medium">
              Computer Technology
            </p>
          </div>

        </div>


        {/* Mobile close */}
        <button
          type="button"
          onClick={() =>
            setIsOpenMobile(false)
          }
          className="lg:hidden p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

      </div>


      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">

        {navSections.map(
          (section) => (
            <div
              key={section.title}
              className="space-y-1"
            >

              <div className="flex items-center gap-2 px-3 mb-1.5">

                <span className="w-1.5 h-[1px] bg-white/30" />

                <h3 className="text-[9px] uppercase tracking-[0.3em] font-medium text-white/40">
                  {section.title}
                </h3>

              </div>


              <div className="space-y-0.5">

                {section.items.map(
                  (item) => {
                    const Icon =
                      item.icon;

                    const isActive =
                      activeTab ===
                      item.id;

                    return (
                      <button
                        key={item.id}
                        id={`nav-item-${item.id}`}
                        type="button"
                        onClick={() =>
                          handleSelect(
                            item.id
                          )
                        }
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-all group ${isActive
                          ? 'bg-[#fcfaf7] text-[#1a1a1a] font-semibold shadow-xs'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                          }`}
                      >

                        <div className="flex items-center gap-2.5">

                          <Icon
                            className={`w-4 h-4 transition-colors ${isActive
                              ? 'text-[#1a1a1a]'
                              : 'text-white/40 group-hover:text-white/80'
                              }`}
                          />

                          <span
                            className={
                              isActive
                                ? 'tracking-tight'
                                : 'tracking-normal'
                            }
                          >
                            {item.label}
                          </span>

                        </div>


                        {item.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider ${isActive
                              ? 'bg-[#1a1a1a] text-[#fcfaf7]'
                              : 'bg-white/10 text-white/80 border border-white/10'
                              }`}
                          >
                            {item.badge}
                          </span>
                        )}

                      </button>
                    );
                  }
                )}

              </div>

            </div>
          )
        )}

      </div>


      {/* User profile / logout */}
      <div className="p-3 border-t border-white/10 bg-[#141414]">

        <div className="flex items-center justify-between p-2 bg-[#1f1f1f] border border-white/10">

          <div className="flex items-center gap-2.5 min-w-0">

            <div className="w-7 h-7 bg-white/10 border border-white/20 text-white font-mono flex items-center justify-center text-[10px] shrink-0">
              {currentUser?.FullName
                ? currentUser.FullName
                  .substring(
                    0,
                    2
                  )
                  .toUpperCase()
                : 'MG'}
            </div>


            <div className="min-w-0">

              <p className="text-xs font-medium text-white truncate">
                {currentUser?.FullName ||
                  'Staff User'}
              </p>

              <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 truncate">
                {currentUser?.Role ||
                  'Admin'}
              </p>

            </div>

          </div>


          <button
            id="btn-logout-sidebar"
            type="button"
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>

    </div>
  );


  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </aside>


      {/* Mobile */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">

          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() =>
              setIsOpenMobile(false)
            }
          />

          <div className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>

        </div>
      )}
    </>
  );
};