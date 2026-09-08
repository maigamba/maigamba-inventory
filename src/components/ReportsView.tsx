import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { formatCurrency, formatDate, parseNumber } from '../utils/formatters';
import { generateAuditPDF, AuditReportData } from '../utils/pdfExport';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Activity,
  ChevronRight,
  Printer,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

export const ReportsView: React.FC = () => {
  const {
    sales,
    products,
    expenses,
    purchases,
    categories,
    currentUser,
    getProductName,
    getCustomerName,
    addToast,
  } = useInventory();

  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'PROFIT' | 'VALUATION' | 'SALES' | 'EXPENSES'>('ANALYTICS');
  const [chartMetric, setChartMetric] = useState<'REVENUE' | 'MARGIN' | 'TRANSACTIONS' | 'UNITS'>('REVENUE');

  // Filter Sales & Expenses by chosen date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      if (dateFilter === 'ALL') return true;
      const d = new Date(s.SaleDate || s.CreatedAt || '');
      if (isNaN(d.getTime())) return true;

      if (dateFilter === 'TODAY') {
        return d.toDateString() === now.toDateString();
      }
      if (dateFilter === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (dateFilter === 'MONTH') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'YEAR') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [sales, dateFilter]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      if (dateFilter === 'ALL') return true;
      const d = new Date(e.ExpenseDate || e.CreatedAt || '');
      if (isNaN(d.getTime())) return true;

      if (dateFilter === 'TODAY') {
        return d.toDateString() === now.toDateString();
      }
      if (dateFilter === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (dateFilter === 'MONTH') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'YEAR') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [expenses, dateFilter]);

  // Aggregate Sales Revenue
  const totalSalesRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + parseNumber(s.TotalAmount), 0);
  }, [filteredSales]);

  const totalAmountPaid = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + parseNumber(s.AmountPaid), 0);
  }, [filteredSales]);

  const totalUnpaidReceivables = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + parseNumber(s.Balance), 0);
  }, [filteredSales]);

  // Estimated Cost of Goods Sold & Gross Profit
  const { estimatedCOGS, estimatedGrossProfit } = useMemo(() => {
    let cogs = 0;
    filteredSales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const p = products.find((prod) => prod.ProductID === item.ProductID);
          const cost = p ? parseNumber(p.CostPrice) : item.UnitPrice * 0.75;
          cogs += cost * (item.Quantity || 1);
        });
      } else {
        cogs += parseNumber(sale.TotalAmount) * 0.75;
      }
    });
    const grossProfit = Math.max(0, totalSalesRevenue - cogs);
    return { estimatedCOGS: cogs, estimatedGrossProfit: grossProfit };
  }, [filteredSales, products, totalSalesRevenue]);

  // Total Expenses
  const totalExpensesAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + parseNumber(e.Amount), 0);
  }, [filteredExpenses]);

  // Net Profit
  const netProfit = estimatedGrossProfit - totalExpensesAmount;

  // Inventory Valuation
  const inventoryValuation = useMemo(() => {
    let totalStockQty = 0;
    let totalCostVal = 0;
    let totalRetailVal = 0;

    products.forEach((p) => {
      const q = parseNumber(p.Quantity);
      if (q > 0) {
        totalStockQty += q;
        totalCostVal += q * parseNumber(p.CostPrice);
        totalRetailVal += q * parseNumber(p.SellingPrice);
      }
    });

    const potentialGrossProfit = totalRetailVal - totalCostVal;
    return {
      totalStockQty,
      totalCostVal,
      totalRetailVal,
      potentialGrossProfit,
    };
  }, [products]);

  // Best Selling Products calculation
  const bestSellers = useMemo(() => {
    const productStats: Record<string, { qty: number; revenue: number; name: string }> = {};

    sales.forEach((s) => {
      if (s.items && s.items.length > 0) {
        s.items.forEach((item) => {
          if (!productStats[item.ProductID]) {
            productStats[item.ProductID] = {
              qty: 0,
              revenue: 0,
              name: item.ProductName || getProductName(item.ProductID),
            };
          }
          productStats[item.ProductID].qty += item.Quantity;
          productStats[item.ProductID].revenue += item.Quantity * item.UnitPrice;
        });
      }
    });

    return Object.entries(productStats)
      .map(([id, stat]) => ({ id, ...stat }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [sales, getProductName]);

  // Expenses grouped by Category
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const cat = (e as any).ExpenseCategory ?? (e as any).expenseCategory ?? 'Other';
      map[cat] = (map[cat] || 0) + parseNumber(e.Amount);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  // 30-Day Daily Sales Performance timeline for Recharts line chart
  const thirtyDayPerformance = useMemo(() => {
    const timeline = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() - i);
      const dateStr = targetDate.toISOString().slice(0, 10);
      const shortLabel = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const daySales = sales.filter((s) => {
        const sDate = s.SaleDate || s.CreatedAt || '';
        return sDate.startsWith(dateStr);
      });

      const dayRevenue = daySales.reduce((sum, s) => sum + parseNumber(s.TotalAmount), 0);
      const transactions = daySales.length;
      let units = 0;
      let dayProfit = 0;

      daySales.forEach((s) => {
        if (s.items && s.items.length > 0) {
          s.items.forEach((item) => {
            units += item.Quantity || 1;
            const p = products.find((prod) => prod.ProductID === item.ProductID);
            const cost = p ? parseNumber(p.CostPrice) : item.UnitPrice * 0.75;
            dayProfit += Math.max(0, (item.UnitPrice - cost) * (item.Quantity || 1));
          });
        } else {
          units += 1;
          dayProfit += parseNumber(s.TotalAmount) * 0.25;
        }
      });

      timeline.push({
        date: dateStr,
        label: shortLabel,
        revenue: Math.round(dayRevenue),
        profit: Math.round(dayProfit),
        transactions,
        units,
      });
    }

    return timeline;
  }, [sales, products]);

  // Aggregate metrics for 30-day timeline
  const thirtyDayStats = useMemo(() => {
    const totalRev = thirtyDayPerformance.reduce((acc, d) => acc + d.revenue, 0);
    const totalTransactions = thirtyDayPerformance.reduce((acc, d) => acc + d.transactions, 0);
    const totalUnits = thirtyDayPerformance.reduce((acc, d) => acc + d.units, 0);
    const totalProfit = thirtyDayPerformance.reduce((acc, d) => acc + d.profit, 0);
    const avgDailyRev = totalRev / 30;

    let peakDay = thirtyDayPerformance[0];
    thirtyDayPerformance.forEach((d) => {
      if (d.revenue > (peakDay?.revenue || 0)) {
        peakDay = d;
      }
    });

    return {
      totalRev,
      totalTransactions,
      totalUnits,
      totalProfit,
      avgDailyRev,
      peakDay,
    };
  }, [thirtyDayPerformance]);

  // Export current filtered table to high-quality PDF document
  const handleExportPDF = () => {
    try {
      let reportData: AuditReportData;
      const periodLabel = `Filter: ${dateFilter}`;
      const auditorName = currentUser?.FullName || 'Store Auditor';

      if (activeTab === 'VALUATION') {
        reportData = {
          reportTitle: 'Inventory Stock Valuation & Asset Register',
          periodLabel,
          generatedBy: auditorName,
          fileNamePrefix: 'inventory_valuation_audit',
          summaryMetrics: [
            { label: 'Total Stock Units', value: `${inventoryValuation.totalStockQty} Pcs` },
            { label: 'Cost Valuation', value: formatCurrency(inventoryValuation.totalCostVal) },
            { label: 'Retail Valuation', value: formatCurrency(inventoryValuation.totalRetailVal) },
            { label: 'Projected Margin', value: formatCurrency(inventoryValuation.potentialGrossProfit) },
          ],
          tableHeaders: ['SKU', 'Product Name', 'Category', 'Stock Qty', 'Cost (NGN)', 'Selling (NGN)', 'Asset Val (NGN)'],
          tableRows: products
            .slice()
            .sort((a, b) => parseNumber(b.Quantity) * parseNumber(b.SellingPrice) - parseNumber(a.Quantity) * parseNumber(a.SellingPrice))
            .map((p) => [
              p.SKU,
              p.ProductName,
              p.CategoryID || 'Hardware',
              parseNumber(p.Quantity),
              formatCurrency(p.CostPrice),
              formatCurrency(p.SellingPrice),
              formatCurrency(parseNumber(p.Quantity) * parseNumber(p.CostPrice)),
            ]),
        };
      } else if (activeTab === 'SALES') {
        reportData = {
          reportTitle: 'Commercial Sales & Invoicing Audit Ledger',
          periodLabel,
          generatedBy: auditorName,
          fileNamePrefix: 'sales_transactions_audit',
          summaryMetrics: [
            { label: 'Total Inflow', value: formatCurrency(totalSalesRevenue) },
            { label: 'Paid Collected', value: formatCurrency(totalAmountPaid) },
            { label: 'Pending Receivables', value: formatCurrency(totalUnpaidReceivables) },
            { label: 'Total Invoices', value: `${filteredSales.length} Slips` },
          ],
          tableHeaders: ['Date', 'Invoice #', 'Customer', 'Payment Method', 'Status', 'Paid (NGN)', 'Total (NGN)'],
          tableRows: filteredSales.map((s) => [
            formatDate(s.SaleDate || s.CreatedAt),
            s.InvoiceNumber || s.SaleID,
            getCustomerName(s.CustomerID),
            s.PaymentMethod || 'Cash',
            s.PaymentStatus || 'Paid',
            formatCurrency(s.AmountPaid),
            formatCurrency(s.TotalAmount),
          ]),
        };
      } else if (activeTab === 'EXPENSES') {
        reportData = {
          reportTitle: 'Operational Expenditure & Workshop Overhead',
          periodLabel,
          generatedBy: auditorName,
          fileNamePrefix: 'expenses_audit_ledger',
          summaryMetrics: [
            { label: 'Total Expenses', value: formatCurrency(totalExpensesAmount) },
            { label: 'Expense Entries', value: `${filteredExpenses.length} Records` },
            { label: 'Primary Category', value: expenseByCategory[0]?.[0] || 'General' },
            { label: 'Top Overhead', value: formatCurrency(expenseByCategory[0]?.[1] || 0) },
          ],
          tableHeaders: ['Expense Date', 'Category', 'Description', 'Payment Method', 'Amount (NGN)'],
          tableRows: filteredExpenses.map((e) => [
            formatDate(e.ExpenseDate || e.CreatedAt),
            (e as any).ExpenseCategory ?? (e as any).expenseCategory ?? 'General',
            e.Description || 'Operational disbursement',
            e.PaymentMethod || 'Cash',
            formatCurrency(e.Amount),
          ]),
        };
      } else {
        // P&L or 30-day Analytics table
        reportData = {
          reportTitle: '30-Day Daily Sales Performance & Revenue Audit',
          periodLabel: 'Last 30 Consecutive Days',
          generatedBy: auditorName,
          fileNamePrefix: '30day_sales_performance',
          summaryMetrics: [
            { label: '30-Day Revenue', value: formatCurrency(thirtyDayStats.totalRev) },
            { label: '30-Day Gross Profit', value: formatCurrency(thirtyDayStats.totalProfit) },
            { label: 'Total Transactions', value: `${thirtyDayStats.totalTransactions} Invoices` },
            { label: 'Peak Daily Sales', value: formatCurrency(thirtyDayStats.peakDay?.revenue || 0) },
          ],
          tableHeaders: ['Date', 'Day', 'Revenue (NGN)', 'Est. Margin (NGN)', 'Invoices', 'Hardware Units'],
          tableRows: thirtyDayPerformance.map((d) => [
            d.date,
            d.label,
            formatCurrency(d.revenue),
            formatCurrency(d.profit),
            d.transactions,
            d.units,
          ]),
        };
      }

      generateAuditPDF(reportData);
      addToast('success', 'Official Audit PDF generated and downloaded.', 'Document Export');
    } catch (err: any) {
      console.error('PDF export error:', err);
      addToast('error', 'Failed to generate PDF document. Check console for details.');
    }
  };

  // CSV Export Utility
  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'SALES') {
      csvContent += 'SaleID,InvoiceNumber,Date,Customer,TotalAmount,AmountPaid,Balance,PaymentMethod,PaymentStatus\n';
      filteredSales.forEach((s) => {
        csvContent += `"${s.SaleID}","${s.InvoiceNumber || ''}","${s.SaleDate || ''}","${getCustomerName(s.CustomerID)}","${s.TotalAmount}","${s.AmountPaid}","${s.Balance}","${s.PaymentMethod}","${s.PaymentStatus}"\n`;
      });
    } else if (activeTab === 'VALUATION') {
      csvContent += 'SKU,ProductName,StockQuantity,CostPrice,SellingPrice,TotalCostValue,TotalRetailValue\n';
      products.forEach((p) => {
        const costVal = parseNumber(p.Quantity) * parseNumber(p.CostPrice);
        const retailVal = parseNumber(p.Quantity) * parseNumber(p.SellingPrice);
        csvContent += `"${p.SKU}","${p.ProductName}","${p.Quantity}","${p.CostPrice}","${p.SellingPrice}","${costVal}","${retailVal}"\n`;
      });
    } else if (activeTab === 'EXPENSES') {
      csvContent += 'ExpenseID,Date,Category,Amount,Description,PaymentMethod\n';
      filteredExpenses.forEach((e) => {
        csvContent += `"${e.ExpenseID}","${e.ExpenseDate}","${(e as any).ExpenseCategory ?? (e as any).expenseCategory ?? ''}","${e.Amount}","${e.Description || ''}","${e.PaymentMethod}"\n`;
      });
    } else {
      csvContent += 'Date,Label,Revenue,Profit,Transactions,Units\n';
      thirtyDayPerformance.forEach((d) => {
        csvContent += `"${d.date}","${d.label}","${d.revenue}","${d.profit}","${d.transactions}","${d.units}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Maigamba_${activeTab.toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'CSV spreadsheet exported.');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-black/10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif font-bold text-[#1a1a1a] tracking-tight">
              Commercial Intelligence & Financial Audits
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase bg-[#f4f0ea] border border-black/10 text-black/70">
              Kano HQ Registry
            </span>
          </div>
          <p className="text-xs text-black/50 mt-1 font-light">
            No. 101 yayo Plaza farm Center Kano State. Nigeria • Real-time valuation, daily sales analytics, and audit exports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time Filter Pills */}
          <div className="p-1 bg-[#f4f0ea] rounded-xs border border-black/10 flex items-center text-xs">
            {(['ALL', 'TODAY', 'WEEK', 'MONTH', 'YEAR'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDateFilter(t)}
                className={`px-3 py-1.5 rounded-xs font-mono text-[10px] uppercase font-semibold transition-all cursor-pointer ${dateFilter === t
                  ? 'bg-[#1a1a1a] text-white shadow-xs'
                  : 'text-black/60 hover:text-black'
                  }`}
              >
                {t.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={exportToCSV}
            className="px-3.5 py-2 border border-black/15 hover:border-black bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV raw spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            id="btn-export-pdf-report"
            onClick={handleExportPDF}
            className="px-4 py-2 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            title="Generate print-ready PDF audit document"
          >
            <FileText className="w-3.5 h-3.5 text-amber-300" />
            <span>Export PDF Audit</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-black/10 text-xs overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`pb-3 px-4 font-serif font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'ANALYTICS'
            ? 'border-black text-[#1a1a1a]'
            : 'border-transparent text-black/50 hover:text-black'
            }`}
        >
          <Activity className="w-3.5 h-3.5 text-amber-600" />
          <span>30-Day Sales Performance</span>
        </button>

        <button
          onClick={() => setActiveTab('PROFIT')}
          className={`pb-3 px-4 font-serif font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'PROFIT'
            ? 'border-black text-[#1a1a1a]'
            : 'border-transparent text-black/50 hover:text-black'
            }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Profit & Loss Statement</span>
        </button>

        <button
          onClick={() => setActiveTab('VALUATION')}
          className={`pb-3 px-4 font-serif font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'VALUATION'
            ? 'border-black text-[#1a1a1a]'
            : 'border-transparent text-black/50 hover:text-black'
            }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Inventory Valuation</span>
        </button>

        <button
          onClick={() => setActiveTab('SALES')}
          className={`pb-3 px-4 font-serif font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'SALES'
            ? 'border-black text-[#1a1a1a]'
            : 'border-transparent text-black/50 hover:text-black'
            }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Sales & Receivables</span>
        </button>

        <button
          onClick={() => setActiveTab('EXPENSES')}
          className={`pb-3 px-4 font-serif font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'EXPENSES'
            ? 'border-black text-[#1a1a1a]'
            : 'border-transparent text-black/50 hover:text-black'
            }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Workshop Expenses</span>
        </button>
      </div>

      {/* TAB 1: 30-Day Sales Performance Visual Dashboard (Recharts Line Chart) */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          {/* 30-Day Key Stat Highlights with Hover Flop Effect */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total 30-Day Volume */}
            <div className="bg-white p-5 border border-black/10 rounded-xs flex flex-col justify-between stat-card-flop cursor-default">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">
                  30-Day Gross Volume
                </span>
                <div className="p-1.5 border border-black/10 bg-[#fcfaf7] text-black">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-serif text-[#1a1a1a] tracking-tight font-bold">
                  {formatCurrency(thirtyDayStats.totalRev)}
                </h3>
                <p className="text-[10px] font-mono text-black/50 mt-1">
                  Across {thirtyDayStats.totalTransactions} commercial sales
                </p>
              </div>
            </div>

            {/* Daily Average */}
            <div className="bg-white p-5 border border-black/10 rounded-xs flex flex-col justify-between stat-card-flop cursor-default">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">
                  Daily Run-Rate Avg
                </span>
                <div className="p-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-serif text-emerald-800 tracking-tight font-bold">
                  {formatCurrency(thirtyDayStats.avgDailyRev)}
                </h3>
                <p className="text-[10px] font-mono text-black/50 mt-1">Daily revenue benchmark</p>
              </div>
            </div>

            {/* 30-Day Estimated Profit */}
            <div className="bg-white p-5 border border-black/10 rounded-xs flex flex-col justify-between stat-card-flop cursor-default">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">
                  30-Day Net Margin
                </span>
                <div className="p-1.5 border border-amber-200 bg-amber-50 text-amber-800">
                  <Activity className="w-4 h-4 text-amber-700" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-serif text-amber-900 tracking-tight font-bold">
                  {formatCurrency(thirtyDayStats.totalProfit)}
                </h3>
                <p className="text-[10px] font-mono text-black/50 mt-1">Gross markup profit</p>
              </div>
            </div>

            {/* Peak Sales Day */}
            <div className="bg-white p-5 border border-black/10 rounded-xs flex flex-col justify-between stat-card-flop cursor-default">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-medium">
                  Peak Day Record
                </span>
                <div className="p-1.5 border border-blue-200 bg-blue-50 text-blue-800">
                  <Sparkles className="w-4 h-4 text-blue-700" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-serif text-[#1a1a1a] tracking-tight font-bold">
                  {formatCurrency(thirtyDayStats.peakDay?.revenue || 0)}
                </h3>
                <p className="text-[10px] font-mono text-black/50 mt-1">
                  Recorded on {thirtyDayStats.peakDay?.label || 'Recent date'}
                </p>
              </div>
            </div>
          </div>

          {/* Visual Recharts Line Chart Card */}
          <div className="bg-white p-5 sm:p-6 border border-black/10 rounded-xs shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/10">
              <div>
                <h3 className="text-base font-serif font-bold text-[#1a1a1a]">
                  Daily Sales & Revenue Trajectory (Last 30 Days)
                </h3>
                <p className="text-xs text-black/50 font-light mt-0.5">
                  Chronological day-by-day sales trend showing sales volume fluctuations and commercial velocity.
                </p>
              </div>

              {/* Metric Selector Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#f4f0ea] rounded-xs border border-black/10">
                <button
                  type="button"
                  onClick={() => setChartMetric('REVENUE')}
                  className={`px-3 py-1 text-[10px] uppercase font-mono font-semibold rounded-xs transition-all cursor-pointer ${chartMetric === 'REVENUE'
                    ? 'bg-[#1a1a1a] text-white shadow-xs'
                    : 'text-black/60 hover:text-black'
                    }`}
                >
                  Revenue (₦)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('MARGIN')}
                  className={`px-3 py-1 text-[10px] uppercase font-mono font-semibold rounded-xs transition-all cursor-pointer ${chartMetric === 'MARGIN'
                    ? 'bg-[#1a1a1a] text-white shadow-xs'
                    : 'text-black/60 hover:text-black'
                    }`}
                >
                  Profit Margin (₦)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('TRANSACTIONS')}
                  className={`px-3 py-1 text-[10px] uppercase font-mono font-semibold rounded-xs transition-all cursor-pointer ${chartMetric === 'TRANSACTIONS'
                    ? 'bg-[#1a1a1a] text-white shadow-xs'
                    : 'text-black/60 hover:text-black'
                    }`}
                >
                  Invoices
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('UNITS')}
                  className={`px-3 py-1 text-[10px] uppercase font-mono font-semibold rounded-xs transition-all cursor-pointer ${chartMetric === 'UNITS'
                    ? 'bg-[#1a1a1a] text-white shadow-xs'
                    : 'text-black/60 hover:text-black'
                    }`}
                >
                  Units Sold
                </button>
              </div>
            </div>

            {/* Recharts Component Container */}
            <div className="h-[360px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={thirtyDayPerformance}
                  margin={{ top: 10, right: 10, left: 15, bottom: 25 }}
                >
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e2da" vertical={false} />

                  <XAxis
                    dataKey="label"
                    stroke="#8c857b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#d6d1c7' }}
                    interval="preserveStartEnd"
                    dy={10}
                  />

                  <YAxis
                    stroke="#8c857b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#d6d1c7' }}
                    tickFormatter={(val) => {
                      if (chartMetric === 'TRANSACTIONS' || chartMetric === 'UNITS') {
                        return val.toString();
                      }
                      if (val >= 1000000) return `₦${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `₦${(val / 1000).toFixed(0)}k`;
                      return `₦${val}`;
                    }}
                  />

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#141414] text-white p-3 rounded-xs border border-white/20 shadow-xl text-xs space-y-1.5 font-mono">
                            <div className="font-bold text-amber-400 border-b border-white/10 pb-1 flex justify-between gap-4">
                              <span>{data.label}</span>
                              <span className="text-[10px] text-white/50">{data.date}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-white/90">
                              <span className="text-white/60">Revenue:</span>
                              <span className="font-bold">{formatCurrency(data.revenue)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-emerald-300">
                              <span className="text-white/60">Gross Margin:</span>
                              <span className="font-bold">{formatCurrency(data.profit)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-white/80 pt-1 border-t border-white/10 text-[10px]">
                              <span>Invoices: {data.transactions}</span>
                              <span>Units Sold: {data.units}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {chartMetric === 'REVENUE' && (
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Gross Sales (₦)"
                      stroke="#1a1a1a"
                      strokeWidth={2.5}
                      fill="url(#revenueGrad)"
                      activeDot={{ r: 6, fill: '#1a1a1a', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  )}

                  {chartMetric === 'MARGIN' && (
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Estimated Gross Margin (₦)"
                      stroke="#d97706"
                      strokeWidth={2.5}
                      fill="url(#profitGrad)"
                      activeDot={{ r: 6, fill: '#d97706', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  )}

                  {chartMetric === 'TRANSACTIONS' && (
                    <Area
                      type="monotone"
                      dataKey="transactions"
                      name="Transactions Count"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fill="url(#blueGrad)"
                      activeDot={{ r: 6, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  )}

                  {chartMetric === 'UNITS' && (
                    <Area
                      type="monotone"
                      dataKey="units"
                      name="Hardware Units Sold"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fill="url(#revenueGrad)"
                      activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 30-Day Daily Ledger Table for Auditing */}
          <div className="bg-white border border-black/10 rounded-xs shadow-xs overflow-hidden">
            <div className="p-4 border-b border-black/10 bg-[#fcfaf7] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-serif font-bold text-[#1a1a1a] uppercase tracking-wider">
                  Daily Performance Chronological Ledger
                </h4>
                <p className="text-[11px] text-black/50 font-light">
                  Direct numeric breakdown of each day's trading activities.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] text-[10px] uppercase font-mono font-semibold rounded-xs flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3 h-3 text-amber-300" />
                <span>Print Ledger PDF</span>
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f0ea] border-b border-black/10 text-black/60 font-semibold uppercase tracking-[0.15em] text-[9px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Daily Revenue</th>
                    <th className="py-2.5 px-4 text-right">Gross Profit</th>
                    <th className="py-2.5 px-4 text-center">Invoices</th>
                    <th className="py-2.5 px-4 text-center">Units Sold</th>
                    <th className="py-2.5 px-4 text-right">Average Order Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 text-[#1a1a1a]">
                  {thirtyDayPerformance
                    .slice()
                    .reverse()
                    .map((day) => {
                      const aov = day.transactions > 0 ? day.revenue / day.transactions : 0;
                      return (
                        <tr key={day.date} className="hover:bg-[#fcfaf7]">
                          <td className="py-2.5 px-4 font-mono font-medium">
                            {day.date} <span className="text-black/40 text-[10px]">({day.label})</span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-[#1a1a1a]">
                            {formatCurrency(day.revenue)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-emerald-800 font-semibold">
                            {formatCurrency(day.profit)}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono">{day.transactions}</td>
                          <td className="py-2.5 px-4 text-center font-mono">{day.units}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-black/60">
                            {aov > 0 ? formatCurrency(aov) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Profit & Loss Statement */}
      {activeTab === 'PROFIT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 border border-black/10 rounded-xs flex flex-col justify-between stat-card-flop">
              <span className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.15em]">
                Gross Sales Revenue
              </span>
              <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mt-2 font-mono">
                {formatCurrency(totalSalesRevenue)}
              </h3>
              <span className="text-[10px] text-black/40 mt-1 block">From {filteredSales.length} invoices</span>
            </div>

            <div className="bg-white p-5 border border-black/10 rounded-xs flex flex-col justify-between stat-card-flop">
              <span className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.15em]">
                Cost of Goods (COGS)
              </span>
              <h3 className="text-2xl font-serif font-bold text-black/70 mt-2 font-mono">
                {formatCurrency(estimatedCOGS)}
              </h3>
              <span className="text-[10px] text-black/40 mt-1 block">Hardware procurement cost</span>
            </div>

            <div className="bg-white p-5 border border-black/10 rounded-xs flex flex-col justify-between stat-card-flop">
              <span className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.15em]">
                Shop Overhead Expenses
              </span>
              <h3 className="text-2xl font-serif font-bold text-rose-700 mt-2 font-mono">
                -{formatCurrency(totalExpensesAmount)}
              </h3>
              <span className="text-[10px] text-black/40 mt-1 block">{filteredExpenses.length} expense items</span>
            </div>

            <div
              className={`p-5 border rounded-xs flex flex-col justify-between stat-card-flop ${netProfit >= 0 ? 'bg-emerald-50/70 border-emerald-300' : 'bg-rose-50 border-rose-300'
                }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/60">
                Net Trading Surplus
              </span>
              <h3
                className={`text-2xl font-serif font-bold mt-2 font-mono ${netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                  }`}
              >
                {formatCurrency(netProfit)}
              </h3>
              <span className="text-[10px] font-semibold text-black/50 mt-1 block">
                {netProfit >= 0 ? 'Operating Profitability' : 'Operating Deficit'}
              </span>
            </div>
          </div>

          {/* Statement breakdown card */}
          <div className="bg-white rounded-xs border border-black/10 shadow-xs p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/10">
              <div>
                <h4 className="text-sm font-serif font-bold text-[#1a1a1a] uppercase tracking-wider">
                  Official Income Statement Summary ({dateFilter})
                </h4>
                <p className="text-xs text-black/50 font-light">
                  Standard GAAP-aligned trading statement for Maigamba Computer Technology.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] text-[10px] uppercase tracking-wider font-semibold rounded-xs flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                <span>Export P&L PDF</span>
              </button>
            </div>

            <div className="divide-y divide-black/10 text-xs">
              <div className="py-3 flex justify-between font-semibold text-[#1a1a1a]">
                <span>Total Product Sales (Gross Revenue)</span>
                <span className="font-mono text-[#1a1a1a]">{formatCurrency(totalSalesRevenue)}</span>
              </div>
              <div className="py-3 flex justify-between text-black/70">
                <span className="pl-4">Less: Cost of Hardware Sold (Est. COGS)</span>
                <span className="font-mono text-rose-700">-{formatCurrency(estimatedCOGS)}</span>
              </div>
              <div className="py-3 flex justify-between font-bold text-[#1a1a1a] bg-[#f4f0ea] px-3 rounded-xs">
                <span>Gross Trading Margin</span>
                <span className="font-mono text-amber-800">{formatCurrency(estimatedGrossProfit)}</span>
              </div>
              <div className="py-3 flex justify-between text-black/70">
                <span className="pl-4">Less: Workshop Overhead & Operational Expenses</span>
                <span className="font-mono text-rose-700">-{formatCurrency(totalExpensesAmount)}</span>
              </div>
              <div className="py-4 flex justify-between text-sm font-serif font-bold text-[#1a1a1a] border-t-2 border-black/80">
                <span>Net Trading Profit / Surplus</span>
                <span className={`font-mono text-base ${netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Inventory Valuation */}
      {activeTab === 'VALUATION' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 border border-black/10 rounded-xs stat-card-flop">
              <span className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.15em]">
                Total Stock In Warehouse
              </span>
              <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mt-2 font-mono">
                {inventoryValuation.totalStockQty.toLocaleString()} pcs
              </h3>
              <span className="text-[10px] text-black/40 mt-1 block">{products.length} catalog items</span>
            </div>

            <div className="bg-white p-5 border border-black/10 rounded-xs stat-card-flop">
              <span className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.15em]">
                Stock Asset Value (At Cost)
              </span>
              <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mt-2 font-mono">
                {formatCurrency(inventoryValuation.totalCostVal)}
              </h3>
              <span className="text-[10px] text-black/40 mt-1 block">Purchase capital in inventory</span>
            </div>

            <div className="bg-white p-5 border border-black/10 rounded-xs stat-card-flop">
              <span className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.15em]">
                Retail Realizable Potential
              </span>
              <h3 className="text-2xl font-serif font-bold text-amber-800 mt-2 font-mono">
                {formatCurrency(inventoryValuation.totalRetailVal)}
              </h3>
              <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                Potential Profit: +{formatCurrency(inventoryValuation.potentialGrossProfit)}
              </span>
            </div>
          </div>

          {/* Detailed Valuation Table */}
          <div className="bg-white rounded-xs border border-black/10 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-black/10 bg-[#fcfaf7] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-serif font-bold text-[#1a1a1a] uppercase tracking-wider">
                  Hardware Capital Assets in Current Stock
                </h4>
                <p className="text-[11px] text-black/50 font-light">
                  Filtered stock ledger ready for export and audit.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] text-[10px] uppercase tracking-wider font-semibold rounded-xs flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                <span>Export Valuation PDF</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f0ea] text-black/60 font-semibold uppercase tracking-[0.15em] text-[9px] border-b border-black/10">
                  <tr>
                    <th className="py-2.5 px-4">SKU / Item</th>
                    <th className="py-2.5 px-4 text-center">In Stock</th>
                    <th className="py-2.5 px-4 text-right">Cost Price</th>
                    <th className="py-2.5 px-4 text-right">Selling Price</th>
                    <th className="py-2.5 px-4 text-right">Total Cost Asset</th>
                    <th className="py-2.5 px-4 text-right">Total Retail Potential</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 text-[#1a1a1a]">
                  {products
                    .slice()
                    .sort(
                      (a, b) =>
                        parseNumber(b.Quantity) * parseNumber(b.SellingPrice) -
                        parseNumber(a.Quantity) * parseNumber(a.SellingPrice)
                    )
                    .map((p) => {
                      const q = parseNumber(p.Quantity);
                      const costVal = q * parseNumber(p.CostPrice);
                      const retailVal = q * parseNumber(p.SellingPrice);

                      return (
                        <tr key={p.ProductID} className="hover:bg-[#fcfaf7]">
                          <td className="py-3 px-4 font-medium text-[#1a1a1a]">
                            {p.ProductName}
                            <span className="block text-[10px] font-mono text-black/40">{p.SKU}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">{q}</td>
                          <td className="py-3 px-4 text-right font-mono text-black/60">
                            {formatCurrency(p.CostPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[#1a1a1a] font-semibold">
                            {formatCurrency(p.SellingPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-black/70">
                            {formatCurrency(costVal)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                            {formatCurrency(retailVal)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Sales & Receivables */}
      {activeTab === 'SALES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 border border-black/10 rounded-xs stat-card-flop">
              <span className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.15em]">
                Cash Inflow Collected
              </span>
              <h3 className="text-2xl font-serif font-bold text-emerald-800 mt-2 font-mono">
                {formatCurrency(totalAmountPaid)}
              </h3>
              <span className="text-[10px] text-black/40 mt-1 block">Tendered cash & transfers</span>
            </div>

            <div className="bg-white p-5 border border-black/10 rounded-xs stat-card-flop">
              <span className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.15em]">
                Customer Receivables Due
              </span>
              <h3 className="text-2xl font-serif font-bold text-rose-700 mt-2 font-mono">
                {formatCurrency(totalUnpaidReceivables)}
              </h3>
              <span className="text-[10px] text-black/40 mt-1 block">Pending customer debt</span>
            </div>

            <div className="bg-white p-5 border border-black/10 rounded-xs stat-card-flop">
              <span className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.15em]">
                Invoices Issued
              </span>
              <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mt-2 font-mono">
                {filteredSales.length}
              </h3>
              <span className="text-[10px] text-black/40 mt-1 block">
                Avg ticket:{' '}
                {filteredSales.length > 0 ? formatCurrency(totalSalesRevenue / filteredSales.length) : '₦0'}
              </span>
            </div>
          </div>

          {/* Top Revenue Products List */}
          <div className="bg-white rounded-xs border border-black/10 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-black/10 bg-[#fcfaf7] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-serif font-bold text-[#1a1a1a] uppercase tracking-wider">
                  Top Revenue & Volume Drivers (Best Sellers)
                </h4>
                <p className="text-[11px] text-black/50 font-light">
                  Hardware ranking by total turnover.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] text-[10px] uppercase tracking-wider font-semibold rounded-xs flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                <span>Export Sales Register PDF</span>
              </button>
            </div>

            <div className="p-4 space-y-2.5">
              {bestSellers.length === 0 ? (
                <p className="text-xs text-black/40 py-6 text-center">No sales recorded yet.</p>
              ) : (
                bestSellers.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-[#fcfaf7] border border-black/5 rounded-xs hover:border-black/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-xs bg-[#1a1a1a] text-amber-300 font-mono font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <h5 className="text-xs font-semibold text-[#1a1a1a]">{item.name}</h5>
                        <p className="text-[11px] text-black/50 font-light">{item.qty} units sold</p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#1a1a1a]">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Expenses Breakdown */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xs border border-black/10 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/10">
              <div>
                <h4 className="text-sm font-serif font-bold text-[#1a1a1a] uppercase tracking-wider">
                  Expenses by Operational Category
                </h4>
                <p className="text-xs text-black/50 font-light">
                  Breakdown of shop utilities, workshop repairs, and overheads.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] text-[10px] uppercase tracking-wider font-semibold rounded-xs flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                <span>Export Expense PDF</span>
              </button>
            </div>

            {expenseByCategory.length === 0 ? (
              <p className="text-xs text-black/40 py-8 text-center">No expenses in this time period.</p>
            ) : (
              <div className="space-y-4 text-xs">
                {expenseByCategory.map(([cat, amount]) => {
                  const pct = totalExpensesAmount > 0 ? (amount / totalExpensesAmount) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex justify-between font-semibold text-[#1a1a1a]">
                        <span>{cat}</span>
                        <span className="font-mono text-[#1a1a1a] font-bold">
                          {formatCurrency(amount)} <span className="text-black/50 text-[10px]">({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#f4f0ea] rounded-full overflow-hidden">
                        <div className="h-full bg-amber-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
