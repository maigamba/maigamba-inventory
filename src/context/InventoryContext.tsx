import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Product,
  Category,
  Brand,
  Supplier,
  Customer,
  Sale,
  Purchase,
  Expense,
  ReturnRecord,
  StockMovement,
  AuditLog,
  UserProfile,
  DashboardStats,
  SettingsData,
} from '../types/inventory';
import { inventoryApi } from '../services/api';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

interface InventoryContextType {
  // Authentication
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  login: (user: UserProfile, remember: boolean) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;

  // Data
  dashboard: DashboardStats | null;
  products: Product[];
  categories: Category[];
  brands: Brand[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  returns: ReturnRecord[];
  users: UserProfile[];
  settings: SettingsData;
  stockMovements: StockMovement[];
  auditLogs: AuditLog[];

  // Loading & Error States
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  isGlobalRefreshing: boolean;
  lastUpdated: string | null;

  // Name Resolution Helpers
  getCategoryName: (id: string | undefined | null) => string;
  getBrandName: (id: string | undefined | null) => string;
  getSupplierName: (id: string | undefined | null) => string;
  getCustomerName: (id: string | undefined | null) => string;
  getProductName: (id: string | undefined | null) => string;
  getProduct: (id: string | undefined | null) => Product | undefined;

  // Refresh Actions
  refreshAll: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshBrands: () => Promise<void>;
  refreshSuppliers: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshSales: () => Promise<void>;
  refreshPurchases: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshReturns: () => Promise<void>;
  refreshStockMovements: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshAuditLogs: () => Promise<void>;

  // Toast Notifications
  toasts: ToastItem[];
  addToast: (type: ToastItem['type'], message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const DEFAULT_SETTINGS: SettingsData = {
  BusinessName: 'Maigamba Computer Technology',
  Currency: 'NGN',
  Timezone: 'Africa/Lagos',
  LowStockAlerts: 5,
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state - Hydration safe, initialize null, populate in useEffect
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Frontend permission map is used only for navigation/UI visibility.
  // Backend middleware remains the source of truth for API authorization.
  const hasPermission = useCallback((permission: string): boolean => {
    if (!currentUser || currentUser.Status?.toLowerCase() !== 'active') {
      return false;
    }

    if (currentUser.Role === 'Admin') {
      return true;
    }

    const rolePermissions: Record<string, string[]> = {
      Manager: [
        'dashboard.view',
        'products.view', 'products.create', 'products.update',
        'categories.view', 'categories.manage',
        'brands.view', 'brands.manage',
        'suppliers.view', 'suppliers.create', 'suppliers.update',
        'customers.view', 'customers.create', 'customers.update',
        'sales.view', 'sales.create', 'sales.update',
        'purchases.view', 'purchases.create', 'purchases.update',
        'expenses.view', 'expenses.create', 'expenses.update',
        'returns.view', 'returns.create', 'returns.update',
        'stock.view', 'stock.adjust', 'stock.movements',
        'reports.view', 'audit.view',
      ],
      'Sales Staff': [
        'dashboard.view',
        'products.view',
        'customers.view', 'customers.create', 'customers.update',
        'sales.view', 'sales.create', 'sales.update',
      ],
      'Inventory Officer': [
        'dashboard.view',
        'products.view', 'products.create', 'products.update',
        'categories.view', 'categories.manage',
        'brands.view', 'brands.manage',
        'suppliers.view', 'suppliers.create', 'suppliers.update',
        'purchases.view', 'purchases.create', 'purchases.update',
        'stock.view', 'stock.adjust', 'stock.movements',
        'reports.view',
      ],
    };

    return rolePermissions[currentUser.Role || '']?.includes(permission) ?? false;
  }, [currentUser]);

  // Entities
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Granular Loading & Error tracking
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastItem['type'], message: string, title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Safe client-side auth restore
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('maigamba_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.Email) {
          setCurrentUser(parsed);
        }
      }
    } catch {
      // ignore
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const login = useCallback((user: UserProfile, remember: boolean) => {
    setCurrentUser(user);
    if (remember) {
      try {
        localStorage.setItem('maigamba_user', JSON.stringify(user));
      } catch {
        // ignore
      }
    }
    addToast('success', `Signed in as ${user.FullName} (${user.Role})`, 'Welcome Back');
  }, [addToast]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('maigamba_user');
    } catch {
      // ignore
    }
    addToast('info', 'You have been signed out successfully.', 'Session Ended');
  }, [addToast]);

  // Entity Refresh Handlers
  const refreshDashboard = useCallback(async () => {
    setLoading((prev) => ({ ...prev, dashboard: true }));
    setErrors((prev) => ({ ...prev, dashboard: null }));
    const res = await inventoryApi.getDashboard();
    if (res.success && res.data) {
      setDashboard(res.data);
    } else {
      setErrors((prev) => ({ ...prev, dashboard: res.message || 'Failed to load dashboard statistics' }));
    }
    setLoading((prev) => ({ ...prev, dashboard: false }));
  }, []);

  const normalizeProduct = useCallback((item: any): Product => {
    return {
      ...item,
      ProductID: String(item?.ProductID ?? item?.productId ?? item?.id ?? '').trim(),
      SKU: String(item?.SKU ?? item?.sku ?? '').trim(),
      ProductName: String(item?.ProductName ?? item?.productName ?? '').trim(),
      CategoryID: String(item?.CategoryID ?? item?.categoryId ?? '').trim(),
      BrandID: String(item?.BrandID ?? item?.brandId ?? '').trim(),
      Model: String(item?.Model ?? item?.model ?? '').trim(),
      SerialNumber: String(item?.SerialNumber ?? item?.serialNumber ?? '').trim(),
      Description: String(item?.Description ?? item?.description ?? '').trim(),
      Quantity: Number(item?.Quantity ?? item?.quantity ?? 0),
      ReorderLevel: Number(item?.ReorderLevel ?? item?.reorderLevel ?? 5),
      CostPrice: Number(item?.CostPrice ?? item?.costPrice ?? 0),
      SellingPrice: Number(item?.SellingPrice ?? item?.sellingPrice ?? 0),
      SupplierID: String(item?.SupplierID ?? item?.supplierId ?? '').trim(),
      Location: String(item?.Location ?? item?.location ?? 'Main Store').trim(),
      Status: String(item?.Status ?? item?.status ?? 'Active').trim(),
      ProductImage: String(item?.ProductImage ?? item?.productImage ?? '').trim(),
      CreatedAt: item?.CreatedAt ?? item?.createdAt,
      UpdatedAt: item?.UpdatedAt ?? item?.updatedAt,
    } as Product;
  }, []);

  const refreshProducts = useCallback(async () => {
    setLoading((prev) => ({ ...prev, products: true }));
    setErrors((prev) => ({ ...prev, products: null }));

    try {
      const res = await inventoryApi.getProducts();

      if (res.success && Array.isArray(res.data)) {
        const normalizedProducts = res.data
          .map(normalizeProduct)
          .filter((p: Product) => Boolean(p.ProductID));

        setProducts(normalizedProducts);
      } else {
        setErrors((prev) => ({
          ...prev,
          products: res.message || 'Failed to load products',
        }));
      }
    } catch (error: any) {
      console.error('Failed to load products:', error);
      setErrors((prev) => ({
        ...prev,
        products: error?.message || 'Failed to load products',
      }));
    } finally {
      setLoading((prev) => ({ ...prev, products: false }));
    }
  }, [normalizeProduct]);

  const refreshCategories = useCallback(async () => {
    setLoading((prev) => ({ ...prev, categories: true }));
    setErrors((prev) => ({ ...prev, categories: null }));
    const res = await inventoryApi.getCategories();
    if (res.success && Array.isArray(res.data)) {
      setCategories(res.data);
    } else {
      setErrors((prev) => ({ ...prev, categories: res.message || 'Failed to load categories' }));
    }
    setLoading((prev) => ({ ...prev, categories: false }));
  }, []);

  const refreshBrands = useCallback(async () => {
    setLoading((prev) => ({ ...prev, brands: true }));
    setErrors((prev) => ({ ...prev, brands: null }));
    const res = await inventoryApi.getBrands();
    if (res.success && Array.isArray(res.data)) {
      setBrands(res.data);
    } else {
      setErrors((prev) => ({ ...prev, brands: res.message || 'Failed to load brands' }));
    }
    setLoading((prev) => ({ ...prev, brands: false }));
  }, []);

  const refreshSuppliers = useCallback(async () => {
    setLoading((prev) => ({ ...prev, suppliers: true }));
    setErrors((prev) => ({ ...prev, suppliers: null }));
    const res = await inventoryApi.getSuppliers();
    if (res.success && Array.isArray(res.data)) {
      setSuppliers(res.data);
    } else {
      setErrors((prev) => ({ ...prev, suppliers: res.message || 'Failed to load suppliers' }));
    }
    setLoading((prev) => ({ ...prev, suppliers: false }));
  }, []);

  // Normalize MongoDB customer records into the UI Customer shape.
  // Supports both camelCase PostgreSQL fields and legacy PascalCase fields.
  const normalizeCustomer = useCallback((item: any): Customer => {
    const customerId = String(
      item?.CustomerID ??
      item?.customerId ??
      item?.id ??
      ''
    ).trim();

    const customerName = String(
      item?.CustomerName ??
      item?.name ??
      item?.fullName ??
      item?.customerName ??
      ''
    ).trim();

    return {
      ...item,
      CustomerID: customerId,
      CustomerName: customerName,
      Phone: String(item?.Phone ?? item?.phone ?? '').trim(),
      Email: String(item?.Email ?? item?.email ?? '').trim(),
      Address: String(item?.Address ?? item?.address ?? '').trim(),
      City: String(item?.City ?? item?.city ?? '').trim(),
      State: String(item?.State ?? item?.state ?? item?.stateName ?? '').trim(),
      Country: String(item?.Country ?? item?.country ?? item?.countryName ?? 'Nigeria').trim() || 'Nigeria',
      CustomerType: String(
        item?.CustomerType ??
        item?.customerType ??
        'Retail'
      ).trim() || 'Retail',
      AccountBalance: Number(
        item?.AccountBalance ??
        item?.accountBalance ??
        0
      ),
      Status: String(
        item?.Status ??
        item?.status ??
        'Active'
      ).trim() || 'Active',
      CreatedAt: item?.CreatedAt ?? item?.createdAt,
      UpdatedAt: item?.UpdatedAt ?? item?.updatedAt,
    } as Customer;
  }, []);

  const refreshCustomers = useCallback(async () => {
    setLoading((prev) => ({ ...prev, customers: true }));
    setErrors((prev) => ({ ...prev, customers: null }));

    try {
      const res = await inventoryApi.getCustomers();

      console.log('[Maigamba] Customers API response:', res);

      if (res.success && Array.isArray(res.data)) {
        const normalizedCustomers = res.data
          .map(normalizeCustomer)
          .filter((customer: Customer) => Boolean(customer.CustomerID));

        console.log(
          `[Maigamba] Customers loaded from MongoDB Atlas: ${normalizedCustomers.length}`,
          normalizedCustomers
        );

        setCustomers(normalizedCustomers);
      } else {
        setCustomers([]);
        setErrors((prev) => ({
          ...prev,
          customers: res.message || 'Failed to load customers',
        }));
      }
    } catch (error: any) {
      console.error('[Maigamba] Failed to load customers:', error);

      setCustomers([]);
      setErrors((prev) => ({
        ...prev,
        customers: error?.message || 'Failed to load customers',
      }));
    } finally {
      setLoading((prev) => ({ ...prev, customers: false }));
    }
  }, [normalizeCustomer]);

  const normalizeSale = useCallback((item: any): Sale => {
    const rawItems = Array.isArray(item?.items) ? item.items : [];

    return {
      ...item,
      SaleID: String(item?.SaleID ?? item?.saleId ?? item?.id ?? '').trim(),
      InvoiceNumber: String(item?.InvoiceNumber ?? item?.invoiceNumber ?? '').trim(),
      CustomerID: String(item?.CustomerID ?? item?.customerId ?? '').trim(),
      SaleDate: item?.SaleDate ?? item?.saleDate ?? item?.createdAt ?? item?.CreatedAt,
      Subtotal: Number(item?.Subtotal ?? item?.subtotal ?? 0),
      Discount: Number(item?.Discount ?? item?.discount ?? 0),
      Tax: Number(item?.Tax ?? item?.tax ?? 0),
      TotalAmount: Number(item?.TotalAmount ?? item?.totalAmount ?? 0),
      AmountPaid: Number(item?.AmountPaid ?? item?.amountPaid ?? 0),
      Balance: Number(item?.Balance ?? item?.balance ?? 0),
      PaymentMethod: String(item?.PaymentMethod ?? item?.paymentMethod ?? 'Cash'),
      PaymentStatus: String(item?.PaymentStatus ?? item?.paymentStatus ?? 'Pending'),
      SaleStatus: String(item?.SaleStatus ?? item?.saleStatus ?? 'Completed'),
      CreatedBy: String(item?.CreatedBy ?? item?.createdBy ?? '').trim(),
      CreatedAt: item?.CreatedAt ?? item?.createdAt,
      UpdatedAt: item?.UpdatedAt ?? item?.updatedAt,
      items: rawItems.map((row: any) => ({
        ...row,
        SaleItemID: String(row?.SaleItemID ?? row?.saleItemId ?? row?.id ?? '').trim(),
        SaleID: String(row?.SaleID ?? row?.saleId ?? item?.saleId ?? '').trim(),
        ProductID: String(row?.ProductID ?? row?.productId ?? row?.product?.productId ?? '').trim(),
        ProductName: String(row?.ProductName ?? row?.productName ?? row?.product?.productName ?? '').trim(),
        Quantity: Number(row?.Quantity ?? row?.quantity ?? 0),
        UnitPrice: Number(row?.UnitPrice ?? row?.unitPrice ?? 0),
        Discount: Number(row?.Discount ?? row?.discount ?? 0),
        Total: Number(row?.Total ?? row?.total ?? 0),
        SerialNumber: String(row?.SerialNumber ?? row?.serialNumber ?? row?.product?.serialNumber ?? '').trim(),
      })),
    } as Sale;
  }, []);

  const normalizeStockMovement = useCallback((item: any): StockMovement => ({
    ...item,
    MovementID: String(item?.MovementID ?? item?.movementId ?? item?.id ?? '').trim(),
    ProductID: String(item?.ProductID ?? item?.productId ?? item?.product?.productId ?? '').trim(),
    MovementType: String(item?.MovementType ?? item?.movementType ?? '').trim(),
    Quantity: Number(item?.Quantity ?? item?.quantity ?? 0),
    PreviousQuantity: Number(item?.PreviousQuantity ?? item?.previousQuantity ?? 0),
    NewQuantity: Number(item?.NewQuantity ?? item?.newQuantity ?? 0),
    ReferenceID: String(item?.ReferenceID ?? item?.referenceId ?? '').trim(),
    Reason: String(item?.Reason ?? item?.reason ?? '').trim(),
    StaffID: String(item?.StaffID ?? item?.staffId ?? item?.staff?.userId ?? '').trim(),
    MovementDate: item?.MovementDate ?? item?.movementDate ?? item?.createdAt ?? item?.CreatedAt,
    Notes: String(item?.Notes ?? item?.notes ?? '').trim(),
  } as StockMovement), []);

  const refreshSales = useCallback(async () => {
    setLoading((prev) => ({ ...prev, sales: true }));
    setErrors((prev) => ({ ...prev, sales: null }));
    try {
      const res = await inventoryApi.getSales();
      if (res.success && Array.isArray(res.data)) {
        setSales(res.data.map(normalizeSale).filter((sale: Sale) => Boolean(sale.SaleID)));
      } else {
        setErrors((prev) => ({ ...prev, sales: res.message || 'Failed to load sales' }));
      }
    } catch (error: any) {
      console.error('Failed to load sales:', error);
      setErrors((prev) => ({ ...prev, sales: error?.message || 'Failed to load sales' }));
    } finally {
      setLoading((prev) => ({ ...prev, sales: false }));
    }
  }, [normalizeSale]);

  const refreshPurchases = useCallback(async () => {
    setLoading((prev) => ({ ...prev, purchases: true }));
    setErrors((prev) => ({ ...prev, purchases: null }));
    const res = await inventoryApi.getPurchases();
    if (res.success && Array.isArray(res.data)) {
      setPurchases(res.data);
    } else {
      setErrors((prev) => ({ ...prev, purchases: res.message || 'Failed to load purchases' }));
    }
    setLoading((prev) => ({ ...prev, purchases: false }));
  }, []);

  const refreshExpenses = useCallback(async () => {
    setLoading((prev) => ({ ...prev, expenses: true }));
    setErrors((prev) => ({ ...prev, expenses: null }));
    const res = await inventoryApi.getExpenses();
    if (res.success && Array.isArray(res.data)) {
      setExpenses(res.data);
    } else {
      setErrors((prev) => ({ ...prev, expenses: res.message || 'Failed to load expenses' }));
    }
    setLoading((prev) => ({ ...prev, expenses: false }));
  }, []);

  const refreshReturns = useCallback(async () => {
    setLoading((prev) => ({ ...prev, returns: true }));
    setErrors((prev) => ({ ...prev, returns: null }));
    const res = await inventoryApi.getReturns();
    if (res.success && Array.isArray(res.data)) {
      setReturns(res.data);
    } else {
      setErrors((prev) => ({ ...prev, returns: res.message || 'Failed to load returns' }));
    }
    setLoading((prev) => ({ ...prev, returns: false }));
  }, []);

  const refreshStockMovements = useCallback(async () => {
    setLoading((prev) => ({ ...prev, stockMovements: true }));
    setErrors((prev) => ({ ...prev, stockMovements: null }));
    try {
      const res = await inventoryApi.getStockMovements();
      if (res.success && Array.isArray(res.data)) {
        setStockMovements(res.data.map(normalizeStockMovement).filter((row: StockMovement) => Boolean(row.MovementID)));
      } else {
        setErrors((prev) => ({ ...prev, stockMovements: res.message || 'Failed to load stock movements' }));
      }
    } catch (error: any) {
      console.error('Failed to load stock movements:', error);
      setErrors((prev) => ({ ...prev, stockMovements: error?.message || 'Failed to load stock movements' }));
    } finally {
      setLoading((prev) => ({ ...prev, stockMovements: false }));
    }
  }, [normalizeStockMovement]);

  const refreshUsers = useCallback(async () => {
    setLoading((prev) => ({ ...prev, users: true }));
    setErrors((prev) => ({ ...prev, users: null }));
    const res = await inventoryApi.getUsers();
    if (res.success && Array.isArray(res.data)) {
      setUsers(res.data);
    } else {
      setErrors((prev) => ({ ...prev, users: res.message || 'Failed to load users' }));
    }
    setLoading((prev) => ({ ...prev, users: false }));
  }, []);

  const refreshSettings = useCallback(async () => {
    setLoading((prev) => ({ ...prev, settings: true }));
    setErrors((prev) => ({ ...prev, settings: null }));

    try {
      const res = await inventoryApi.getSettings();

      if (!res.success || !res.data) {
        setSettings(DEFAULT_SETTINGS);
        return;
      }

      if (Array.isArray(res.data)) {
        // PostgreSQL returns settings as key/value rows:
        // { settingName: "BusinessName", settingValue: "..." }
        const settingsObj: SettingsData = { ...DEFAULT_SETTINGS };

        res.data.forEach((row: any) => {
          if (!row || typeof row !== 'object') return;

          const name = String(
            row.settingName ??
            row.SettingName ??
            row.name ??
            ''
          ).trim();

          const value = row.settingValue ?? row.SettingValue ?? row.value;

          if (!name || value === undefined || value === null) return;

          switch (name) {
            case 'BusinessName':
              settingsObj.BusinessName = String(value);
              break;
            case 'Address':
              settingsObj.Address = String(value);
              break;
            case 'Phone':
              settingsObj.Phone = String(value);
              break;
            case 'Email':
              settingsObj.Email = String(value);
              break;
            case 'Currency':
              settingsObj.Currency = String(value);
              break;
            case 'CurrencySymbol':
              settingsObj.CurrencySymbol = String(value);
              break;
            case 'TaxRate':
              settingsObj.TaxRate = Number(value);
              break;
            case 'LowStockThreshold':
              settingsObj.LowStockThreshold = Number(value);
              break;
            case 'InvoicePrefix':
              settingsObj.InvoicePrefix = String(value);
              break;
            case 'InvoiceFooterNote':
              settingsObj.InvoiceFooterNote = String(value);
              break;
            case 'Timezone':
              settingsObj.Timezone = String(value);
              break;
            case 'LowStockAlerts':
              settingsObj.LowStockAlerts = Number(value);
              break;
            default:
              // Preserve any other settings for future configuration fields.
              (settingsObj as any)[name] = value;
              break;
          }
        });

        setSettings(settingsObj);
      } else if (typeof res.data === 'object') {
        setSettings({ ...DEFAULT_SETTINGS, ...res.data });
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      setErrors((prev) => ({
        ...prev,
        settings: error?.message || 'Failed to load settings',
      }));
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading((prev) => ({ ...prev, settings: false }));
    }
  }, []);

  const refreshAuditLogs = useCallback(async () => {
    setLoading((prev) => ({ ...prev, auditLogs: true }));
    setErrors((prev) => ({ ...prev, auditLogs: null }));
    const res = await inventoryApi.getAuditLogs();
    if (res.success && Array.isArray(res.data)) {
      setAuditLogs(res.data);
    } else {
      setErrors((prev) => ({ ...prev, auditLogs: res.message || 'Failed to load audit logs' }));
    }
    setLoading((prev) => ({ ...prev, auditLogs: false }));
  }, []);

  // Global Refresh - loads all sections independently so failures don't block
  const refreshAll = useCallback(async () => {
    setIsGlobalRefreshing(true);
    try {
      await Promise.allSettled([
        refreshDashboard(),
        refreshProducts(),
        refreshCategories(),
        refreshBrands(),
        refreshSuppliers(),
        refreshCustomers(),
        refreshSales(),
        refreshPurchases(),
        refreshExpenses(),
        refreshReturns(),
        refreshStockMovements(),
        refreshUsers(),
        refreshSettings(),
        refreshAuditLogs(),
      ]);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setIsGlobalRefreshing(false);
    }
  }, [
    refreshDashboard,
    refreshProducts,
    refreshCategories,
    refreshBrands,
    refreshSuppliers,
    refreshCustomers,
    refreshSales,
    refreshPurchases,
    refreshExpenses,
    refreshReturns,
    refreshStockMovements,
    refreshUsers,
    refreshSettings,
    refreshAuditLogs,
  ]);

  // Initial load once authenticated
  useEffect(() => {
    if (currentUser) {
      refreshAll();
    }
  }, [currentUser, refreshAll]);

  // Lookup maps for O(1) Human Readable Name Resolution
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => {
      if (c.CategoryID) map.set(c.CategoryID, c.CategoryName);
    });
    return map;
  }, [categories]);

  const brandMap = useMemo(() => {
    const map = new Map<string, string>();
    brands.forEach((b) => {
      if (b.BrandID) map.set(b.BrandID, b.BrandName);
    });
    return map;
  }, [brands]);

  const supplierMap = useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach((s) => {
      if (s.SupplierID) map.set(s.SupplierID, s.SupplierName);
    });
    return map;
  }, [suppliers]);

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();

    customers.forEach((c) => {
      const id = String(
        (c as any)?.CustomerID ??
        (c as any)?.customerId ??
        (c as any)?.id ??
        ''
      ).trim();

      const name = String(
        (c as any)?.CustomerName ??
        (c as any)?.name ??
        (c as any)?.fullName ??
        ''
      ).trim();

      if (id) {
        map.set(id, name || id);
      }
    });

    return map;
  }, [customers]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      const id = String(
        (p as any).ProductID ??
        (p as any).productId ??
        (p as any).id ??
        ''
      ).trim();

      if (id) {
        map.set(id, p);
      }
    });
    return map;
  }, [products]);

  const getCategoryName = useCallback((id: string | undefined | null) => {
    if (!id) return '—';
    return categoryMap.get(id) || id;
  }, [categoryMap]);

  const getBrandName = useCallback((id: string | undefined | null) => {
    if (!id) return '—';
    return brandMap.get(id) || id;
  }, [brandMap]);

  const getSupplierName = useCallback((id: string | undefined | null) => {
    if (!id) return '—';
    return supplierMap.get(id) || id;
  }, [supplierMap]);

  const getCustomerName = useCallback((id: string | undefined | null) => {
    if (!id) return '—';
    return customerMap.get(id) || id;
  }, [customerMap]);

  const getProductName = useCallback((id: string | undefined | null) => {
    if (!id) return '—';
    const prod = productMap.get(id);
    return prod ? prod.ProductName : id;
  }, [productMap]);

  const getProduct = useCallback((id: string | undefined | null) => {
    if (!id) return undefined;
    return productMap.get(id);
  }, [productMap]);

  return (
    <InventoryContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        hasPermission,
        dashboard,
        products,
        categories,
        brands,
        suppliers,
        customers,
        sales,
        purchases,
        expenses,
        returns,
        users,
        settings,
        stockMovements,
        auditLogs,
        loading,
        errors,
        isGlobalRefreshing,
        lastUpdated,
        getCategoryName,
        getBrandName,
        getSupplierName,
        getCustomerName,
        getProductName,
        getProduct,
        refreshAll,
        refreshDashboard,
        refreshProducts,
        refreshCategories,
        refreshBrands,
        refreshSuppliers,
        refreshCustomers,
        refreshSales,
        refreshPurchases,
        refreshExpenses,
        refreshReturns,
        refreshStockMovements,
        refreshUsers,
        refreshSettings,
        refreshAuditLogs,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
