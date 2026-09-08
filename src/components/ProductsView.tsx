import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Product } from '../types/inventory';
import { inventoryApi } from '../services/api';
import { formatCurrency, formatDate, parseNumber } from '../utils/formatters';
import { getProductImageUrl } from '../utils/productImages';
import { ConfirmationModal } from './ConfirmationModal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { BulkImportModal } from './BulkImportModal';
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Edit,
  Trash2,
  Archive,
  ArrowLeftRight,
  Eye,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCw,
  SlidersHorizontal,
  TrendingUp,
  ShieldAlert,
  Camera,
  Upload,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const {
    products,
    categories,
    brands,
    suppliers,
    getCategoryName,
    getBrandName,
    getSupplierName,
    refreshProducts,
    refreshStockMovements,
    refreshDashboard,
    addToast,
    loading,
  } = useInventory();

  const isProductsLoading = loading.products;

  // Search, Filter & Sort State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof Product>('ProductName');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [archivingProduct, setArchivingProduct] = useState<Product | null>(null);

  // Hardware Camera & Bulk Import States
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraTargetProduct, setCameraTargetProduct] = useState<Product | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Stock Adjustment Form State
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState('Stock count discrepancy / Intake');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Product Form State (for both Add and Edit)
  const [formData, setFormData] = useState<Partial<Product>>({
    SKU: '',
    ProductName: '',
    CategoryID: '',
    BrandID: '',
    Model: '',
    SerialNumber: '',
    Description: '',
    Quantity: 1,
    ReorderLevel: 5,
    CostPrice: 0,
    SellingPrice: 0,
    SupplierID: '',
    Location: 'Main Store',
    Status: 'Active',
    ProductImage: '',
  });
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Reference data for the Add/Edit Product form.
  // These are fetched directly from PostgreSQL through the real API whenever
  // the product modal is opened, so the dropdowns always show current data.
  const [formCategories, setFormCategories] = useState<any[]>([]);
  const [formBrands, setFormBrands] = useState<any[]>([]);
  const [formSuppliers, setFormSuppliers] = useState<any[]>([]);
  const [isLoadingReferenceData, setIsLoadingReferenceData] = useState(false);

  const normalizeCategory = (item: any) => ({
    id: String(item?.CategoryID ?? item?.categoryId ?? item?.id ?? ''),
    name: String(item?.CategoryName ?? item?.categoryName ?? item?.name ?? '').trim(),
    status: String(item?.Status ?? item?.status ?? 'Active'),
  });

  const normalizeBrand = (item: any) => ({
    id: String(item?.BrandID ?? item?.brandId ?? item?.id ?? ''),
    name: String(item?.BrandName ?? item?.brandName ?? item?.name ?? '').trim(),
    status: String(item?.Status ?? item?.status ?? 'Active'),
  });

  const normalizeSupplier = (item: any) => ({
    id: String(item?.SupplierID ?? item?.supplierId ?? item?.id ?? ''),
    name: String(item?.SupplierName ?? item?.supplierName ?? item?.name ?? '').trim(),
    status: String(item?.Status ?? item?.status ?? 'Active'),
  });

  const loadProductReferenceData = async () => {
    setIsLoadingReferenceData(true);
    try {
      const [categoriesRes, brandsRes, suppliersRes] = await Promise.all([
        inventoryApi.getCategories(),
        inventoryApi.getBrands(),
        inventoryApi.getSuppliers(),
      ]);

      const categoriesData = Array.isArray(categoriesRes?.data)
        ? categoriesRes.data
        : Array.isArray(categoriesRes)
          ? categoriesRes
          : [];
      const brandsData = Array.isArray(brandsRes?.data)
        ? brandsRes.data
        : Array.isArray(brandsRes)
          ? brandsRes
          : [];
      const suppliersData = Array.isArray(suppliersRes?.data)
        ? suppliersRes.data
        : Array.isArray(suppliersRes)
          ? suppliersRes
          : [];

      const normalizedCategories = categoriesData
        .map(normalizeCategory)
        .filter((x: any) => x.id && x.name);
      const normalizedBrands = brandsData
        .map(normalizeBrand)
        .filter((x: any) => x.id && x.name);
      const normalizedSuppliers = suppliersData
        .map(normalizeSupplier)
        .filter((x: any) => x.id && x.name);

      setFormCategories(normalizedCategories);
      setFormBrands(normalizedBrands);
      setFormSuppliers(normalizedSuppliers);

      // Do not overwrite anything the user may already have entered.
      setFormData((prev) => ({
        ...prev,
        CategoryID: prev.CategoryID || normalizedCategories[0]?.id || '',
        BrandID: prev.BrandID || normalizedBrands[0]?.id || '',
        SupplierID: prev.SupplierID || '',
      }));
    } catch (error) {
      console.error('Failed to load product reference data:', error);
      addToast('error', 'Could not load Categories, Brands, and Suppliers from the database.');
      setFormCategories([]);
      setFormBrands([]);
      setFormSuppliers([]);
    } finally {
      setIsLoadingReferenceData(false);
    }
  };

  const openAddModal = () => {
    // Initialize the form BEFORE opening the modal. This prevents the
    // asynchronous database lookup from resetting fields while the user
    // is typing.
    setEditingProduct(null);
    setFormData({
      SKU: `SKU-${Date.now().toString().slice(-6)}`,
      ProductName: '',
      CategoryID: '',
      BrandID: '',
      Model: '',
      SerialNumber: '',
      Description: '',
      Quantity: 1,
      ReorderLevel: 5,
      CostPrice: 0,
      SellingPrice: 0,
      SupplierID: '',
      Location: 'Main Store',
      Status: 'Active',
      ProductImage: '',
    });
    setIsAddModalOpen(true);

    // Load the latest reference records from PostgreSQL in the background.
    // Only fill defaults when the user has not selected anything yet.
    void loadProductReferenceData();
  };

  const openEditModal = async (p: Product) => {
    await loadProductReferenceData();
    setFormData({
      ProductID: p.ProductID,
      SKU: p.SKU,
      ProductName: p.ProductName,
      CategoryID: p.CategoryID,
      BrandID: p.BrandID,
      Model: p.Model,
      SerialNumber: p.SerialNumber || '',
      Description: p.Description || '',
      Quantity: parseNumber(p.Quantity),
      ReorderLevel: parseNumber(p.ReorderLevel, 5),
      CostPrice: parseNumber(p.CostPrice),
      SellingPrice: parseNumber(p.SellingPrice),
      SupplierID: p.SupplierID,
      Location: p.Location || 'Main Store',
      Status: p.Status || 'Active',
      ProductImage: p.ProductImage || '',
    });
    setEditingProduct(p);
    setIsAddModalOpen(true);
  };

  // Camera Photo Captured callback
  const handlePhotoCaptured = async (base64Img: string) => {
    if (cameraTargetProduct) {
      // Direct update from product table row
      try {
        const updated = {
          ...cameraTargetProduct,
          ProductImage: base64Img,
          UpdatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        };
        const res = await inventoryApi.updateProduct(cameraTargetProduct.ProductID, {
          ProductImage: base64Img,
        });
        if (res.success) {
          addToast('success', `Product image attached to "${cameraTargetProduct.ProductName}".`, 'Camera Capture');
          await refreshProducts();
        } else {
          addToast('error', 'Failed to save product image.');
        }
      } catch (err) {
        addToast('error', 'Error updating product image.');
      }
      setCameraTargetProduct(null);
    } else {
      // Attached in Add/Edit Product form
      setFormData((prev) => ({
        ...prev,
        ProductImage: base64Img,
      }));
      addToast('success', 'Camera snapshot attached to product form.', 'Camera Capture');
    }
  };

  // Export filtered products as CSV
  const exportProductsCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'SKU,ProductName,Category,Brand,Quantity,CostPrice,SellingPrice,ReorderLevel,Model,SerialNumber,Location,Status\n';
    filteredProducts.forEach((p) => {
      csvContent += `"${p.SKU}","${p.ProductName.replace(/"/g, '""')}","${getCategoryName(p.CategoryID)}","${getBrandName(p.BrandID)}","${p.Quantity}","${p.CostPrice}","${p.SellingPrice}","${p.ReorderLevel}","${(p.Model || '').replace(/"/g, '""')}","${(p.SerialNumber || '').replace(/"/g, '""')}","${(p.Location || '').replace(/"/g, '""')}","${p.Status || 'Active'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Maigamba_products_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'Catalog CSV exported successfully.');
  };

  // Save product (Add or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const sku = String(formData.SKU ?? '').trim();
    const productName = String(formData.ProductName ?? '').trim();
    const categoryId = String(formData.CategoryID ?? '').trim();
    const brandId = String(formData.BrandID ?? '').trim();

    if (!sku) {
      addToast('warning', 'SKU is required.');
      return;
    }

    if (!productName) {
      addToast('warning', 'Product Name is required.');
      return;
    }

    if (!categoryId) {
      addToast('warning', 'Please select a Category.');
      return;
    }

    if (!brandId) {
      addToast('warning', 'Please select a Brand.');
      return;
    }

    if (!formData.CategoryID) {
      addToast('warning', 'Please select a Category.');
      return;
    }

    if (!formData.BrandID) {
      addToast('warning', 'Please select a Brand.');
      return;
    }

    setIsSubmittingForm(true);
    try {
      // IMPORTANT:
      // The PostgreSQL Express /products route expects Prisma-style camelCase
      // field names: sku, productName, categoryId, brandId, etc.
      // Do NOT send the old UI field names (SKU, ProductName, CategoryID, BrandID)
      // to the backend, otherwise the backend receives undefined values and
      // returns: "SKU, product name, category and brand are required".
      const productPayload: Record<string, any> = {
        sku,
        productName,
        categoryId,
        brandId,
        model: String(formData.Model ?? '').trim(),
        serialNumber: String(formData.SerialNumber ?? '').trim(),
        description: String(formData.Description ?? '').trim(),
        quantity: parseNumber(formData.Quantity),
        reorderLevel: parseNumber(formData.ReorderLevel, 5),
        costPrice: parseNumber(formData.CostPrice),
        sellingPrice: parseNumber(formData.SellingPrice),
        location: String(formData.Location ?? 'Main Store').trim() || 'Main Store',
        status: String(formData.Status ?? 'Active').trim() || 'Active',
      };

      // supplierId is optional. Sending "" can cause a PostgreSQL foreign-key
      // error, so only send it when a real supplier has been selected.
      const supplierId = String(formData.SupplierID ?? '').trim();
      if (supplierId) {
        productPayload.supplierId = supplierId;
      }

      // ProductID, ProductImage, CreatedAt and UpdatedAt are intentionally not
      // sent here because the current PostgreSQL product route generates the
      // productId and only accepts the fields it destructures from req.body.

      const res = editingProduct
        ? await inventoryApi.updateProduct(editingProduct.ProductID, productPayload)
        : await inventoryApi.createProduct(productPayload);
      if (res.success) {
        addToast('success', `Product "${productPayload.ProductName}" saved successfully.`);
        setIsAddModalOpen(false);
        await Promise.all([refreshProducts(), refreshDashboard()]);
      } else {
        addToast('error', res.message || 'Failed to save product on server.');
      }
    } catch (error: any) {
      console.error('Product save failed:', error);
      addToast(
        'error',
        error?.message || 'Unable to save product to PostgreSQL.'
      );
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Archive product
  const handleArchiveConfirm = async () => {
    if (!archivingProduct) return;
    setIsSubmittingForm(true);
    try {
      const res = await inventoryApi.archiveProduct(archivingProduct.ProductID);
      if (res.success) {
        addToast('success', `Product "${archivingProduct.ProductName}" archived successfully.`);
        setArchivingProduct(null);
        await Promise.all([refreshProducts(), refreshDashboard()]);
      } else {
        addToast('error', res.message || 'Failed to archive product.');
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Adjust stock
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    // Products come from PostgreSQL through Prisma (productId), while the UI
    // type uses ProductID. Accept both forms so stock adjustment never loses
    // the real database identifier.
    const productId = String(
      (adjustingProduct as any).ProductID ??
      (adjustingProduct as any).productId ??
      (adjustingProduct as any).id ??
      ''
    ).trim();

    if (!productId) {
      console.error('Stock adjustment: product has no database ID', adjustingProduct);
      addToast(
        'error',
        'This product has no valid Product ID from PostgreSQL. Reload the products and try again.'
      );
      return;
    }

    const currentQty = parseNumber(adjustingProduct.Quantity);
    const qtyChange = parseNumber(adjustQty);

    if (qtyChange <= 0) {
      addToast('warning', 'Adjustment quantity must be greater than 0.');
      return;
    }

    if (adjustType === 'OUT' && currentQty - qtyChange < 0) {
      addToast(
        'error',
        `Cannot remove ${qtyChange} units. Current stock is only ${currentQty}. Negative stock is forbidden.`
      );
      return;
    }

    setIsSubmittingAdjust(true);

    try {
      console.log('Applying stock adjustment:', {
        productId,
        quantity: qtyChange,
        type: adjustType,
        adjustmentType:
          adjustType === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        reason: adjustReason,
      });

      const res = await inventoryApi.adjustStock({
        ProductID: productId,
        productId,
        quantity: qtyChange,
        type: adjustType,
        adjustmentType:
          adjustType === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        reason: String(adjustReason ?? '').trim(),
      });

      if (res.success) {
        addToast(
          'success',
          `Stock for "${adjustingProduct.ProductName}" adjusted successfully.`
        );
        setAdjustingProduct(null);

        await Promise.all([
          refreshProducts(),
          refreshStockMovements(),
          refreshDashboard(),
        ]);
      } else {
        addToast(
          'error',
          res.message || 'Failed to adjust stock on server.'
        );
      }
    } catch (error: any) {
      console.error('Stock adjustment failed:', error);
      addToast(
        'error',
        error?.message || 'Unable to adjust stock.'
      );
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.ProductName.toLowerCase().includes(q) ||
        p.SKU.toLowerCase().includes(q) ||
        (p.Model && p.Model.toLowerCase().includes(q)) ||
        (p.SerialNumber && p.SerialNumber.toLowerCase().includes(q));

      // Category
      const matchCat = selectedCategory === 'ALL' || p.CategoryID === selectedCategory;

      // Brand
      const matchBrand = selectedBrand === 'ALL' || p.BrandID === selectedBrand;

      // Status
      const matchStatus = statusFilter === 'ALL' || p.Status === statusFilter;

      // Stock status
      const qty = parseNumber(p.Quantity);
      const reorder = parseNumber(p.ReorderLevel, 5);
      let matchStock = true;
      if (stockStatusFilter === 'IN_STOCK') matchStock = qty > reorder;
      if (stockStatusFilter === 'LOW_STOCK') matchStock = qty > 0 && qty <= reorder;
      if (stockStatusFilter === 'OUT_OF_STOCK') matchStock = qty <= 0;

      return matchSearch && matchCat && matchBrand && matchStatus && matchStock;
    }).sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [products, search, selectedCategory, selectedBrand, statusFilter, stockStatusFilter, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const productStats = useMemo(() => {
    let totalItems = products.length;
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;

    for (const p of products) {
      const q = parseNumber(p.Quantity);
      const reorder = parseNumber(p.ReorderLevel, 5);
      const cost = parseNumber(p.CostPrice);
      totalValue += q * cost;

      if (q <= 0) {
        outOfStock++;
      } else if (q <= reorder) {
        lowStock++;
      } else {
        inStock++;
      }
    }

    return { totalItems, inStock, lowStock, outOfStock, totalValue };
  }, [products]);

  const toggleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-6">
        <div>
          <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-black/50 block mb-1">
            Catalog & Hardware Stock
          </span>
          <h2 className="text-2xl font-serif font-bold text-[#1a1a1a] tracking-tight">
            Inventory Ledger ({products.length} Products)
          </h2>
          <p className="text-xs text-black/60 font-light mt-0.5">
            Manage electronic devices, computers, components and real-time inventory valuations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => refreshProducts()}
            disabled={isProductsLoading}
            className="p-2 rounded-xs border border-black/15 bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] shadow-xs transition-colors cursor-pointer"
            title="Reload products"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isProductsLoading ? 'animate-spin text-black' : ''}`} />
          </button>

          <button
            type="button"
            onClick={exportProductsCSV}
            className="px-3.5 py-2 border border-black/15 hover:border-black bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] rounded-xs text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export catalog CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            id="btn-bulk-import-csv"
            onClick={() => setIsBulkImportOpen(true)}
            className="px-3.5 py-2 border border-black/15 hover:border-black bg-[#f4f0ea] hover:bg-[#eae4d9] text-[#1a1a1a] rounded-xs text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Upload CSV to update inventory in bulk"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
            <span>Import CSV</span>
          </button>

          <button
            id="btn-add-product"
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] text-xs uppercase tracking-wider font-semibold rounded-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Catalog KPI Summary Grid with Stat Card Flop Hover Animations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Catalog */}
        <div
          onClick={() => setStockStatusFilter('ALL')}
          className={`bg-white p-5 border rounded-xs transition-all flex flex-col justify-between stat-card-flop cursor-pointer ${stockStatusFilter === 'ALL' ? 'border-black ring-1 ring-black/10' : 'border-black/10 hover:border-black/30'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">Catalog Volume</span>
            <div className="p-1.5 border border-black/10 bg-[#fcfaf7] text-[#1a1a1a]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-serif text-[#1a1a1a] tracking-tight">{productStats.totalItems}</h3>
            <p className="text-[10px] uppercase tracking-widest text-black/50 mt-1">Total hardware items</p>
          </div>
        </div>

        {/* Healthy Reserves */}
        <div
          onClick={() => setStockStatusFilter('IN_STOCK')}
          className={`bg-white p-5 border rounded-xs transition-all flex flex-col justify-between stat-card-flop cursor-pointer ${stockStatusFilter === 'IN_STOCK' ? 'border-emerald-700 ring-1 ring-emerald-600/30' : 'border-black/10 hover:border-black/30'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">Nominal Stock</span>
            <div className="p-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-serif text-emerald-800 tracking-tight">{productStats.inStock}</h3>
            <p className="text-[10px] uppercase tracking-widest text-black/50 mt-1">Above reorder limits</p>
          </div>
        </div>

        {/* Reorder Alerts */}
        <div
          onClick={() => setStockStatusFilter('LOW_STOCK')}
          className={`bg-white p-5 border rounded-xs transition-all flex flex-col justify-between stat-card-flop cursor-pointer ${stockStatusFilter === 'LOW_STOCK' ? 'border-amber-700 ring-1 ring-amber-600/30' : 'border-black/10 hover:border-black/30'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">Reorder Alert</span>
            <div className="p-1.5 border border-amber-200 bg-amber-50 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-800" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-serif text-amber-900 tracking-tight">{productStats.lowStock}</h3>
            <p className="text-[10px] uppercase tracking-widest text-black/50 mt-1">Near threshold minimum</p>
          </div>
        </div>

        {/* Depleted (Out of Stock) */}
        <div
          onClick={() => setStockStatusFilter('OUT_OF_STOCK')}
          className={`bg-white p-5 border rounded-xs transition-all flex flex-col justify-between stat-card-flop cursor-pointer ${stockStatusFilter === 'OUT_OF_STOCK' ? 'border-rose-700 ring-1 ring-rose-600/30' : 'border-black/10 hover:border-black/30'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">Depleted Stock</span>
            <div className="p-1.5 border border-rose-200 bg-rose-50 text-rose-800">
              <ShieldAlert className="w-4 h-4 text-rose-700" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-serif text-rose-800 tracking-tight">{productStats.outOfStock}</h3>
            <p className="text-[10px] uppercase tracking-widest text-black/50 mt-1">Zero quantity on hand</p>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search, Category, Brand, Stock Status Filter */}
      <div className="bg-white p-4 rounded-sm border border-black/10 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, SKU, model, serial..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-black text-[#1a1a1a]"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-black text-[#1a1a1a]"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.CategoryID} value={c.CategoryID}>
                  {c.CategoryName}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-black text-[#1a1a1a]"
            >
              <option value="ALL">All Brands</option>
              {brands.map((b) => (
                <option key={b.BrandID} value={b.BrandID}>
                  {b.BrandName}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <select
              value={stockStatusFilter}
              onChange={(e) => {
                setStockStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-black text-[#1a1a1a]"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock Warning</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-sm border border-black/10 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f4f0ea] border-b border-black/10 text-black/60 font-semibold uppercase tracking-[0.15em] text-[10px]">
              <tr>
                <th className="py-3 px-4 cursor-pointer hover:text-black" onClick={() => toggleSort('SKU')}>
                  <div className="flex items-center gap-1">
                    <span>SKU</span>
                    <ArrowUpDown className="w-3 h-3 text-black/40" />
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-black" onClick={() => toggleSort('ProductName')}>
                  <div className="flex items-center gap-1">
                    <span>Product Name</span>
                    <ArrowUpDown className="w-3 h-3 text-black/40" />
                  </div>
                </th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Model</th>
                <th className="py-3 px-4 cursor-pointer hover:text-black" onClick={() => toggleSort('Quantity')}>
                  <div className="flex items-center gap-1">
                    <span>Quantity</span>
                    <ArrowUpDown className="w-3 h-3 text-black/40" />
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-black" onClick={() => toggleSort('CostPrice')}>
                  <div className="flex items-center gap-1">
                    <span>Cost</span>
                    <ArrowUpDown className="w-3 h-3 text-black/40" />
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-black" onClick={() => toggleSort('SellingPrice')}>
                  <div className="flex items-center gap-1">
                    <span>Selling</span>
                    <ArrowUpDown className="w-3 h-3 text-black/40" />
                  </div>
                </th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-[#1a1a1a]">
              {isProductsLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-black/40">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span className="font-light">Loading products from ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-black/40">
                    <Package className="w-8 h-8 text-black/20 mx-auto mb-2" />
                    <p className="font-serif font-bold text-base text-[#1a1a1a]">No products found</p>
                    <p className="text-[11px] text-black/50 font-light mt-1">Try resetting filters or click "Add New Product" to create one.</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const qty = parseNumber(p.Quantity);
                  const reorder = parseNumber(p.ReorderLevel, 5);
                  const isLow = qty > 0 && qty <= reorder;
                  const isOut = qty <= 0;

                  return (
                    <tr key={p.ProductID} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="py-3 px-4 font-mono font-medium text-[#1a1a1a]">{p.SKU}</td>
                      <td className="py-3 px-4 min-w-[220px]">
                        <div className="flex items-center gap-3">
                          <div className="relative group/thumb shrink-0">
                            <img
                              src={getProductImageUrl(p.ProductImage, p.ProductName, getCategoryName(p.CategoryID), p.Model)}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xs object-cover border border-black/10 bg-[#f4f0ea] group-hover:scale-105 transition-transform"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setCameraTargetProduct(p);
                                setIsCameraModalOpen(true);
                              }}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center rounded-xs text-amber-300 transition-opacity cursor-pointer"
                              title="Capture hardware photo via camera"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1a1a1a] truncate">{p.ProductName}</p>
                            {p.SerialNumber && (
                              <span className="block text-[10px] font-normal text-black/40 font-mono">
                                SN: {p.SerialNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-black/60 font-light">{getCategoryName(p.CategoryID)}</td>
                      <td className="py-3 px-4 text-black/60 font-light">{getBrandName(p.BrandID)}</td>
                      <td className="py-3 px-4 text-black/50 font-light">{p.Model || '—'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono font-semibold text-xs border ${isOut
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : isLow
                              ? 'bg-amber-50 border-amber-200 text-amber-900'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            }`}
                        >
                          {qty}
                          {isOut && ' (Out)'}
                          {isLow && ' (Low)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-serif text-black/60">{formatCurrency(p.CostPrice)}</td>
                      <td className="py-3 px-4 font-serif font-bold text-[#1a1a1a]">{formatCurrency(p.SellingPrice)}</td>
                      <td className="py-3 px-4 text-black/50 font-light">{getSupplierName(p.SupplierID)}</td>
                      <td className="py-3 px-4 text-black/50 font-light">{p.Location || 'Main Store'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono tracking-wider font-semibold border ${p.Status === 'Active'
                            ? 'bg-[#f4f0ea] border-black/15 text-[#1a1a1a]'
                            : p.Status === 'Archived'
                              ? 'bg-black/5 border-black/10 text-black/50'
                              : 'bg-black/5 border-black/10 text-black/70'
                            }`}
                        >
                          {p.Status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                          {/* Snap photo via camera */}
                          <button
                            type="button"
                            onClick={() => {
                              setCameraTargetProduct(p);
                              setIsCameraModalOpen(true);
                            }}
                            className="p-1.5 text-black/40 hover:text-amber-600 hover:bg-amber-50 rounded-sm transition-colors cursor-pointer"
                            title="Capture/Update photo via Camera"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>

                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => setViewingProduct(p)}
                            className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded-sm transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Adjust stock */}
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingProduct(p);
                              setAdjustQty(1);
                              setAdjustType('IN');
                            }}
                            className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded-sm transition-colors cursor-pointer"
                            title="Adjust Stock"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded-sm transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Archive */}
                          {p.Status !== 'Archived' && (
                            <button
                              type="button"
                              onClick={() => setArchivingProduct(p)}
                              className="p-1.5 text-black/40 hover:text-rose-700 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                              title="Archive Product"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredProducts.length > 0 && (
          <div className="p-3.5 border-t border-black/10 bg-[#fcfaf7] flex items-center justify-between text-xs text-black/50 font-light">
            <span>
              Showing {Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)} to{' '}
              {Math.min(filteredProducts.length, currentPage * itemsPerPage)} of {filteredProducts.length} items
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 rounded-sm border border-black/15 bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] text-[10px] uppercase tracking-wider font-semibold disabled:opacity-30 transition-colors"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-xs font-semibold text-[#1a1a1a]">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 rounded-sm border border-black/15 bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] text-[10px] uppercase tracking-wider font-semibold disabled:opacity-30 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-sm shadow-2xl border border-black/20 overflow-hidden my-8">
            <div className="p-6 border-b border-black/10 bg-[#fcfaf7] flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-[#1a1a1a]">
                {editingProduct ? `Edit Product: ${editingProduct.ProductName}` : 'Add New Hardware Product'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-black/40 hover:text-black p-1 rounded-sm hover:bg-black/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              {/* Product Visual Photo / Camera Capture Banner */}
              <div className="p-4 bg-[#fcfaf7] border border-black/10 rounded-xs flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={
                      formData.ProductImage ||
                      getProductImageUrl('', formData.ProductName || '', getCategoryName(formData.CategoryID || ''), formData.Model)
                    }
                    alt="Hardware preview"
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-xs object-cover border border-black/15 bg-white shadow-xs"
                  />
                  {formData.ProductImage && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, ProductImage: '' })}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-rose-700 shadow-xs cursor-pointer"
                      title="Remove custom photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em]">
                      Product Photo & Visual Asset
                    </span>
                    {formData.ProductImage && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-100 text-emerald-800 font-mono font-medium">
                        Custom Image Attached
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-black/50 font-light">
                    Capture serial barcode plates or hardware packaging with your camera, or upload a photo.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTargetProduct(null);
                        setIsCameraModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-300" />
                      <span>Snap with Camera</span>
                    </button>

                    <label className="px-3 py-1.5 border border-black/15 hover:border-black bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>Upload File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const maxDim = 800;
                              let w = img.width;
                              let h = img.height;
                              if (w > maxDim || h > maxDim) {
                                if (w > h) {
                                  h = Math.round((h * maxDim) / w);
                                  w = maxDim;
                                } else {
                                  w = Math.round((w * maxDim) / h);
                                  h = maxDim;
                                }
                              }
                              canvas.width = w;
                              canvas.height = h;
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.drawImage(img, 0, 0, w, h);
                                setFormData({ ...formData, ProductImage: canvas.toDataURL('image/jpeg', 0.85) });
                              }
                            };
                            img.src = ev.target?.result as string;
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>

                    {formData.ProductImage && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, ProductImage: '' })}
                        className="px-2.5 py-1.5 text-rose-600 hover:text-rose-800 text-[10px] uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                      >
                        Clear Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SKU */}
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.SKU || ''}
                    onChange={(e) => setFormData({ ...formData, SKU: e.target.value })}
                    placeholder="HP-840-G8-001"
                    className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
                  />
                </div>

                {/* Product Name */}
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ProductName || ''}
                    onChange={(e) => setFormData({ ...formData, ProductName: e.target.value })}
                    placeholder="HP EliteBook 840 G8 Core i7"
                    className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                  />
                </div>

                {/* Category Selection - loaded directly from PostgreSQL */}
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Category (CategoryID) *
                  </label>
                  <select
                    required
                    value={formData.CategoryID || ''}
                    onChange={(e) => setFormData({ ...formData, CategoryID: e.target.value })}
                    disabled={isLoadingReferenceData || formCategories.length === 0}
                    className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a] disabled:opacity-60"
                  >
                    <option value="">
                      {isLoadingReferenceData ? 'Loading categories from database...' : 'Select Category'}
                    </option>
                    {formCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand Selection - loaded directly from PostgreSQL */}
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Brand (BrandID) *
                  </label>
                  <select
                    required
                    value={formData.BrandID || ''}
                    onChange={(e) => setFormData({ ...formData, BrandID: e.target.value })}
                    disabled={isLoadingReferenceData || formBrands.length === 0}
                    className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a] disabled:opacity-60"
                  >
                    <option value="">
                      {isLoadingReferenceData ? 'Loading brands from database...' : 'Select Brand'}
                    </option>
                    {formBrands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.Model || ''}
                    onChange={(e) => setFormData({ ...formData, Model: e.target.value })}
                    placeholder="EliteBook 840 G8"
                    className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                  />
                </div>

                {/* Serial Number */}
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={formData.SerialNumber || ''}
                    onChange={(e) => setFormData({ ...formData, SerialNumber: e.target.value })}
                    placeholder="5CD1234XYZ"
                    className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.Quantity ?? 0}
                    onChange={(e) => setFormData({ ...formData, Quantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                  />
                </div>

                {/* Reorder Level */}
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Reorder Alert Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.ReorderLevel ?? 5}
                    onChange={(e) => setFormData({ ...formData, ReorderLevel: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Cost Price (₦) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.CostPrice ?? 0}
                    onChange={(e) => setFormData({ ...formData, CostPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Selling Price (₦) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.SellingPrice ?? 0}
                    onChange={(e) => setFormData({ ...formData, SellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono font-bold text-[#1a1a1a]"
                  />
                </div>

                {/* Supplier Selection - loaded directly from PostgreSQL */}
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Supplier (SupplierID)
                  </label>
                  <select
                    value={formData.SupplierID || ''}
                    onChange={(e) => setFormData({ ...formData, SupplierID: e.target.value })}
                    disabled={isLoadingReferenceData || formSuppliers.length === 0}
                    className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a] disabled:opacity-60"
                  >
                    <option value="">
                      {isLoadingReferenceData ? 'Loading suppliers from database...' : 'Select Supplier (Optional)'}
                    </option>
                    {formSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                    Warehouse / Shelf Location
                  </label>
                  <input
                    type="text"
                    value={formData.Location || ''}
                    onChange={(e) => setFormData({ ...formData, Location: e.target.value })}
                    placeholder="Shelf A-3 / Showroom"
                    className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                  Product Description & Technical Specs
                </label>
                <textarea
                  rows={2}
                  value={formData.Description || ''}
                  onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                  placeholder="Core i7 11th Gen, 16GB RAM, 512GB NVMe SSD, 14 FHD display, Backlit Keyboard..."
                  className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                  Status
                </label>
                <select
                  value={formData.Status || 'Active'}
                  onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
                  className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-black/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmittingForm}
                  className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-black/70 bg-[#f4f0ea] hover:bg-black/10 rounded-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-5 py-2 text-[10px] uppercase tracking-wider font-semibold text-[#fcfaf7] bg-[#1a1a1a] hover:bg-black rounded-sm shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmittingForm ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Saving Product...</span>
                    </>
                  ) : (
                    <span>Save Product</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-sm shadow-2xl border border-black/20 overflow-hidden">
            <div className="p-5 border-b border-black/10 bg-[#fcfaf7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-sm bg-[#1a1a1a] text-[#fcfaf7]">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1a1a1a]">Adjust Product Stock</h3>
                  <p className="text-[11px] text-black/50 truncate max-w-[240px] font-light">
                    {adjustingProduct.ProductName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-black/40 hover:text-black p-1 rounded-sm hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4">
              {/* Previous / Current Stock Preview */}
              <div className="p-3 rounded-sm bg-[#fcfaf7] border border-black/10 flex items-center justify-between text-xs">
                <div>
                  <span className="text-black/50 font-light">Current Stock:</span>
                  <p className="text-base font-serif font-bold text-[#1a1a1a]">{parseNumber(adjustingProduct.Quantity)} units</p>
                </div>
                <div className="text-right">
                  <span className="text-black/50 font-light">Calculated New Stock:</span>
                  <p className={`text-base font-serif font-bold ${adjustType === 'IN'
                    ? 'text-emerald-800'
                    : parseNumber(adjustingProduct.Quantity) - adjustQty < 0
                      ? 'text-rose-800'
                      : 'text-amber-900'
                    }`}>
                    {adjustType === 'IN'
                      ? parseNumber(adjustingProduct.Quantity) + adjustQty
                      : Math.max(0, parseNumber(adjustingProduct.Quantity) - adjustQty)}{' '}
                    units
                  </p>
                </div>
              </div>

              {/* Adjustment Direction */}
              <div>
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('IN')}
                    className={`py-2 text-[10px] uppercase tracking-wider font-semibold rounded-sm border transition-all ${adjustType === 'IN'
                      ? 'bg-[#1a1a1a] border-black text-[#fcfaf7] shadow-xs'
                      : 'bg-white border-black/15 text-black/70 hover:bg-[#f4f0ea]'
                      }`}
                  >
                    + Add Stock (IN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('OUT')}
                    className={`py-2 text-[10px] uppercase tracking-wider font-semibold rounded-sm border transition-all ${adjustType === 'OUT'
                      ? 'bg-rose-900 border-rose-900 text-white shadow-xs'
                      : 'bg-white border-black/15 text-black/70 hover:bg-[#f4f0ea]'
                      }`}
                  >
                    - Remove Stock (OUT)
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                  Units to Adjust
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full p-2.5 text-sm font-serif font-bold bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Physical inventory recount, damaged item, customer sample..."
                  className="w-full p-2.5 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                />
              </div>

              <div className="pt-3 border-t border-black/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  disabled={isSubmittingAdjust}
                  className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-black/70 bg-[#f4f0ea] hover:bg-black/10 rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="px-5 py-2 text-[10px] uppercase tracking-wider font-semibold text-[#fcfaf7] bg-[#1a1a1a] hover:bg-black rounded-sm shadow-xs flex items-center gap-2"
                >
                  {isSubmittingAdjust ? 'Submitting...' : 'Apply Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Product Details Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-sm shadow-2xl border border-black/20 overflow-hidden">
            <div className="p-6 border-b border-black/10 bg-[#fcfaf7] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-black/50 uppercase tracking-[0.2em] block mb-0.5">
                  {viewingProduct.SKU}
                </span>
                <h3 className="text-base font-serif font-bold text-[#1a1a1a]">{viewingProduct.ProductName}</h3>
              </div>
              <button
                onClick={() => setViewingProduct(null)}
                className="text-black/40 hover:text-black p-1 rounded-sm hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-sm bg-[#fcfaf7] border border-black/10">
                  <span className="text-black/40 text-[10px] uppercase tracking-wider block mb-0.5">Category</span>
                  <span className="font-medium text-[#1a1a1a]">{getCategoryName(viewingProduct.CategoryID)}</span>
                </div>
                <div className="p-3 rounded-sm bg-[#fcfaf7] border border-black/10">
                  <span className="text-black/40 text-[10px] uppercase tracking-wider block mb-0.5">Brand</span>
                  <span className="font-medium text-[#1a1a1a]">{getBrandName(viewingProduct.BrandID)}</span>
                </div>
                <div className="p-3 rounded-sm bg-[#fcfaf7] border border-black/10">
                  <span className="text-black/40 text-[10px] uppercase tracking-wider block mb-0.5">Current Stock</span>
                  <span className="font-serif font-bold text-[#1a1a1a] text-sm">{viewingProduct.Quantity} Units</span>
                </div>
                <div className="p-3 rounded-sm bg-[#fcfaf7] border border-black/10">
                  <span className="text-black/40 text-[10px] uppercase tracking-wider block mb-0.5">Reorder Limit</span>
                  <span className="font-serif font-medium text-[#1a1a1a]">{viewingProduct.ReorderLevel ?? 5} Units</span>
                </div>
                <div className="p-3 rounded-sm bg-[#fcfaf7] border border-black/10">
                  <span className="text-black/40 text-[10px] uppercase tracking-wider block mb-0.5">Cost Price</span>
                  <span className="font-serif font-medium text-black/70">{formatCurrency(viewingProduct.CostPrice)}</span>
                </div>
                <div className="p-3 rounded-sm bg-[#fcfaf7] border border-black/10">
                  <span className="text-black/40 text-[10px] uppercase tracking-wider block mb-0.5">Selling Price</span>
                  <span className="font-serif font-bold text-[#1a1a1a] text-sm">{formatCurrency(viewingProduct.SellingPrice)}</span>
                </div>
                <div className="p-3 rounded-sm bg-[#fcfaf7] border border-black/10">
                  <span className="text-black/40 text-[10px] uppercase tracking-wider block mb-0.5">Supplier</span>
                  <span className="font-medium text-[#1a1a1a]">{getSupplierName(viewingProduct.SupplierID)}</span>
                </div>
                <div className="p-3 rounded-sm bg-[#fcfaf7] border border-black/10">
                  <span className="text-black/40 text-[10px] uppercase tracking-wider block mb-0.5">Location</span>
                  <span className="font-medium text-[#1a1a1a]">{viewingProduct.Location || 'Main Store'}</span>
                </div>
              </div>

              {viewingProduct.Description && (
                <div className="p-3 rounded-sm bg-[#fcfaf7] border border-black/10">
                  <span className="text-black/40 text-[10px] uppercase tracking-wider block mb-1">Specifications & Description</span>
                  <p className="text-black/70 leading-relaxed font-light">{viewingProduct.Description}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingProduct(null)}
                  className="px-4 py-2 bg-[#f4f0ea] hover:bg-black/10 text-[#1a1a1a] font-semibold rounded-sm text-[10px] uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!archivingProduct}
        title="Archive Product"
        message={`Are you sure you want to archive "${archivingProduct?.ProductName}"? It will remain in historical records but marked as inactive in active catalogs.`}
        confirmText="Archive Product"
        isDangerous={false}
        isLoading={isSubmittingForm}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchivingProduct(null)}
      />

      {/* Hardware Camera Photo Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => {
          setIsCameraModalOpen(false);
          setCameraTargetProduct(null);
        }}
        onCapture={handlePhotoCaptured}
        productName={cameraTargetProduct?.ProductName}
      />

      {/* Bulk CSV Product Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={async () => {
          await Promise.all([
            refreshProducts(),
            refreshStockMovements(),
            refreshDashboard(),
          ]);
        }}
        existingProducts={products}
        categories={categories}
        brands={brands}
        suppliers={suppliers}
      />
    </div>
  );
};
