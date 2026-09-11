export interface Product {
  ProductID: string;
  SKU: string;
  ProductName: string;
  CategoryID: string;
  BrandID: string;
  Model: string;
  SerialNumber?: string;
  Description?: string;
  Quantity: number | string;
  ReorderLevel?: number | string;
  CostPrice: number | string;
  SellingPrice: number | string;
  SupplierID: string;
  Location?: string;
  Status: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  ProductImage?: string;
}

export interface Category {
  CategoryID: string;
  CategoryName: string;
  Description?: string;
  Status: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface Brand {
  BrandID: string;
  BrandName: string;
  Description?: string;
  Status: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface Supplier {
  SupplierID: string;
  SupplierName: string;
  ContactPerson?: string;
  Phone?: string;
  Email?: string;
  Address?: string;
  City?: string;
  AccountBalance?: number | string;
  Status: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface Customer {
  CustomerID: string;
  CustomerName: string;
  Phone?: string;
  Email?: string;

  // Customer location
  Country?: string;
  State?: string;
  City?: string;
  Address?: string;

  CustomerType?: string;
  AccountBalance?: number | string;
  Status: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface Sale {
  SaleID: string;
  InvoiceNumber: string;
  CustomerID: string;
  SaleDate: string;
  Subtotal: number | string;
  Discount: number | string;
  Tax: number | string;
  TotalAmount: number | string;
  AmountPaid: number | string;
  Balance: number | string;
  PaymentMethod: string;
  PaymentStatus: string;
  SaleStatus: string;
  CreatedBy: string;
  CreatedAt?: string;
  items?: SaleItem[];
}

export interface SaleItem {
  ProductID: string;
  ProductName?: string;
  Quantity: number;
  UnitPrice: number;
  Discount: number;
  LineTotal?: number;
}

export interface Purchase {
  PurchaseID: string;
  PurchaseNumber: string;
  SupplierID: string;
  PurchaseDate: string;
  Subtotal: number | string;
  Discount: number | string;
  Tax: number | string;
  TotalAmount: number | string;
  AmountPaid: number | string;
  Balance: number | string;
  PaymentMethod: string;
  PaymentStatus: string;
  PurchaseStatus: string;
  CreatedBy: string;
  CreatedAt?: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  ProductID: string;
  ProductName?: string;
  Quantity: number;
  UnitPrice: number;
  Discount: number;
  LineTotal?: number;
}

export interface Expense {
  ExpenseID: string;
  ExpenseCategory: string;
  Description: string;
  Amount: number | string;
  PaymentMethod: string;
  ExpenseDate: string;
  RecordedBy: string;
  Receipt?: string;
  Notes?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface ReturnRecord {
  ReturnID: string;
  SaleID: string;
  ProductID: string;
  SerialNumber?: string;
  CustomerID: string;
  ReturnDate: string;
  Reason: string;
  Quantity: number | string;
  RefundAmount: number | string;
  ReturnType: string;
  ConditionAfterReturn: string;
  Status: string;
  ProcessedBy: string;
  Notes?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface StockMovement {
  MovementID?: string;
  ProductID: string;
  MovementType:
  | 'SALE'
  | 'PURCHASE'
  | 'RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | string;
  Quantity: number | string;
  PreviousQuantity?: number | string;
  NewQuantity?: number | string;
  Reference?: string;
  Reason?: string;
  Staff?: string;
  Date?: string;
  CreatedAt?: string;
}

export interface AuditLog {
  LogID: string;
  Action: string;
  Module: string;
  RecordID?: string;
  Description: string;
  UserID: string;
  Timestamp?: string;
  CreatedAt?: string;
}

/**
 * Effective permissions assigned to a logged-in user.
 *
 * Examples:
 * - products.view
 * - products.create
 * - sales.view
 * - sales.create
 * - users.manage
 */
export type PermissionCode = string;

export interface UserProfile {
  UserID: string;
  FullName: string;
  Username: string;
  Email: string;
  Phone?: string;
  Role: string;
  Status: string;
  Permissions?: PermissionCode[];
  PasswordHash?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export type User = UserProfile;

export interface DashboardStats {
  products: number;
  stockValue: number;
  lowStock: number;
  todaySales: number;
  customers: number;
  revenue: number;
  purchases: number;
  expenses: number;
  estimatedGrossPosition: number;
}

export interface SettingsData {
  BusinessName?: string;
  Currency?: string;
  Timezone?: string;
  LowStockAlerts?: number | string;
  Address?: string;
  Phone?: string;
  Email?: string;
  TaxRate?: number | string;
  [key: string]: any;
}