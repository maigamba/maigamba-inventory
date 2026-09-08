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
    <div className="p-4 sm:p-8 lg:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Top Mode Selector & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-serif font-semibold text-[#1a1a1a] tracking-tight">
              Point of Sale & Commerce
            </h2>
            <span className="text-[9px] font-mono uppercase tracking-widest text-black/40 border border-black/15 px-1.5 py-0.2">
              TERMINAL
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-black/50 mt-1">
            Instant retail checkout, automated stock decrement, and invoice printing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#f4f0ea] rounded-sm border border-black/10 flex items-center">
            <button
              type="button"
              onClick={() => setViewMode('POS')}
              className={`px-3.5 py-1.5 rounded-sm text-[10px] uppercase tracking-[0.15em] font-semibold flex items-center gap-1.5 transition-all ${viewMode === 'POS'
                ? 'bg-[#1a1a1a] text-white shadow-xs'
                : 'text-black/60 hover:text-black'
                }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>POS Terminal</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('HISTORY')}
              className={`px-3.5 py-1.5 rounded-sm text-[10px] uppercase tracking-[0.15em] font-semibold flex items-center gap-1.5 transition-all ${viewMode === 'HISTORY'
                ? 'bg-[#1a1a1a] text-white shadow-xs'
                : 'text-black/60 hover:text-black'
                }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Sales Archive ({sales.length})</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'POS' ? (
        /* Point of Sale Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Product Selection Catalog (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Barcode Scanner Bar & Hardware Listener Status */}
            <div className="bg-[#1a1a1a] text-white p-3.5 rounded-sm border border-black/10 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Barcode className="w-4 h-4 text-emerald-400" />
                    <span>Barcode Scanner Connected</span>
                  </div>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-white/10 rounded-xs text-white/70">
                    Listening for Input
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScannerSound(!scannerSound)}
                    className={`p-1.5 rounded-sm text-xs transition-colors flex items-center gap-1 ${scannerSound ? 'text-emerald-300 bg-white/10' : 'text-white/40 hover:text-white'
                      }`}
                    title={scannerSound ? 'Scanner Beep: On' : 'Scanner Beep: Muted'}
                  >
                    {scannerSound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span className="text-[10px] hidden md:inline">{scannerSound ? 'Beep On' : 'Muted'}</span>
                  </button>
                </div>
              </div>

              {/* Barcode input with scan button and quick simulator test */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  processBarcodeScan(barcodeInput);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Scan className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan barcode beam or enter product SKU/code..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white/10 border border-white/20 rounded-sm text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-400 focus:bg-white/15 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-sm text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Barcode className="w-3.5 h-3.5" />
                  <span>Scan</span>
                </button>

                {/* Quick Test Scanner Dropdown */}
                {products.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        processBarcodeScan(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="py-2 px-2.5 text-[10px] bg-white/10 border border-white/20 rounded-sm text-white/80 focus:outline-none focus:border-white shrink-0 max-w-[140px]"
                    title="Simulate hardware barcode beam"
                  >
                    <option value="" disabled className="text-black">
                      Simulate Scan...
                    </option>
                    {products.slice(0, 10).map((p) => (
                      <option key={p.ProductID} value={p.SKU} className="text-black">
                        {p.SKU} - {p.ProductName.slice(0, 20)}
                      </option>
                    ))}
                  </select>
                )}
              </form>

              {/* Live Scanner Flash Confirmation */}
              {lastScanAlert && (
                <div
                  className={`p-2 rounded-xs flex items-center justify-between text-xs transition-all ${lastScanAlert.success
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {lastScanAlert.image && (
                      <img
                        src={lastScanAlert.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-xs object-cover border border-white/20 shrink-0"
                      />
                    )}
                    <span className="font-mono font-bold text-[10px] uppercase bg-white/10 px-1 py-0.5 rounded-xs">
                      {lastScanAlert.sku}
                    </span>
                    <span className="truncate">{lastScanAlert.text}</span>
                  </div>
                  <span className="text-[9px] opacity-70 font-mono shrink-0 ml-2">Just now</span>
                </div>
              )}
            </div>

            <div className="bg-white p-4 border border-black/10 rounded-sm shadow-none space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                {/* Search */}
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                  <input
                    type="text"
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    placeholder="Search products by title, SKU, specs..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#f4f0ea] border border-black/10 rounded-sm focus:bg-white focus:outline-none focus:border-black text-[#1a1a1a]"
                  />
                </div>

                {/* Category Pills / Select */}
                <div className="w-full sm:w-48">
                  <select
                    value={selectedCat}
                    onChange={(e) => setSelectedCat(e.target.value)}
                    className="w-full py-2 px-3 text-xs bg-[#f4f0ea] border border-black/10 rounded-sm focus:bg-white focus:outline-none focus:border-black text-[#1a1a1a]"
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
            </div>

            {/* Product Grid with Images */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {availableProducts.length === 0 ? (
                <div className="col-span-2 py-16 text-center text-black/40 bg-white border border-black/10 rounded-sm">
                  <p className="font-serif text-sm font-semibold text-[#1a1a1a]">No matching catalog items found</p>
                  <p className="text-xs text-black/40 mt-1 font-light">Try another query or adjust category filter.</p>
                </div>
              ) : (
                availableProducts.map((p) => {
                  const stock = parseNumber(p.Quantity);
                  const isOut = stock <= 0;
                  const inCart = cart.find((c) => c.product.ProductID === p.ProductID);
                  const imageUrl = getProductImageUrl(p.ProductImage, p.ProductName, undefined, p.Model);

                  return (
                    <button
                      key={p.ProductID}
                      type="button"
                      disabled={isOut}
                      onClick={() => addToCart(p)}
                      className={`border text-left flex flex-col justify-between transition-all rounded-sm group overflow-hidden ${isOut
                        ? 'bg-[#f4f0ea]/50 border-black/10 opacity-60 cursor-not-allowed'
                        : inCart
                          ? 'bg-[#fcfaf7] border-black shadow-xs'
                          : 'bg-white border-black/10 hover:border-black hover:shadow-xs'
                        }`}
                    >
                      {/* Product Photography Thumbnail */}
                      <div className="relative w-full h-32 bg-[#f4f0ea] overflow-hidden border-b border-black/5">
                        <img
                          src={imageUrl}
                          alt={p.ProductName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2">
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-black/75 backdrop-blur-xs text-white rounded-xs">
                            {p.SKU}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider font-semibold border shadow-xs ${isOut
                              ? 'border-rose-300 bg-rose-50 text-rose-800'
                              : stock <= 3
                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                : 'border-black/15 bg-white/95 text-black/80'
                              }`}
                          >
                            {isOut ? 'Out of Stock' : `${stock} avail`}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-serif font-bold text-[#1a1a1a] line-clamp-2 leading-snug group-hover:text-black">
                            {p.ProductName}
                          </h4>
                          {p.Model && <p className="text-[11px] text-black/50 mt-0.5 font-light truncate">{p.Model}</p>}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between">
                          <span className="text-sm font-serif font-bold text-[#1a1a1a]">
                            {formatCurrency(p.SellingPrice)}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-black/60 group-hover:text-black flex items-center gap-1">
                            {inCart ? `${inCart.quantity} in cart` : '+ Add item'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Cart & Checkout Register (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-black/10 rounded-sm shadow-none flex flex-col h-full">
              {/* Cart Header */}
              <div className="p-4 border-b border-black/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 border border-black/10 bg-[#fcfaf7] text-[#1a1a1a]">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-serif font-bold text-[#1a1a1a]">Current Order Basket</h3>
                    <p className="text-[10px] uppercase tracking-widest text-black/40 font-mono">{cart.length} distinct item(s)</p>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[10px] uppercase tracking-wider font-semibold text-rose-700 hover:text-rose-900 underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Customer Selector */}
              <div className="p-4 border-b border-black/10 bg-[#fcfaf7] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-black/60 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <User className="w-3 h-3 text-black/40" />
                    <span>Customer Account</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="text-[10px] uppercase tracking-wider font-semibold text-[#1a1a1a] hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>New Account</span>
                  </button>
                </div>

                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full py-2 px-3 text-xs bg-white border border-black/15 rounded-sm focus:border-black text-[#1a1a1a]"
                >
                  <option value="">Walk-in Retail Customer</option>
                  {customers.map((c) => (
                    <option key={c.CustomerID} value={c.CustomerID}>
                      {c.CustomerName} {c.Phone ? `(${c.Phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cart Items List */}
              <div className="p-4 flex-1 overflow-y-auto max-h-[300px] divide-y divide-black/5">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-black/40 text-xs">
                    <ShoppingCart className="w-7 h-7 mx-auto text-black/30 mb-2" />
                    <p className="font-serif font-semibold text-[#1a1a1a]">Register basket is empty</p>
                    <p className="text-[11px] text-black/40 font-light mt-1">Select hardware items from the catalog.</p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const lineTotal = item.unitPrice * item.quantity - item.itemDiscount;
                    return (
                      <div key={item.product.ProductID} className="py-3 flex items-start justify-between gap-3">
                        <img
                          src={getProductImageUrl(item.product.ProductImage, item.product.ProductName, undefined, item.product.Model)}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-xs object-cover border border-black/10 shrink-0 mt-0.5 bg-[#f4f0ea]"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-semibold text-[#1a1a1a] truncate">
                            {item.product.ProductName}
                          </h5>
                          <p className="text-[11px] text-black/50 font-serif">
                            {formatCurrency(item.unitPrice)} each
                          </p>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center border border-black/20 rounded-sm bg-[#fcfaf7]">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.ProductID, item.quantity - 1)}
                                className="p-1 hover:bg-black/10 text-black/70"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-mono font-bold text-[#1a1a1a]">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.ProductID, item.quantity + 1)}
                                className="p-1 hover:bg-black/10 text-black/70"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.ProductID)}
                              className="text-black/40 hover:text-rose-600 p-1"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-serif font-bold text-[#1a1a1a]">
                            {formatCurrency(lineTotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Payment Details & Calculations */}
              <div className="p-4 border-t border-black/10 bg-[#fcfaf7] space-y-3">
                {/* Discount & Tax inputs */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-black/60 mb-1">
                      Discount (₦)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={saleDiscount || ''}
                      onChange={(e) => setSaleDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0.00"
                      className="w-full p-2 bg-white border border-black/15 rounded-sm focus:border-black font-mono text-xs text-[#1a1a1a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-black/60 mb-1">
                      Tax / VAT (₦)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={taxAmount || ''}
                      onChange={(e) => setTaxAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0.00"
                      className="w-full p-2 bg-white border border-black/15 rounded-sm focus:border-black font-mono text-xs text-[#1a1a1a]"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-black/60 mb-1">
                    Settlement Method
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {['Cash', 'Bank Transfer', 'POS', 'Card'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-1.5 px-2 rounded-sm border text-[10px] uppercase tracking-wider font-semibold text-center truncate transition-all ${paymentMethod === method
                          ? 'bg-[#1a1a1a] border-black text-white'
                          : 'bg-white border-black/15 text-black/70 hover:bg-[#f4f0ea]'
                          }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Paid Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-black/60">
                      Amount Tendered (₦)
                    </label>
                    <button
                      type="button"
                      onClick={() => setAmountPaid(grandTotal)}
                      className="text-[10px] uppercase tracking-wider font-semibold text-[#1a1a1a] underline"
                    >
                      Exact (Paid in Full)
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    placeholder={grandTotal.toString()}
                    className="w-full p-2 text-sm font-serif font-bold bg-white border border-black/15 rounded-sm focus:border-black text-[#1a1a1a]"
                  />
                </div>

                {/* Breakdown Summary */}
                <div className="space-y-1.5 pt-2 border-t border-black/10 text-xs text-black/70">
                  <div className="flex justify-between">
                    <span>Gross Subtotal:</span>
                    <span className="font-serif font-semibold text-[#1a1a1a]">{formatCurrency(subtotal)}</span>
                  </div>
                  {saleDiscount > 0 && (
                    <div className="flex justify-between text-black/60">
                      <span>Deductions / Discount:</span>
                      <span className="font-serif font-semibold">-{formatCurrency(saleDiscount)}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Assessed Tax:</span>
                      <span className="font-serif font-semibold">+{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-serif font-bold text-[#1a1a1a] pt-1.5 border-t border-black/10">
                    <span>Total Invoiced:</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Outstanding Balance:</span>
                    <span className={`font-serif ${balance > 0 ? 'text-rose-700' : 'text-[#1a1a1a]'}`}>
                      {formatCurrency(balance)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-wider">
                    <span>Settlement Status:</span>
                    <span className="font-mono font-bold text-[#1a1a1a]">
                      {paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Checkout Submit Button */}
                <button
                  id="btn-complete-sale"
                  type="button"
                  disabled={cart.length === 0 || isSubmittingSale}
                  onClick={handleCheckout}
                  className="w-full py-3.5 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] font-semibold text-[10px] uppercase tracking-[0.2em] rounded-sm shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingSale ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Transcribing to Sheets...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Complete Sale & Issue Receipt ({formatCurrency(grandTotal)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Sales Orders History Table */
        <div className="bg-white border border-black/10 rounded-sm shadow-none overflow-hidden">
          <div className="p-4 border-b border-black/10 flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-[0.25em] text-black/40 font-medium">Archive</span>
              <h3 className="text-sm font-serif font-bold text-[#1a1a1a]">
                Completed Sales Orders & Invoices ({sales.length})
              </h3>
            </div>
            <button
              onClick={() => refreshSales()}
              className="p-1.5 text-black/50 hover:text-black border border-black/10 rounded-sm hover:bg-[#f4f0ea]"
              title="Refresh sales"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f0ea] border-b border-black/10 text-black/60 text-[9px] uppercase tracking-[0.2em] font-medium">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 text-[#1a1a1a]">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-black/40 font-light">
                      No sales orders found. Complete a sale in the POS terminal.
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.SaleID} className="hover:bg-[#fcfaf7]">
                      <td className="py-3 px-4 font-mono font-medium text-[#1a1a1a]">
                        {sale.InvoiceNumber || sale.SaleID}
                      </td>
                      <td className="py-3 px-4 text-black/50">{formatDate(sale.SaleDate || sale.CreatedAt)}</td>
                      <td className="py-3 px-4 font-medium text-[#1a1a1a]">{getCustomerName(sale.CustomerID)}</td>
                      <td className="py-3 px-4 font-serif font-bold text-[#1a1a1a]">{formatCurrency(sale.TotalAmount)}</td>
                      <td className="py-3 px-4 font-serif text-black/80">{formatCurrency(sale.AmountPaid)}</td>
                      <td className="py-3 px-4 font-serif text-black/60">{formatCurrency(sale.Balance)}</td>
                      <td className="py-3 px-4 text-black/60">{sale.PaymentMethod || 'Cash'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold border border-black/15 bg-[#fcfaf7] text-black/70">
                          {sale.PaymentStatus || 'Paid'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReceiptSale(sale);
                            setIsReceiptOpen(true);
                          }}
                          className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-[#1a1a1a] hover:bg-[#f4f0ea] border border-black/15 rounded-sm inline-flex items-center gap-1.5 ml-auto shadow-2xs transition-colors"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-sm shadow-xl border border-black/20 overflow-hidden">
            <div className="p-5 border-b border-black/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-[0.25em] text-black/40 font-medium">Record</span>
                <h3 className="text-sm font-serif font-bold text-[#1a1a1a]">Register Customer Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-black/40 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-black/60 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Alhaji Danladi / Zenith Bank PLC"
                  className="w-full p-2.5 bg-[#f4f0ea] border border-black/15 rounded-sm focus:bg-white focus:border-black text-[#1a1a1a]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-black/60 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="+234 803 123 4567"
                  className="w-full p-2.5 bg-[#f4f0ea] border border-black/15 rounded-sm focus:bg-white focus:border-black text-[#1a1a1a]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-3 py-2 text-black/60 hover:text-black border border-black/10 bg-white hover:bg-[#f4f0ea] rounded-sm text-[10px] uppercase tracking-wider font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] rounded-sm text-[10px] uppercase tracking-wider font-semibold"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print-Friendly Receipt & Invoice Modal */}
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
  );
};
