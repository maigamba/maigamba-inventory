import React from 'react';
import { Sale } from '../types/inventory';
import { useInventory } from '../context/InventoryContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Printer, X, Monitor, CheckCircle2, RotateCcw } from 'lucide-react';

interface InvoiceModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onNewSale?: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  sale,
  isOpen,
  onClose,
  onNewSale,
}) => {
  const { getCustomerName, getProductName, settings } = useInventory();

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const businessName = settings.BusinessName || 'Maigamba Computer Technology';
  const customerName = getCustomerName(sale.CustomerID);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div 
        id="printable-invoice-container"
        className="w-full max-w-2xl bg-white rounded-sm shadow-2xl border border-black/20 overflow-hidden my-6 print:border-0 print:shadow-none print:m-0 print:rounded-none"
      >
        {/* Modal Top Bar (hidden during print) */}
        <div className="p-4 bg-[#1a1a1a] text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-white/60 uppercase tracking-[0.2em]">Official Tax Ledger</span>
            <span className="text-xs text-white/80 font-mono">• {sale.InvoiceNumber || sale.SaleID}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-white text-[#1a1a1a] hover:bg-[#f4f0ea] rounded-sm text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/50 hover:text-white rounded-sm hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
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
                Lagos / Kano, Nigeria • Tel: +234 800 MAIGAMBA
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.2em] bg-[#f4f0ea] text-[#1a1a1a] border border-black/15">
                TAX INVOICE
              </span>
              <p className="text-xs font-mono font-bold text-[#1a1a1a] pt-1">
                {sale.InvoiceNumber || sale.SaleID}
              </p>
              <p className="text-xs text-black/50 font-light">
                Date: {formatDate(sale.SaleDate || sale.CreatedAt)}
              </p>
              <p className="text-xs text-black/50 font-light">
                Cashier: {sale.CreatedBy || 'Admin Staff'}
              </p>
            </div>
          </div>

          {/* Customer & Billing Info */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-sm bg-[#fcfaf7] border border-black/10 text-xs">
            <div>
              <span className="text-[9px] font-semibold text-black/40 uppercase tracking-[0.2em] block">Billed Account</span>
              <p className="text-sm font-serif font-bold text-[#1a1a1a] mt-0.5">{customerName || 'Walk-in Retail Customer'}</p>
              <p className="text-black/60 text-[11px]">Payment Method: <span className="font-semibold text-[#1a1a1a]">{sale.PaymentMethod || 'Cash'}</span></p>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-semibold text-black/40 uppercase tracking-[0.2em] block">Payment Status</span>
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
                    const lineTotal = (item.UnitPrice * item.Quantity) - (item.Discount || 0);
                    return (
                      <tr key={idx} className="hover:bg-[#fcfaf7]">
                        <td className="py-2.5 px-3 font-medium text-[#1a1a1a]">
                          {item.ProductName || getProductName(item.ProductID)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{item.Quantity}</td>
                        <td className="py-2.5 px-3 text-right font-serif">{formatCurrency(item.UnitPrice)}</td>
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
                <span className="font-serif font-semibold text-[#1a1a1a]">{formatCurrency(sale.Subtotal || sale.TotalAmount)}</span>
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
                <span className="font-serif font-bold text-[#1a1a1a]">{formatCurrency(sale.AmountPaid)}</span>
              </div>
              <div className="flex justify-between text-black/70">
                <span>Balance Due:</span>
                <span className={`font-serif font-bold ${Number(sale.Balance) > 0 ? 'text-rose-700' : 'text-[#1a1a1a]'}`}>
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
              Electronics items are covered by standard manufacturer testing warranty. Goods in good condition are not returnable after 3 days.
            </p>
            <p className="font-mono text-[9px] text-black/40 pt-1">
              Generated by Maigamba Inventory System • {new Date().toISOString()}
            </p>
          </div>
        </div>

        {/* Modal Bottom Actions (hidden during print) */}
        <div className="p-4 bg-[#fcfaf7] border-t border-black/10 flex items-center justify-between print:hidden">
          {onNewSale ? (
            <button
              onClick={() => {
                onClose();
                onNewSale();
              }}
              className="px-4 py-2 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] rounded-sm text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start New Sale</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white border border-black/15 hover:bg-[#f4f0ea] text-[#1a1a1a] rounded-sm text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#f4f0ea] hover:bg-black/10 text-[#1a1a1a] rounded-sm text-[10px] uppercase tracking-wider font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
