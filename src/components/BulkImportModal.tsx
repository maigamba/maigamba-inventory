import React, { useState, useRef } from 'react';
import { Product, Category, Brand, Supplier } from '../types/inventory';
import { inventoryApi } from '../services/api';
import { useInventory } from '../context/InventoryContext';
import { formatCurrency, parseNumber, generateId } from '../utils/formatters';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRight,
  RefreshCw,
  Layers,
  Database,
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  existingProducts: Product[];
  categories: Category[];
  brands: Brand[];
  suppliers: Supplier[];
}

interface ParsedRow {
  sku: string;
  name: string;
  category?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  location?: string;
  description?: string;
  isExisting: boolean;
  existingProduct?: Product;
  status: 'VALID' | 'WARNING' | 'ERROR';
  errorMessage?: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingProducts,
  categories,
  brands,
  suppliers,
}) => {
  const { addToast } = useInventory();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [qtyMode, setQtyMode] = useState<'REPLACE' | 'ADD'>('ADD');
  const [updatePrices, setUpdatePrices] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filterMode, setFilterMode] = useState<'ALL' | 'UPDATE' | 'NEW' | 'ERROR'>('ALL');

  if (!isOpen) return null;

  // Simple and robust CSV line splitter that handles quoted commas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const headers = [
      'SKU',
      'ProductName',
      'Category',
      'Brand',
      'Quantity',
      'CostPrice',
      'SellingPrice',
      'ReorderLevel',
      'Model',
      'SerialNumber',
      'Location',
      'Description',
    ];

    const sampleRow1 = [
      'DELL-LAT-5420-01',
      'Dell Latitude 5420 Core i5 11th Gen 16GB 512GB',
      'Laptops',
      'Dell',
      '10',
      '280000',
      '345000',
      '4',
      'Latitude 5420',
      'DL5420-98401',
      'Shelf B-02',
      'Business laptop with backlit keyboard and fingerprint reader',
    ];

    const sampleRow2 = [
      'HP-ENVY-13-X360',
      'HP Envy x360 13 OLED Ryzen 7 16GB 1TB SSD',
      'Laptops',
      'HP',
      '5',
      '410000',
      '485000',
      '3',
      'Envy 13',
      'HP-ENVY-4411',
      'Showroom Glass 1',
      'Convertible 2-in-1 touchscreen laptop with stylus',
    ];

    const sampleRow3 = [
      'LOGI-MX-MST3S',
      'Logitech MX Master 3S Wireless Performance Mouse',
      'Accessories',
      'Logitech',
      '25',
      '55000',
      '72000',
      '5',
      'MX Master 3S',
      'SN-LOGI-8821',
      'Accessories Bin A',
      'Ergonomic quiet click Bluetooth mouse with 8K DPI sensor',
    ];

    const csvLines = [
      headers.join(','),
      sampleRow1.map((c) => `"${c.replace(/"/g, '""')}"`).join(','),
      sampleRow2.map((c) => `"${c.replace(/"/g, '""')}"`).join(','),
      sampleRow3.map((c) => `"${c.replace(/"/g, '""')}"`).join(','),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Maigamba_Bulk_Product_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Process selected file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const rawLines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (rawLines.length < 2) {
        addToast('error', 'CSV file appears empty or missing header row.');
        return;
      }

      // Parse headers
      const headerLine = parseCSVLine(rawLines[0]);
      const headerMap: Record<string, number> = {};
      headerLine.forEach((h, idx) => {
        const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        headerMap[clean] = idx;
      });

      const getCol = (cols: string[], ...names: string[]): string => {
        for (const n of names) {
          const idx = headerMap[n.toLowerCase().replace(/[^a-z0-9]/g, '')];
          if (idx !== undefined && cols[idx] !== undefined) {
            return cols[idx].trim();
          }
        }
        return '';
      };

      const rows: ParsedRow[] = [];

      for (let i = 1; i < rawLines.length; i++) {
        const line = rawLines[i];
        if (!line) continue;

        const cols = parseCSVLine(line);

        const sku = getCol(cols, 'sku', 'productsku', 'itemcode', 'code');
        const name = getCol(cols, 'productname', 'name', 'itemname', 'title', 'description');
        const category = getCol(cols, 'category', 'categoryid', 'categoryname');
        const brand = getCol(cols, 'brand', 'brandid', 'brandname', 'manufacturer');
        const model = getCol(cols, 'model', 'modelno');
        const serialNumber = getCol(cols, 'serialnumber', 'serial', 'sn');
        const qtyRaw = getCol(cols, 'quantity', 'qty', 'stock', 'units');
        const costRaw = getCol(cols, 'costprice', 'cost', 'purchaseprice');
        const sellingRaw = getCol(cols, 'sellingprice', 'price', 'retailprice', 'unitprice');
        const reorderRaw = getCol(cols, 'reorderlevel', 'reorder', 'minstock');
        const location = getCol(cols, 'location', 'warehouse', 'shelf');
        const description = getCol(cols, 'description', 'specs', 'notes');

        if (!sku && !name) {
          continue; // Skip empty row
        }

        // Match against existing products
        const existing = existingProducts.find(
          (p) =>
            p.SKU.trim().toLowerCase() === (sku || '').trim().toLowerCase() ||
            (sku === '' && p.ProductName.trim().toLowerCase() === name.trim().toLowerCase())
        );

        let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';
        let errorMessage = '';

        if (!sku) {
          status = 'ERROR';
          errorMessage = 'Missing SKU';
        } else if (!name && !existing) {
          status = 'ERROR';
          errorMessage = 'Missing Product Name for new item';
        }

        const quantity = parseInt(qtyRaw, 10) || 0;
        const costPrice = parseFloat(costRaw) || 0;
        const sellingPrice = parseFloat(sellingRaw) || 0;
        const reorderLevel = parseInt(reorderRaw, 10) || 5;

        rows.push({
          sku: sku || (existing ? existing.SKU : `SKU-${Date.now()}-${i}`),
          name: name || (existing ? existing.ProductName : 'Unnamed Product'),
          category,
          brand,
          model,
          serialNumber,
          quantity,
          costPrice,
          sellingPrice,
          reorderLevel,
          location,
          description,
          isExisting: !!existing,
          existingProduct: existing,
          status,
          errorMessage,
        });
      }

      setParsedRows(rows);
      addToast('info', `Parsed ${rows.length} rows from CSV file.`);
    };

    reader.readAsText(file);
  };

  // Helper to match or fallback CategoryID
  const resolveCategoryID = (catName?: string): string => {
    if (!catName) return categories[0]?.CategoryID || 'CAT-001';
    const found = categories.find(
      (c) =>
        c.CategoryName.toLowerCase() === catName.toLowerCase() ||
        c.CategoryID.toLowerCase() === catName.toLowerCase()
    );
    return found ? found.CategoryID : categories[0]?.CategoryID || 'CAT-001';
  };

  // Helper to match or fallback BrandID
  const resolveBrandID = (brandName?: string): string => {
    if (!brandName) return brands[0]?.BrandID || 'BRD-001';
    const found = brands.find(
      (b) =>
        b.BrandName.toLowerCase() === brandName.toLowerCase() ||
        b.BrandID.toLowerCase() === brandName.toLowerCase()
    );
    return found ? found.BrandID : brands[0]?.BrandID || 'BRD-001';
  };

  // Execute Import
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.status !== 'ERROR');
    if (validRows.length === 0) {
      addToast('error', 'No valid rows available to import.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    let updatedCount = 0;
    let createdCount = 0;
    let errorsCount = 0;

    const total = validRows.length;

    for (let i = 0; i < total; i++) {
      const row = validRows[i];
      try {
        if (row.isExisting && row.existingProduct) {
          // UPDATE existing product
          const currentStock = parseNumber(row.existingProduct.Quantity);
          const finalQty = qtyMode === 'ADD' ? currentStock + row.quantity : row.quantity;

          const updatedPayload: Product = {
            ...row.existingProduct,
            ProductName: row.name || row.existingProduct.ProductName,
            Quantity: finalQty,
            ReorderLevel: row.reorderLevel > 0 ? row.reorderLevel : row.existingProduct.ReorderLevel,
            CostPrice: updatePrices && row.costPrice > 0 ? row.costPrice : row.existingProduct.CostPrice,
            SellingPrice: updatePrices && row.sellingPrice > 0 ? row.sellingPrice : row.existingProduct.SellingPrice,
            Model: row.model || row.existingProduct.Model,
            SerialNumber: row.serialNumber || row.existingProduct.SerialNumber,
            Location: row.location || row.existingProduct.Location,
            Description: row.description || row.existingProduct.Description,
            UpdatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          };

          const res = await inventoryApi.saveRecord('Products', updatedPayload);
          if (res.success) {
            updatedCount++;
            // Log stock movement if qty changed
            if (finalQty !== currentStock) {
              const diff = finalQty - currentStock;
              inventoryApi.saveRecord('StockMovements', {
                MovementID: generateId('MOV'),
                ProductID: row.existingProduct.ProductID,
                MovementType: diff > 0 ? 'PURCHASE_RECEIPT' : 'ADJUSTMENT_OUT',
                Quantity: Math.abs(diff),
                PreviousStock: currentStock,
                NewStock: finalQty,
                Reason: `Bulk CSV Import (${qtyMode === 'ADD' ? 'Added stock' : 'Replaced stock'})`,
                CreatedBy: 'CSV Bulk Import',
                CreatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
              }).catch(() => {});
            }
          } else {
            errorsCount++;
          }
        } else {
          // CREATE new product
          const newProduct: Product = {
            ProductID: generateId('PRD'),
            SKU: row.sku,
            ProductName: row.name,
            CategoryID: resolveCategoryID(row.category),
            BrandID: resolveBrandID(row.brand),
            Model: row.model || '',
            SerialNumber: row.serialNumber || '',
            Quantity: row.quantity,
            CostPrice: row.costPrice,
            SellingPrice: row.sellingPrice,
            ReorderLevel: row.reorderLevel || 5,
            SupplierID: suppliers[0]?.SupplierID || '',
            Location: row.location || 'Warehouse Stock',
            Description: row.description || '',
            Status: 'Active',
            CreatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
            UpdatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          };

          const res = await inventoryApi.saveRecord('Products', newProduct);
          if (res.success) {
            createdCount++;
            if (row.quantity > 0) {
              inventoryApi.saveRecord('StockMovements', {
                MovementID: generateId('MOV'),
                ProductID: newProduct.ProductID,
                MovementType: 'INITIAL_STOCK',
                Quantity: row.quantity,
                PreviousStock: 0,
                NewStock: row.quantity,
                Reason: 'Bulk CSV Import (New Item)',
                CreatedBy: 'CSV Bulk Import',
                CreatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
              }).catch(() => {});
            }
          } else {
            errorsCount++;
          }
        }
      } catch (err) {
        errorsCount++;
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsProcessing(false);
    addToast(
      'success',
      `Import Complete: ${updatedCount} updated, ${createdCount} created${errorsCount > 0 ? `, ${errorsCount} failed` : ''}.`,
      'Bulk Inventory Import'
    );

    await onSuccess();
    onClose();
  };

  const updateCount = parsedRows.filter((r) => r.isExisting && r.status !== 'ERROR').length;
  const newCount = parsedRows.filter((r) => !r.isExisting && r.status !== 'ERROR').length;
  const errorCount = parsedRows.filter((r) => r.status === 'ERROR').length;

  const displayedRows = parsedRows.filter((r) => {
    if (filterMode === 'UPDATE') return r.isExisting && r.status !== 'ERROR';
    if (filterMode === 'NEW') return !r.isExisting && r.status !== 'ERROR';
    if (filterMode === 'ERROR') return r.status === 'ERROR';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white border border-black/20 rounded-xs shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#1a1a1a] text-[#fcfaf7] flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xs bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif font-semibold text-white tracking-wide">
                  Bulk Product CSV Import & Reconciliation
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] bg-white/10 text-white/70 font-mono">
                  Catalog Ledger
                </span>
              </div>
              <p className="text-xs text-white/50 font-light">
                Upload CSV file to bulk create new hardware items or sync quantity & price updates.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-white/50 hover:text-white rounded-xs hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 bg-[#fcfaf7]">
          {/* File Dropzone & Template Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white border border-black/10 rounded-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-amber-300" />
                <span>{fileName ? 'Choose Another CSV...' : 'Select CSV File'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {fileName && (
                <span className="text-xs font-mono text-black/70 font-medium truncate max-w-xs">
                  {fileName}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 border border-black/15 hover:border-black bg-[#f4f0ea] hover:bg-[#eae4d9] text-[#1a1a1a] rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* Import Rules Configuration */}
          {parsedRows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white border border-black/10 rounded-xs">
              {/* Quantity Strategy */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em]">
                  Stock Quantity Strategy
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-[#1a1a1a] cursor-pointer">
                    <input
                      type="radio"
                      name="qtyMode"
                      checked={qtyMode === 'ADD'}
                      onChange={() => setQtyMode('ADD')}
                      className="accent-black"
                    />
                    <span>
                      <strong>Add to current stock</strong> (Replenishment)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#1a1a1a] cursor-pointer">
                    <input
                      type="radio"
                      name="qtyMode"
                      checked={qtyMode === 'REPLACE'}
                      onChange={() => setQtyMode('REPLACE')}
                      className="accent-black"
                    />
                    <span>
                      <strong>Replace quantity</strong> (Audit reset)
                    </span>
                  </label>
                </div>
              </div>

              {/* Price Updates */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em]">
                  Financial Overwrite
                </label>
                <label className="flex items-center gap-2 text-xs text-[#1a1a1a] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={updatePrices}
                    onChange={(e) => setUpdatePrices(e.target.checked)}
                    className="accent-black rounded-xs"
                  />
                  <span>Update Cost Price & Selling Price if values are provided in CSV</span>
                </label>
              </div>
            </div>
          )}

          {/* Summary KPI Badges */}
          {parsedRows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode('ALL')}
                  className={`px-3 py-1 rounded-xs font-mono text-[10px] uppercase font-semibold transition-all ${
                    filterMode === 'ALL'
                      ? 'bg-[#1a1a1a] text-white'
                      : 'bg-white border border-black/10 text-black/60 hover:text-black'
                  }`}
                >
                  All ({parsedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('UPDATE')}
                  className={`px-3 py-1 rounded-xs font-mono text-[10px] uppercase font-semibold transition-all ${
                    filterMode === 'UPDATE'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 border border-blue-200 text-blue-800'
                  }`}
                >
                  Updates ({updateCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('NEW')}
                  className={`px-3 py-1 rounded-xs font-mono text-[10px] uppercase font-semibold transition-all ${
                    filterMode === 'NEW'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                >
                  New Products ({newCount})
                </button>
                {errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterMode('ERROR')}
                    className={`px-3 py-1 rounded-xs font-mono text-[10px] uppercase font-semibold transition-all ${
                      filterMode === 'ERROR'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    Errors ({errorCount})
                  </button>
                )}
              </div>

              <span className="text-[11px] text-black/50 font-light">
                Ready to process {updateCount + newCount} valid hardware records
              </span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 ? (
            <div className="bg-white border border-black/10 rounded-xs overflow-hidden shadow-xs">
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f4f0ea] text-black/70 font-semibold uppercase tracking-[0.1em] text-[9px] sticky top-0 border-b border-black/10 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Action / Status</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-center">CSV Stock</th>
                      <th className="py-2.5 px-3 text-center">Current Stock</th>
                      <th className="py-2.5 px-3 text-center">Projected</th>
                      <th className="py-2.5 px-3 text-right">Cost Price</th>
                      <th className="py-2.5 px-3 text-right">Selling Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 text-[#1a1a1a]">
                    {displayedRows.map((row, idx) => {
                      const curStock = row.existingProduct
                        ? parseNumber(row.existingProduct.Quantity)
                        : 0;
                      const projected = row.isExisting
                        ? qtyMode === 'ADD'
                          ? curStock + row.quantity
                          : row.quantity
                        : row.quantity;

                      return (
                        <tr key={idx} className="hover:bg-[#fcfaf7]">
                          <td className="py-2 px-3">
                            {row.status === 'ERROR' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertCircle className="w-2.5 h-2.5" />
                                {row.errorMessage || 'Invalid'}
                              </span>
                            ) : row.isExisting ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                UPDATE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                + NEW PRODUCT
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-black/80">{row.sku}</td>
                          <td className="py-2 px-3 font-medium max-w-[200px] truncate">{row.name}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold">{row.quantity}</td>
                          <td className="py-2 px-3 text-center font-mono text-black/40">
                            {row.isExisting ? curStock : '—'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">
                            {projected}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-black/60">
                            {row.costPrice > 0 ? formatCurrency(row.costPrice) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#1a1a1a]">
                            {row.sellingPrice > 0 ? formatCurrency(row.sellingPrice) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 border-2 border-dashed border-black/15 rounded-xs text-center space-y-2.5 bg-white">
              <div className="w-10 h-10 mx-auto rounded-full bg-[#f4f0ea] flex items-center justify-center text-black/50">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-serif font-medium text-[#1a1a1a]">No CSV file selected</h4>
              <p className="text-xs text-black/50 max-w-sm mx-auto font-light">
                Select your computer inventory CSV file or download the template above to organize your hardware products.
              </p>
            </div>
          )}

          {/* Progress bar during batch import */}
          {isProcessing && (
            <div className="p-4 bg-white border border-black/10 rounded-xs space-y-2">
              <div className="flex justify-between text-xs font-mono text-[#1a1a1a]">
                <span>Processing Bulk Inventory Updates...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-[#f4f0ea] rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-200 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-black/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-black/60 hover:text-black transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isProcessing || parsedRows.length === 0 || updateCount + newCount === 0}
              className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-black disabled:opacity-40 disabled:pointer-events-none text-[#fcfaf7] rounded-xs text-[10px] uppercase tracking-widest font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Importing {progress}%...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-amber-300" />
                  <span>Execute Bulk Import ({updateCount + newCount} Items)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
