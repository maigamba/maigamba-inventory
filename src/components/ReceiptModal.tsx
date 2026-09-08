import React, { useState } from 'react';
import { Sale } from '../types/inventory';
import { useInventory } from '../context/InventoryContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Printer, X, Monitor, CheckCircle2, RotateCcw, FileText, Receipt, Copy, Check } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onNewSale?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
  onNewSale,
}) => {
  const { getCustomerName, getProductName, settings, addToast } = useInventory();
  const [receiptFormat, setReceiptFormat] = useState<'THERMAL' | 'INVOICE'>('THERMAL');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !sale) return null;

  const businessName = settings.BusinessName || 'Maigamba Computer Technology';
  const customerName = getCustomerName(sale.CustomerID) || 'Walk-in Retail Customer';
  const invoiceNum = sale.InvoiceNumber || sale.SaleID;
  const saleDateFormatted = formatDate(sale.SaleDate || sale.CreatedAt);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const lines = [
      `*** ${businessName.toUpperCase()} ***`,
      `RECEIPT: ${invoiceNum}`,
      `DATE: ${saleDateFormatted}`,
      `CUSTOMER: ${customerName}`,
      `CASHIER: ${sale.CreatedBy || 'Staff'}`,
      '----------------------------------------',
      ...(sale.items || []).map(
        (item) =>
          `${item.Quantity}x ${item.ProductName || getProductName(item.ProductID)} - ${formatCurrency((item.UnitPrice * item.Quantity) - (item.Discount || 0))}`
      ),
      '----------------------------------------',
      `SUBTOTAL: ${formatCurrency(sale.Subtotal || sale.TotalAmount)}`,
      Number(sale.Discount) > 0 ? `DISCOUNT: -${formatCurrency(sale.Discount)}` : '',
      Number(sale.Tax) > 0 ? `TAX / VAT: +${formatCurrency(sale.Tax)}` : '',
      `TOTAL: ${formatCurrency(sale.TotalAmount)}`,
      `AMOUNT PAID: ${formatCurrency(sale.AmountPaid)}`,
      `BALANCE: ${formatCurrency(sale.Balance)}`,
      `METHOD: ${sale.PaymentMethod || 'Cash'}`,
      '----------------------------------------',
      'Thank you for your patronage!',
      'Warranty: 3-day test guarantee on parts.',
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    addToast('success', 'Receipt summary copied to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div
        id="printable-receipt-modal"
        className={`w-full bg-white rounded-sm shadow-2xl border border-black/20 overflow-hidden my-6 transition-all print:border-0 print:shadow-none print:m-0 print:rounded-none print:w-full ${
          receiptFormat === 'THERMAL' ? 'max-w-md' : 'max-w-3xl'
        }`}
      >
        {/* Top Control Bar (Hidden on Print) */}
        <div className="p-4 bg-[#1a1a1a] text-white flex items-center justify-between border-b border-white/10 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] font-semibold text-white/60 uppercase tracking-[0.2em] block">
                Transaction Completed
              </span>
              <span className="text-xs text-white font-mono font-bold">{invoiceNum}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Toggle */}
            <div className="flex items-center bg-white/10 rounded-sm p-0.5 border border-white/15">
              <button
                type="button"
                onClick={() => setReceiptFormat('THERMAL')}
                className={`px-2.5 py-1 text-[9px] uppercase tracking-wider font-semibold rounded-xs flex items-center gap-1 transition-all ${
                  receiptFormat === 'THERMAL'
                    ? 'bg-white text-[#1a1a1a]'
                    : 'text-white/70 hover:text-white'
                }`}
                title="80mm Thermal Slip"
              >
                <Receipt className="w-3 h-3" />
                <span>Thermal (80mm)</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptFormat('INVOICE')}
                className={`px-2.5 py-1 text-[9px] uppercase tracking-wider font-semibold rounded-xs flex items-center gap-1 transition-all ${
                  receiptFormat === 'INVOICE'
                    ? 'bg-white text-[#1a1a1a]'
                    : 'text-white/70 hover:text-white'
                }`}
                title="Full A4 Tax Invoice"
              >
                <FileText className="w-3 h-3" />
                <span>Standard (A4)</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#fcfaf7] hover:bg-white text-[#1a1a1a] rounded-sm text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-white/50 hover:text-white rounded-sm hover:bg-white/10"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* THERMAL 80MM RECEIPT VIEW */}
        {/* ============================================================ */}
        {receiptFormat === 'THERMAL' ? (
          <div
            id="receipt-document"
            className="p-6 sm:p-8 bg-white font-mono text-[#1a1a1a] space-y-4 max-w-sm mx-auto print:p-2 print:max-w-full"
          >
            {/* Thermal Header */}
            <div className="text-center space-y-1 border-b border-dashed border-black/30 pb-4">
              <h2 className="text-base font-bold tracking-tight uppercase">{businessName}</h2>
              <p className="text-[10px] uppercase tracking-wider text-black/70">
                Computer Tech & Electronics Hub
              </p>
              <p className="text-[10px] text-black/60">No. 101 yayo Plaza farm Center Kano State. Nigeria • Tel: +234 800 MAIGAMBA</p>
              <div className="pt-2 flex justify-center">
                <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-widest border border-black/30 uppercase bg-[#f4f0ea]">
                  *** SALES RECEIPT ***
                </span>
              </div>
            </div>

            {/* Receipt Metadata */}
            <div className="text-[11px] space-y-1 border-b border-dashed border-black/30 pb-3">
              <div className="flex justify-between">
                <span className="text-black/60">Receipt No:</span>
                <span className="font-bold">{invoiceNum}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/60">Date & Time:</span>
                <span>{saleDateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/60">Cashier / Staff:</span>
                <span>{sale.CreatedBy || 'Admin Staff'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/60">Customer:</span>
                <span className="font-semibold truncate max-w-[170px]">{customerName}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border-b border-dashed border-black/30 pb-3">
              <div className="flex justify-between text-[10px] uppercase font-bold text-black/60 border-b border-black/20 pb-1 mb-2">
                <span>Description</span>
                <span>Amount</span>
              </div>

              <div className="space-y-2 text-xs">
                {sale.items && sale.items.length > 0 ? (
                  sale.items.map((item, idx) => {
                    const lineTotal = item.UnitPrice * item.Quantity - (item.Discount || 0);
                    const prodName = item.ProductName || getProductName(item.ProductID);
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between font-semibold">
                          <span className="truncate pr-2">{prodName}</span>
                          <span className="shrink-0">{formatCurrency(lineTotal)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-black/60 pl-2">
                          <span>
                            {item.Quantity} @ {formatCurrency(item.UnitPrice)}
                          </span>
                          {Number(item.Discount) > 0 && (
                            <span className="text-rose-700">Disc -{formatCurrency(item.Discount)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex justify-between text-xs py-1">
                    <span>Retail Purchase</span>
                    <span className="font-bold">{formatCurrency(sale.TotalAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Thermal Totals */}
            <div className="space-y-1 text-xs border-b border-dashed border-black/30 pb-3">
              <div className="flex justify-between text-black/70">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.Subtotal || sale.TotalAmount)}</span>
              </div>
              {Number(sale.Discount) > 0 && (
                <div className="flex justify-between text-black/70">
                  <span>Discount:</span>
                  <span>-{formatCurrency(sale.Discount)}</span>
                </div>
              )}
              {Number(sale.Tax) > 0 && (
                <div className="flex justify-between text-black/70">
                  <span>Tax / VAT:</span>
                  <span>+{formatCurrency(sale.Tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-black/20">
                <span>TOTAL DUE:</span>
                <span>{formatCurrency(sale.TotalAmount)}</span>
              </div>
              <div className="flex justify-between pt-1 text-black/80">
                <span>Tendered ({sale.PaymentMethod || 'Cash'}):</span>
                <span className="font-bold">{formatCurrency(sale.AmountPaid)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Balance Due / Change:</span>
                <span className={Number(sale.Balance) > 0 ? 'text-rose-700' : 'text-black'}>
                  {formatCurrency(sale.Balance)}
                </span>
              </div>
            </div>

            {/* Simulated Barcode */}
            <div className="pt-2 text-center space-y-1">
              <div className="inline-flex items-center justify-center gap-0.5 h-10 px-4 bg-[#fcfaf7] border border-black/10 py-1">
                {Array.from({ length: 38 }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-full inline-block ${
                      i % 3 === 0
                        ? 'w-1 bg-black'
                        : i % 2 === 0
                        ? 'w-0.5 bg-black'
                        : 'w-1.5 bg-transparent'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[9px] font-mono tracking-widest text-black/60">{invoiceNum}</p>
            </div>

            {/* Thermal Footer */}
            <div className="text-center pt-2 text-[10px] text-black/60 space-y-1 border-t border-dashed border-black/30">
              <p className="font-bold uppercase text-[#1a1a1a]">Thank you for your business!</p>
              <p>Hardware testing warranty valid for 3 days with this slip.</p>
              <p className="text-[9px] text-black/40">Keep receipt for all returns & exchanges.</p>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* STANDARD FORMAL TAX INVOICE (A4) */
          /* ============================================================ */
          <div className="p-8 sm:p-10 space-y-6 text-[#1a1a1a] print:p-6 bg-white" id="invoice-document">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-black/10 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 border border-black/20 bg-[#1a1a1a] text-white flex items-center justify-center font-bold">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold tracking-tight text-[#1a1a1a] uppercase">
                      {businessName}
                    </h2>
                    <p className="text-[10px] text-black/50 font-semibold uppercase tracking-widest">
                      Computer Technology & Hardware Ledger
                    </p>
                  </div>
                </div>
                <p className="text-xs text-black/60 pt-2 font-light">
                  Sales, Computer Repairs, Laptops, Desktops, Parts & Electronics
                </p>
                <p className="text-xs text-black/50 font-light">
                  No. 101 yayo Plaza farm Center Kano State. Nigeria • Tel: +234 800 MAIGAMBA
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="inline-block px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.2em] bg-[#f4f0ea] text-[#1a1a1a] border border-black/15">
                  TAX INVOICE
                </span>
                <p className="text-xs font-mono font-bold text-[#1a1a1a] pt-1">{invoiceNum}</p>
                <p className="text-xs text-black/50 font-light">Date: {saleDateFormatted}</p>
                <p className="text-xs text-black/50 font-light">
                  Cashier: {sale.CreatedBy || 'Admin Staff'}
                </p>
              </div>
            </div>

            {/* Customer & Billing Info */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-sm bg-[#fcfaf7] border border-black/10 text-xs">
              <div>
                <span className="text-[9px] font-semibold text-black/40 uppercase tracking-[0.2em] block">
                  Billed Account
                </span>
                <p className="text-sm font-serif font-bold text-[#1a1a1a] mt-0.5">{customerName}</p>
                <p className="text-black/60 text-[11px]">
                  Payment Method:{' '}
                  <span className="font-semibold text-[#1a1a1a]">{sale.PaymentMethod || 'Cash'}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-semibold text-black/40 uppercase tracking-[0.2em] block">
                  Payment Status
                </span>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-wider font-semibold border border-black/15 bg-white text-[#1a1a1a]">
                  {sale.PaymentStatus || 'Paid'}
                </span>
              </div>
            </div>

            {/* Product Items Table */}
            <div className="border border-black/10 rounded-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f0ea] text-black/60 text-[9px] font-semibold uppercase tracking-[0.15em] border-b border-black/10">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Item Disc.</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 text-[#1a1a1a]">
                  {sale.items && sale.items.length > 0 ? (
                    sale.items.map((item, idx) => {
                      const lineTotal = item.UnitPrice * item.Quantity - (item.Discount || 0);
                      return (
                        <tr key={idx} className="hover:bg-[#fcfaf7]">
                          <td className="py-2.5 px-3 font-medium text-[#1a1a1a]">
                            {item.ProductName || getProductName(item.ProductID)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            {item.Quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-serif">
                            {formatCurrency(item.UnitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-serif text-black/50">
                            {item.Discount ? formatCurrency(item.Discount) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-serif font-bold text-[#1a1a1a]">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-center text-black/40 font-light">
                        Standard Sale Order Total: {formatCurrency(sale.TotalAmount)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary */}
            <div className="flex justify-end pt-2">
              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between text-black/60">
                  <span>Subtotal:</span>
                  <span className="font-serif font-semibold text-[#1a1a1a]">
                    {formatCurrency(sale.Subtotal || sale.TotalAmount)}
                  </span>
                </div>
                {Number(sale.Discount) > 0 && (
                  <div className="flex justify-between text-black/70">
                    <span>Discount Applied:</span>
                    <span className="font-serif font-semibold">-{formatCurrency(sale.Discount)}</span>
                  </div>
                )}
                {Number(sale.Tax) > 0 && (
                  <div className="flex justify-between text-black/60">
                    <span>Tax:</span>
                    <span className="font-serif font-semibold">+{formatCurrency(sale.Tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-serif font-bold text-[#1a1a1a] pt-2 border-t border-black/10">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(sale.TotalAmount)}</span>
                </div>
                <div className="flex justify-between text-black/70 pt-1">
                  <span>Amount Paid:</span>
                  <span className="font-serif font-bold text-[#1a1a1a]">
                    {formatCurrency(sale.AmountPaid)}
                  </span>
                </div>
                <div className="flex justify-between text-black/70">
                  <span>Balance Due:</span>
                  <span
                    className={`font-serif font-bold ${
                      Number(sale.Balance) > 0 ? 'text-rose-700' : 'text-[#1a1a1a]'
                    }`}
                  >
                    {formatCurrency(sale.Balance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Terms & Warranty */}
            <div className="pt-6 border-t border-black/10 text-center space-y-1 text-[11px] text-black/50 font-light">
              <p className="font-serif font-semibold text-[#1a1a1a]">
                Thank you for your patronage at Maigamba Computer Technology.
              </p>
              <p>
                Electronics items are covered by standard manufacturer testing warranty. Goods in
                good condition are not returnable after 3 days.
              </p>
              <p className="font-mono text-[9px] text-black/40 pt-1">
                Generated by Maigamba Inventory System • {new Date().toISOString()}
              </p>
            </div>
          </div>
        )}

        {/* Modal Bottom Actions (Hidden on Print) */}
        <div className="p-4 bg-[#fcfaf7] border-t border-black/10 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onNewSale && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNewSale();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] rounded-sm text-[10px] uppercase tracking-wider font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Next Customer Sale</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-black/70 hover:text-black border border-black/15 bg-white hover:bg-[#f4f0ea] rounded-sm flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-sm text-[10px] uppercase tracking-wider font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Physical Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-black/15 hover:bg-[#f4f0ea] text-[#1a1a1a] rounded-sm text-[10px] uppercase tracking-wider font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
