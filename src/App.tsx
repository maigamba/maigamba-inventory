import React, { useState } from 'react';
import {
  InventoryProvider,
  useInventory,
} from './context/InventoryContext';

import {
  Sidebar,
  ActiveTab,
} from './components/Sidebar';

import { Navbar } from './components/Navbar';
import { ToastContainer } from './components/ToastContainer';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { POSView } from './components/POSView';
import { CategoriesView } from './components/CategoriesView';
import { BrandsView } from './components/BrandsView';
import { SuppliersView } from './components/SuppliersView';
import { CustomersView } from './components/CustomersView';
import { PurchasesView } from './components/PurchasesView';
import { ExpensesView } from './components/ExpensesView';
import { ReturnsView } from './components/ReturnsView';
import { StockMovementsView } from './components/StockMovementsView';
import { ReportsView } from './components/ReportsView';
import { UsersView } from './components/UsersView';
import { AuditLogsView } from './components/AuditLogsView';
import { SettingsView } from './components/SettingsView';


// ============================================================================
// PERMISSION -> TAB MAPPING
// ============================================================================
//
// The application now uses EFFECTIVE PERMISSIONS instead of only the user's
// role.
//
// This means:
//   - A role can have a permission removed.
//   - A permission can be granted individually.
//   - The navigation changes according to the actual saved permissions.
//
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
// CHECK WHETHER A TAB CAN BE ACCESSED
// ============================================================================

const canAccessTab = (
  tab: ActiveTab,
  hasPermission: (
    permission: string
  ) => boolean
): boolean => {
  const requiredPermissions =
    TAB_PERMISSIONS[tab] ?? [];

  // Dashboard must explicitly have dashboard.view.
  if (
    requiredPermissions.length === 0
  ) {
    return false;
  }

  // A tab can be displayed when the user has
  // at least one of its relevant view/manage permissions.
  return requiredPermissions.some(
    (permission) =>
      hasPermission(permission)
  );
};


// ============================================================================
// MAIN LAYOUT
// ============================================================================

const MainLayout: React.FC = () => {
  const {
    currentUser,
    hasPermission,
  } = useInventory();

  const [activeTab, setActiveTab] =
    useState<ActiveTab>('dashboard');

  const [isOpenMobile, setIsOpenMobile] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState('');


  // ==========================================================================
  // CURRENTLY ACCESSIBLE TABS
  // ==========================================================================

  const allowedTabs = React.useMemo(
    () => {
      const tabs: ActiveTab[] = [
        'dashboard',
        'products',
        'categories',
        'brands',
        'stockMovements',
        'sales',
        'customers',
        'returns',
        'purchases',
        'suppliers',
        'expenses',
        'reports',
        'users',
        'auditLogs',
        'settings',
      ];

      return new Set(
        tabs.filter(
          (tab) =>
            canAccessTab(
              tab,
              hasPermission
            )
        )
      );
    },
    [
      hasPermission,
      currentUser?.UserID,
      currentUser?.Role,
      currentUser?.Permissions,
    ]
  );


  // ==========================================================================
  // SESSION / PERMISSION CHANGE
  // ==========================================================================
  //
  // When another user logs in, or permissions change, make sure the current
  // page is still allowed.
  //
  // ==========================================================================

  React.useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (
      allowedTabs.has(activeTab)
    ) {
      return;
    }

    // Prefer dashboard when available.
    if (
      allowedTabs.has(
        'dashboard'
      )
    ) {
      setActiveTab(
        'dashboard'
      );
      return;
    }

    // Otherwise select the first available tab.
    const firstAllowedTab =
      Array.from(
        allowedTabs
      )[0];

    if (firstAllowedTab) {
      setActiveTab(
        firstAllowedTab
      );
    }
  }, [
    currentUser?.UserID,
    currentUser?.Role,
    currentUser?.Permissions,
    activeTab,
    allowedTabs,
  ]);


  // ==========================================================================
  // UNAUTHENTICATED
  // ==========================================================================

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] font-sans text-[#fcfaf7] antialiased selection:bg-[#fcfaf7] selection:text-[#1a1a1a]">
        <LoginView />

        <ToastContainer />
      </div>
    );
  }


  // ==========================================================================
  // QUICK ACTION HANDLER
  // ==========================================================================

  const handleQuickAction = (
    action: string
  ) => {
    const targets: Record<
      string,
      ActiveTab
    > = {
      'new-sale':
        'sales',

      'add-product':
        'products',

      'new-purchase':
        'purchases',

      'add-customer':
        'customers',

      'record-expense':
        'expenses',
    };

    const target =
      targets[action];

    if (
      target &&
      allowedTabs.has(target)
    ) {
      setActiveTab(target);
    }
  };


  // ==========================================================================
  // SAFE NAVIGATION
  // ==========================================================================

  const navigateToTab = (
    tab: ActiveTab
  ) => {
    if (
      !allowedTabs.has(tab)
    ) {
      return;
    }

    setActiveTab(tab);
    setIsOpenMobile(false);
  };


  // ==========================================================================
  // RENDER ACTIVE VIEW
  // ==========================================================================

  const renderActiveView =
    () => {
      // ----------------------------------------------------------------------
      // Dashboard
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'dashboard'
      ) {
        if (
          !hasPermission(
            'dashboard.view'
          )
        ) {
          return (
            <AccessDeniedView />
          );
        }

        return (
          <DashboardView
            onNavigate={
              navigateToTab
            }
            onOpenQuickAction={
              handleQuickAction
            }
          />
        );
      }


      // ----------------------------------------------------------------------
      // Products
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'products'
      ) {
        return canAccessTab(
          'products',
          hasPermission
        ) ? (
          <ProductsView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Categories
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'categories'
      ) {
        return canAccessTab(
          'categories',
          hasPermission
        ) ? (
          <CategoriesView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Brands
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'brands'
      ) {
        return canAccessTab(
          'brands',
          hasPermission
        ) ? (
          <BrandsView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Stock Movements
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'stockMovements'
      ) {
        return canAccessTab(
          'stockMovements',
          hasPermission
        ) ? (
          <StockMovementsView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Sales / POS
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'sales'
      ) {
        return canAccessTab(
          'sales',
          hasPermission
        ) ? (
          <POSView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Customers
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'customers'
      ) {
        return canAccessTab(
          'customers',
          hasPermission
        ) ? (
          <CustomersView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Returns
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'returns'
      ) {
        return canAccessTab(
          'returns',
          hasPermission
        ) ? (
          <ReturnsView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Purchases
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'purchases'
      ) {
        return canAccessTab(
          'purchases',
          hasPermission
        ) ? (
          <PurchasesView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Suppliers
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'suppliers'
      ) {
        return canAccessTab(
          'suppliers',
          hasPermission
        ) ? (
          <SuppliersView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Expenses
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'expenses'
      ) {
        return canAccessTab(
          'expenses',
          hasPermission
        ) ? (
          <ExpensesView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Reports
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'reports'
      ) {
        return canAccessTab(
          'reports',
          hasPermission
        ) ? (
          <ReportsView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Users
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'users'
      ) {
        return canAccessTab(
          'users',
          hasPermission
        ) ? (
          <UsersView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Audit Logs
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'auditLogs'
      ) {
        return canAccessTab(
          'auditLogs',
          hasPermission
        ) ? (
          <AuditLogsView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Settings
      // ----------------------------------------------------------------------

      if (
        activeTab ===
        'settings'
      ) {
        return canAccessTab(
          'settings',
          hasPermission
        ) ? (
          <SettingsView />
        ) : (
          <AccessDeniedView />
        );
      }


      // ----------------------------------------------------------------------
      // Fallback
      // ----------------------------------------------------------------------

      if (
        hasPermission(
          'dashboard.view'
        )
      ) {
        return (
          <DashboardView
            onNavigate={
              navigateToTab
            }
            onOpenQuickAction={
              handleQuickAction
            }
          />
        );
      }

      return (
        <AccessDeniedView />
      );
    };


  // ==========================================================================
  // MAIN APPLICATION
  // ==========================================================================

  return (
    <div className="min-h-screen bg-[#fcfaf7] font-sans text-[#1a1a1a] antialiased flex flex-col lg:flex-row selection:bg-[#1a1a1a] selection:text-[#fcfaf7]">

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={
          navigateToTab
        }
        isOpenMobile={
          isOpenMobile
        }
        setIsOpenMobile={
          setIsOpenMobile
        }
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        <Navbar
          activeTab={activeTab}
          onOpenMobileSidebar={() =>
            setIsOpenMobile(true)
          }
          searchQuery={
            searchQuery
          }
          setSearchQuery={
            setSearchQuery
          }
        />

        <main className="flex-1 pb-16">
          {renderActiveView()}
        </main>

      </div>

      {/* Toasts */}
      <ToastContainer />
    </div>
  );
};


// ============================================================================
// ACCESS DENIED VIEW
// ============================================================================

const AccessDeniedView: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-black/10 rounded-xl shadow-sm p-8 text-center">

        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <span className="text-2xl">
            🔒
          </span>
        </div>

        <h2 className="text-xl font-semibold text-slate-900">
          Access Restricted
        </h2>

        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          Your account does not have permission
          to access this section of the Maigamba
          Inventory system.
        </p>

        <p className="mt-4 text-xs text-slate-400">
          Contact an Administrator if you believe
          you should have access.
        </p>

      </div>
    </div>
  );
};


// ============================================================================
// APP ROOT
// ============================================================================

export default function App() {
  return (
    <InventoryProvider>
      <MainLayout />
    </InventoryProvider>
  );
}