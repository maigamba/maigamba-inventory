import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Product, Sale, Customer } from '../types/inventory';
import { inventoryApi } from '../services/api';
import { formatCurrency, formatDate, parseNumber } from '../utils/formatters';
import { ReceiptModal } from './ReceiptModal';
import { playScannerBeep } from '../utils/audioBeep';
import { getProductImageUrl } from '../utils/productImages';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  User,
  CreditCard,
  Printer,
  History,
  Tag,
  Receipt,
  UserPlus,
  RefreshCw,
  X,
  Barcode,
  Volume2,
  VolumeX,
  Scan,
  Sparkles,
  ArrowRight,
  Package,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  itemDiscount: number;
}

export const POSView: React.FC = () => {
  const {
    products,
    categories,
    customers,
    sales,
    currentUser,
    refreshProducts,
    refreshSales,
    refreshStockMovements,
    refreshDashboard,
    refreshCustomers,
    getCustomerName,
    addToast,
    loading,
  } = useInventory();

  // Mode: POS register vs Sales History
  const [viewMode, setViewMode] = useState<'POS' | 'HISTORY'>('POS');

  // Product Catalog Filter in POS
  const [searchProduct, setSearchProduct] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [saleDiscount, setSaleDiscount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Quick Customer Creation
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Receipt Modal for newly completed sale or viewing historic sale
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Barcode Scanner Integration State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannerSound, setScannerSound] = useState(true);
  const [lastScanAlert, setLastScanAlert] = useState<{
    text: string;
    productName?: string;
    sku?: string;
    image?: string;
    success: boolean;
    timestamp: number;
  } | null>(null);
  const [isScannerActive, setIsScannerActive] = useState(true);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Filter available products (only active, in-stock or all active)
  const availableProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.Status === 'Archived') return false;
      const q = searchProduct.toLowerCase();
      const matchSearch =
        !q ||
        p.ProductName.toLowerCase().includes(q) ||
        p.SKU.toLowerCase().includes(q) ||
        (p.Model && p.Model.toLowerCase().includes(q));
      const matchCat = selectedCat === 'ALL' || p.CategoryID === selectedCat;
      return matchSearch && matchCat;
    });
  }, [products, searchProduct, selectedCat]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const lineTotal = item.unitPrice * item.quantity - item.itemDiscount;
      return acc + Math.max(0, lineTotal);
    }, 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    const afterDiscount = Math.max(0, subtotal - (Number(saleDiscount) || 0));
    return afterDiscount + (Number(taxAmount) || 0);
  }, [subtotal, saleDiscount, taxAmount]);

  // Effective amount paid & balance
  const effectivePaid = amountPaid === '' ? grandTotal : Number(amountPaid) || 0;
  const balance = Math.max(0, grandTotal - effectivePaid);

  const paymentStatus = useMemo(() => {
    if (grandTotal === 0) return 'Paid';
    if (effectivePaid >= grandTotal) return 'Paid';
    if (effectivePaid > 0) return 'Partial';
    return 'Credit';
  }, [grandTotal, effectivePaid]);

  // Add product to cart
  const addToCart = useCallback((product: Product) => {
    const availableStock = parseNumber(product.Quantity);
    if (availableStock <= 0) {
      addToast('warning', `"${product.ProductName}" is out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.ProductID === product.ProductID);
      if (existing) {
        if (existing.quantity + 1 > availableStock) {
          addToast('warning', `Cannot add more. Only ${availableStock} units available in stock.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.ProductID === product.ProductID
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: parseNumber(product.SellingPrice),
          itemDiscount: 0,
        },
      ];
    });
  }, [addToast]);

  // Barcode Lookup & Processing Handler (used by both hardware scanner and manual scan input)
  const processBarcodeScan = useCallback(
    (scannedRaw: string) => {
      const query = scannedRaw.trim();
      if (!query) return;

      const normalized = query.toLowerCase();

      // Search matching product by exact SKU, ProductID, SerialNumber, or Model
      const matched = products.find((p) => {
        if (p.Status === 'Archived') return false;
        return (
          p.SKU.toLowerCase() === normalized ||
          p.ProductID.toLowerCase() === normalized ||
          (p.SerialNumber && p.SerialNumber.toLowerCase() === normalized) ||
          (p.Model && p.Model.toLowerCase() === normalized) ||
          p.ProductName.toLowerCase() === normalized
        );
      });

      if (matched) {
        if (scannerSound) playScannerBeep(true);
        addToCart(matched);
        const img = getProductImageUrl(matched.ProductImage, matched.ProductName, undefined, matched.Model);
        setLastScanAlert({
          text: `Added "${matched.ProductName}" to order`,
          productName: matched.ProductName,
          sku: matched.SKU,
          image: img,
          success: true,
          timestamp: Date.now(),
        });
        addToast('success', `Scanned ${matched.SKU}: "${matched.ProductName}" added to cart.`, 'Scanner Read Success');
      } else {
        if (scannerSound) playScannerBeep(false);
        setLastScanAlert({
          text: `Barcode "${query}" not recognized in catalog.`,
          sku: query,
          success: false,
          timestamp: Date.now(),
        });
        addToast('error', `Barcode "${query}" is not mapped to any active inventory item.`, 'Unrecognized Barcode');
      }

      setBarcodeInput('');
    },
    [products, scannerSound, addToCart, addToast]
  );

  // Hardware Barcode Scanner Listener:
  // Listens globally for rapid keystroke bursts (< 50ms interval) terminated with 'Enter'
  useEffect(() => {
    if (!isScannerActive) return;

    let buffer = '';
    let lastKeyTime = 0;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      // If user is actively typing in a standard text input/textarea (other than barcode input), skip global capture
      const activeTag = document.activeElement?.tagName;
      const isInputFocused =
        (activeTag === 'INPUT' || activeTag === 'TEXTAREA') &&
        document.activeElement !== barcodeInputRef.current;

      const now = Date.now();
      const timeDiff = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        // If buffer was populated by scanner, handle it
        if (buffer.length >= 2 && !isInputFocused) {
          e.preventDefault();
          processBarcodeScan(buffer);
          buffer = '';
        }
        return;
      }

      // Single printable character
      if (e.key.length === 1) {
        // Scanner emits characters extremely fast (typically < 45ms per character)
        if (timeDiff > 80 && buffer.length > 0) {
          // Reset buffer if delay too long (human typing)
          buffer = '';
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isScannerActive, processBarcodeScan]);

  const updateQuantity = (productId: string, newQty: number) => {
    const product = products.find((p) => p.ProductID === productId);
    const availableStock = product ? parseNumber(product.Quantity) : 9999;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > availableStock) {
      addToast('warning', `Maximum available stock is ${availableStock} units.`);
      newQty = availableStock;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.ProductID === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.ProductID !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSaleDiscount(0);
    setTaxAmount(0);
    setAmountPaid('');
  };

  // Quick Customer Creation
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    const customerPayload = {
      CustomerID: `CUST-${Date.now().toString().slice(-6)}`,
      CustomerName: newCustomerName.trim(),
      Phone: newCustomerPhone.trim(),
      CustomerType: 'Retail',
      Status: 'Active',
      CreatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    const res = await inventoryApi.saveRecord('Customers', customerPayload);
    if (res.success) {
      addToast('success', `Customer "${customerPayload.CustomerName}" created.`);
      await refreshCustomers();
      setSelectedCustomerId(customerPayload.CustomerID);
      setIsAddCustomerOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } else {
      addToast('error', res.message || 'Failed to create customer.');
    }
  };

  // Complete Sale
  const handleCheckout = async () => {
    if (cart.length === 0) {
      addToast('warning', 'Cart is empty. Add products before checking out.');
      return;
    }

    // Stock verification
    for (const item of cart) {
      const liveProd = products.find((p) => p.ProductID === item.product.ProductID);
      const liveStock = liveProd ? parseNumber(liveProd.Quantity) : 0;
      if (item.quantity > liveStock) {
        addToast(
          'error',
          `Insufficient stock for "${item.product.ProductName}". Available: ${liveStock}, in cart: ${item.quantity}.`
        );
        return;
      }
    }

    setIsSubmittingSale(true);
    try {
      const saleItems = cart.map((item) => ({
        productId: String(item.product.ProductID || '').trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.itemDiscount) || 0,
      }));

      const finalPaid = amountPaid === '' ? grandTotal : Number(amountPaid) || 0;

      const salePayload = {
        CustomerID: selectedCustomerId || 'CUST-WALKIN',
        AmountPaid: finalPaid,
        Discount: Number(saleDiscount) || 0,
        Tax: Number(taxAmount) || 0,
        PaymentMethod: paymentMethod,
        CreatedBy: currentUser?.FullName || 'Admin Staff',
        items: saleItems,
      };

      const res = await inventoryApi.createSale(salePayload);

      if (res.success) {
        addToast('success', 'Sale completed successfully! Stock updated.');

        // Build invoice object to display
        const invoiceData: Sale = {
          SaleID: res.data?.SaleID || `SALE-${Date.now()}`,
          InvoiceNumber: res.data?.InvoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
          CustomerID: selectedCustomerId || 'CUST-WALKIN',
          SaleDate: new Date().toISOString(),
          Subtotal: subtotal,
          Discount: saleDiscount,
          Tax: taxAmount,
          TotalAmount: grandTotal,
          AmountPaid: finalPaid,
          Balance: balance,
          PaymentMethod: paymentMethod,
          PaymentStatus: paymentStatus,
          SaleStatus: 'Completed',
          CreatedBy: currentUser?.FullName || 'Admin Staff',
          items: cart.map((item) => ({
            ProductID: item.product.ProductID,
            ProductName: item.product.ProductName,
            Quantity: item.quantity,
            UnitPrice: item.unitPrice,
            Discount: item.itemDiscount,
          })),
        };

        setActiveReceiptSale(invoiceData);
        setIsReceiptOpen(true);
        clearCart();

        // Refresh live data
        await Promise.all([refreshProducts(), refreshSales(), refreshStockMovements(), refreshDashboard()]);
      } else {
        addToast('error', res.message || 'Failed to complete sale.');
      }
    } finally {
      setIsSubmittingSale(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <ShoppingCart className="h-4.5 w-4.5" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                Sales & Commerce
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Point of Sale
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Fast checkout, barcode scanning, real-time stock validation, and printable receipts.
            </p>
          </div>

          <div className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('POS')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${viewMode === 'POS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <ShoppingCart className="h-4 w-4" />
              POS Terminal
            </button>
            <button
              type="button"
              onClick={() => setViewMode('HISTORY')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${viewMode === 'HISTORY'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <History className="h-4 w-4" />
              Sales History
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                {sales.length}
              </span>
            </button>
          </div>
        </section>

        {viewMode === 'POS' ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,0.9fr)]">
            {/* Catalog */}
            <section className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-slate-900 p-4 text-white">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                        <Barcode className="h-5 w-5 text-emerald-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                          <h2 className="text-sm font-semibold">Barcode Scanner</h2>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                            {isScannerActive ? 'Listening' : 'Paused'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-white/50">
                          Scan SKU, product ID, serial number, model, or use manual entry.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setScannerSound(!scannerSound)}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                      title={scannerSound ? 'Scanner beep: on' : 'Scanner beep: off'}
                    >
                      {scannerSound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      {scannerSound ? 'Beep on' : 'Muted'}
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      processBarcodeScan(barcodeInput);
                    }}
                    className="mt-4 flex gap-2"
                  >
                    <div className="relative min-w-0 flex-1">
                      <Scan className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Scan barcode or enter SKU..."
                        className="h-11 w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-3 text-sm font-mono text-white outline-none placeholder:text-white/35 focus:border-emerald-400 focus:bg-white/15"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      <Barcode className="h-4 w-4" />
                      Scan
                    </button>
                    {products.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            processBarcodeScan(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="hidden h-11 max-w-[180px] rounded-xl border border-white/15 bg-white/10 px-3 text-xs text-white outline-none lg:block"
                        title="Simulate hardware barcode scan"
                      >
                        <option value="" disabled className="text-slate-900">
                          Simulate Scan...
                        </option>
                        {products.slice(0, 10).map((p) => (
                          <option key={p.ProductID} value={p.SKU} className="text-slate-900">
                            {p.SKU} - {p.ProductName.slice(0, 20)}
                          </option>
                        ))}
                      </select>
                    )}
                  </form>

                  {lastScanAlert && (
                    <div
                      className={`mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${lastScanAlert.success
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                        }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {lastScanAlert.image && (
                          <img
                            src={lastScanAlert.image}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 shrink-0 rounded-lg object-cover border border-white/10"
                          />
                        )}
                        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                          {lastScanAlert.sku}
                        </span>
                        <span className="truncate">{lastScanAlert.text}</span>
                      </div>
                      <span className="shrink-0 text-[10px] text-white/40">Just now</span>
                    </div>
                  )}
                </div>

                <div className="border-b border-slate-200 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchProduct}
                        onChange={(e) => setSearchProduct(e.target.value)}
                        placeholder="Search products by name, SKU, model..."
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      />
                    </div>

                    <select
                      value={selectedCat}
                      onChange={(e) => setSelectedCat(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="ALL">All Categories</option>
                      {categories.map((c) => (
                        <option key={c.CategoryID} value={c.CategoryID}>
                          {c.CategoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="max-h-[640px] overflow-y-auto p-4">
                  {availableProducts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
                      <Package className="mx-auto h-8 w-8 text-slate-300" />
                      <h3 className="mt-3 text-sm font-semibold text-slate-800">
                        No matching products
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Try another search term or category.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                      {availableProducts.map((p) => {
                        const stock = parseNumber(p.Quantity);
                        const isOut = stock <= 0;
                        const inCart = cart.find((c) => c.product.ProductID === p.ProductID);
                        const imageUrl = getProductImageUrl(
                          p.ProductImage,
                          p.ProductName,
                          undefined,
                          p.Model
                        );

                        return (
                          <button
                            key={p.ProductID}
                            type="button"
                            disabled={isOut}
                            onClick={() => addToCart(p)}
                            className={`group overflow-hidden rounded-2xl border text-left shadow-sm transition ${isOut
                                ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                                : inCart
                                  ? 'border-blue-300 bg-blue-50/30 ring-2 ring-blue-50'
                                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md'
                              }`}
                          >
                            <div className="relative h-36 overflow-hidden bg-slate-100">
                              <img
                                src={imageUrl}
                                alt={p.ProductName}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                              <span className="absolute left-3 top-3 rounded-lg bg-slate-950/80 px-2 py-1 font-mono text-[10px] font-bold text-white">
                                {p.SKU}
                              </span>
                              <span
                                className={`absolute right-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${isOut
                                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                                    : stock <= 3
                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                      : 'border-white/60 bg-white/90 text-slate-700'
                                  }`}
                              >
                                {isOut ? 'Out of stock' : `${stock} available`}
                              </span>
                            </div>

                            <div className="p-4">
                              <div className="min-h-[50px]">
                                <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                                  {p.ProductName}
                                </h3>
                                {p.Model && (
                                  <p className="mt-1 truncate text-xs text-slate-500">{p.Model}</p>
                                )}
                              </div>
                              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                <span className="text-base font-bold tabular-nums text-slate-950">
                                  {formatCurrency(p.SellingPrice)}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                                  {inCart ? `${inCart.quantity} in cart` : 'Add item'}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Checkout */}
            <aside className="xl:sticky xl:top-6 xl:self-start">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-950">Current Order</h2>
                      <p className="text-xs text-slate-500">{cart.length} distinct item(s)</p>
                    </div>
                  </div>

                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="border-b border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Customer
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddCustomerOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      New customer
                    </button>
                  </div>

                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="">Walk-in Retail Customer</option>
                    {customers.map((c) => (
                      <option key={c.CustomerID} value={c.CustomerID}>
                        {c.CustomerName} {c.Phone ? `(${c.Phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-[340px] overflow-y-auto px-4">
                  {cart.length === 0 ? (
                    <div className="py-14 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <ShoppingCart className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-slate-800">
                        Your cart is empty
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Select a hardware item from the catalog.
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => {
                      const lineTotal = item.unitPrice * item.quantity - item.itemDiscount;
                      return (
                        <div
                          key={item.product.ProductID}
                          className="flex gap-3 border-b border-slate-100 py-4 last:border-b-0"
                        >
                          <img
                            src={getProductImageUrl(
                              item.product.ProductImage,
                              item.product.ProductName,
                              undefined,
                              item.product.Model
                            )}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 bg-slate-100 object-cover"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {item.product.ProductName}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {formatCurrency(item.unitPrice)} each
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(item.product.ProductID, item.quantity - 1)
                                  }
                                  className="p-1.5 text-slate-500 hover:text-slate-900"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-8 text-center text-xs font-bold text-slate-900">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(item.product.ProductID, item.quantity + 1)
                                  }
                                  className="p-1.5 text-slate-500 hover:text-slate-900"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeFromCart(item.product.ProductID)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                title="Remove item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="shrink-0 text-right text-sm font-bold tabular-nums text-slate-900">
                            {formatCurrency(lineTotal)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="space-y-4 border-t border-slate-200 bg-slate-50/70 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Discount (₦)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={saleDiscount || ''}
                        onChange={(e) =>
                          setSaleDiscount(Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        placeholder="0.00"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-mono text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Tax / VAT (₦)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={taxAmount || ''}
                        onChange={(e) =>
                          setTaxAmount(Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        placeholder="0.00"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-mono text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Payment method
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['Cash', 'Bank Transfer', 'POS', 'Card'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`rounded-xl border px-2 py-2 text-[10px] font-semibold transition ${paymentMethod === method
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-600">
                        Amount paid (₦)
                      </label>
                      <button
                        type="button"
                        onClick={() => setAmountPaid(grandTotal)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Exact amount
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={amountPaid}
                      onChange={(e) =>
                        setAmountPaid(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                      }
                      placeholder={grandTotal.toString()}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold tabular-nums text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div className="space-y-2 border-t border-slate-200 pt-3 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(subtotal)}</span>
                    </div>
                    {saleDiscount > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Discount</span>
                        <span className="font-semibold text-rose-600">
                          -{formatCurrency(saleDiscount)}
                        </span>
                      </div>
                    )}
                    {taxAmount > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Tax / VAT</span>
                        <span className="font-semibold text-slate-700">
                          +{formatCurrency(taxAmount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-3">
                      <span className="font-semibold text-slate-900">Total</span>
                      <span className="text-xl font-bold tabular-nums text-slate-950">
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Outstanding</span>
                      <span
                        className={`font-bold tabular-nums ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                      >
                        {formatCurrency(balance)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Payment status</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                        {paymentStatus}
                      </span>
                    </div>
                  </div>

                  <button
                    id="btn-complete-sale"
                    type="button"
                    disabled={cart.length === 0 || isSubmittingSale}
                    onClick={handleCheckout}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmittingSale ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Processing sale...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Complete Sale
                        <span className="ml-1 rounded-lg bg-white/15 px-2 py-0.5 text-xs">
                          {formatCurrency(grandTotal)}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </section>
            </aside>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Sales History</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Completed sales, invoices, payment status, and receivables.
                </p>
              </div>
              <button
                type="button"
                onClick={() => refreshSales()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    {[
                      'Invoice',
                      'Date',
                      'Customer',
                      'Total',
                      'Paid',
                      'Balance',
                      'Method',
                      'Status',
                      'Action',
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <Receipt className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-sm font-semibold text-slate-800">
                          No completed sales yet
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Complete a sale from the POS terminal to create an invoice.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => (
                      <tr key={sale.SaleID} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <div className="font-mono text-sm font-semibold text-slate-900">
                            {sale.InvoiceNumber || sale.SaleID}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-400">{sale.SaleID}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                          {formatDate(sale.SaleDate || sale.CreatedAt)}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-800">
                          {getCustomerName(sale.CustomerID)}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold tabular-nums text-slate-950">
                          {formatCurrency(sale.TotalAmount)}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold tabular-nums text-slate-700">
                          {formatCurrency(sale.AmountPaid)}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold tabular-nums text-rose-600">
                          {formatCurrency(sale.Balance)}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          {sale.PaymentMethod || 'Cash'}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${sale.PaymentStatus === 'Paid'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : sale.PaymentStatus === 'Partial'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-rose-200 bg-rose-50 text-rose-700'
                              }`}
                          >
                            {sale.PaymentStatus || 'Paid'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReceiptSale(sale);
                              setIsReceiptOpen(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Quick Add Customer Modal */}
        {isAddCustomerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">New Customer</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Create a customer without leaving the POS.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleQuickAddCustomer} className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Customer full name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Alhaji Danladi / Zenith Bank PLC"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Phone number
                  </label>
                  <input
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="+234 803 123 4567"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Save Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ReceiptModal
          sale={activeReceiptSale}
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setActiveReceiptSale(null);
          }}
          onNewSale={() => {
            setViewMode('POS');
            clearCart();
          }}
        />
      </div>
    </div>
  );

};
