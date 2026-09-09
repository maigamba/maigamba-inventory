import React, { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { formatCurrency, formatDate, parseNumber } from '../utils/formatters';
import { generateAuditPDF, AuditReportData } from '../utils/pdfExport';
import {
  TrendingUp,
  DollarSign,
  Package,
  Download,
  Layers,
  FileText,
  Activity,
  Printer,
  Sparkles,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  ShoppingBag,
  CalendarDays,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR';

type ReportTab =
  | 'ANALYTICS'
  | 'PROFIT'
  | 'VALUATION'
  | 'SALES'
  | 'EXPENSES';

type ChartMetric =
  | 'REVENUE'
  | 'MARGIN'
  | 'TRANSACTIONS'
  | 'UNITS';

export const ReportsView: React.FC = () => {
  const {
    sales,
    products,
    expenses,
    currentUser,
    getProductName,
    getCustomerName,
    addToast,
  } = useInventory();

  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [activeTab, setActiveTab] = useState<ReportTab>('ANALYTICS');
  const [chartMetric, setChartMetric] =
    useState<ChartMetric>('REVENUE');

  /*
   * ---------------------------------------------------------
   * ROBUST DATA NORMALIZATION
   * ---------------------------------------------------------
   *
   * Your PostgreSQL expense records use camelCase:
   * amount
   * expenseDate
   * expenseCategory
   *
   * We also support the older PascalCase records so existing
   * records will continue to work.
   */

  const getExpenseAmount = (expense: any): number => {
    const raw =
      expense?.amount ??
      expense?.Amount ??
      expense?.expenseAmount ??
      expense?.ExpenseAmount ??
      0;

    return parseNumber(raw);
  };

  const getExpenseDate = (expense: any): string => {
    return String(
      expense?.expenseDate ??
      expense?.ExpenseDate ??
      expense?.createdAt ??
      expense?.CreatedAt ??
      ''
    );
  };

  const getExpenseCategory = (expense: any): string => {
    return String(
      expense?.expenseCategory ??
      expense?.ExpenseCategory ??
      expense?.Category ??
      expense?.category ??
      'Miscellaneous / Other'
    ).trim();
  };

  const getExpenseDescription = (expense: any): string => {
    return String(
      expense?.description ??
      expense?.Description ??
      ''
    ).trim();
  };

  const getExpensePaymentMethod = (expense: any): string => {
    return String(
      expense?.paymentMethod ??
      expense?.PaymentMethod ??
      'Cash'
    ).trim() || 'Cash';
  };

  const getExpenseReference = (expense: any): string => {
    return String(
      expense?.receipt ??
      expense?.Reference ??
      ''
    ).trim();
  };

  const getExpenseId = (expense: any): string => {
    return String(
      expense?.expenseId ??
      expense?.ExpenseID ??
      ''
    ).trim();
  };

  const getExpenseRecordedBy = (expense: any): string => {
    return String(
      expense?.recordedBy ??
      expense?.RecordedBy ??
      'Admin'
    ).trim() || 'Admin';
  };

  /*
   * ---------------------------------------------------------
   * GENERIC DATE HELPERS
   * ---------------------------------------------------------
   */

  const getSaleDate = (sale: any): string => {
    return String(
      sale?.SaleDate ??
      sale?.saleDate ??
      sale?.createdAt ??
      sale?.CreatedAt ??
      ''
    );
  };

  const getSaleTotal = (sale: any): number => {
    return parseNumber(
      sale?.TotalAmount ??
      sale?.totalAmount ??
      0
    );
  };

  const getSaleAmountPaid = (sale: any): number => {
    return parseNumber(
      sale?.AmountPaid ??
      sale?.amountPaid ??
      0
    );
  };

  const getSaleBalance = (sale: any): number => {
    return parseNumber(
      sale?.Balance ??
      sale?.balance ??
      0
    );
  };

  const getSaleCustomerId = (sale: any): string => {
    return String(
      sale?.CustomerID ??
      sale?.customerId ??
      ''
    );
  };

  const getSalePaymentMethod = (sale: any): string => {
    return String(
      sale?.PaymentMethod ??
      sale?.paymentMethod ??
      'Cash'
    );
  };

  const getSalePaymentStatus = (sale: any): string => {
    return String(
      sale?.PaymentStatus ??
      sale?.paymentStatus ??
      'Pending'
    );
  };

  const getSaleInvoiceNumber = (sale: any): string => {
    return String(
      sale?.InvoiceNumber ??
      sale?.invoiceNumber ??
      sale?.SaleID ??
      sale?.saleId ??
      ''
    );
  };

  /*
   * ---------------------------------------------------------
   * DATE FILTER
   * ---------------------------------------------------------
   */

  const isWithinDateFilter = (
    dateValue: string,
    filter: DateFilter
  ): boolean => {
    if (filter === 'ALL') {
      return true;
    }

    if (!dateValue) {
      return false;
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const now = new Date();

    if (filter === 'TODAY') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }

    if (filter === 'WEEK') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return date >= weekAgo && date <= now;
    }

    if (filter === 'MONTH') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    }

    if (filter === 'YEAR') {
      return date.getFullYear() === now.getFullYear();
    }

    return true;
  };

  /*
   * ---------------------------------------------------------
   * FILTERED SALES
   * ---------------------------------------------------------
   */

  const filteredSales = useMemo(() => {
    return sales.filter((sale) =>
      isWithinDateFilter(
        getSaleDate(sale),
        dateFilter
      )
    );
  }, [sales, dateFilter]);

  /*
   * ---------------------------------------------------------
   * FILTERED EXPENSES
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   * This now uses expenseDate, not only ExpenseDate.
   */

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) =>
      isWithinDateFilter(
        getExpenseDate(expense),
        dateFilter
      )
    );
  }, [expenses, dateFilter]);

  /*
   * ---------------------------------------------------------
   * SALES METRICS
   * ---------------------------------------------------------
   */

  const totalSalesRevenue = useMemo(() => {
    return filteredSales.reduce(
      (sum, sale) =>
        sum + getSaleTotal(sale),
      0
    );
  }, [filteredSales]);

  const totalAmountPaid = useMemo(() => {
    return filteredSales.reduce(
      (sum, sale) =>
        sum + getSaleAmountPaid(sale),
      0
    );
  }, [filteredSales]);

  const totalUnpaidReceivables = useMemo(() => {
    return filteredSales.reduce(
      (sum, sale) =>
        sum + getSaleBalance(sale),
      0
    );
  }, [filteredSales]);

  /*
   * ---------------------------------------------------------
   * EXPENSE METRICS
   * ---------------------------------------------------------
   */

  const totalExpensesAmount = useMemo(() => {
    return filteredExpenses.reduce(
      (sum, expense) =>
        sum + getExpenseAmount(expense),
      0
    );
  }, [filteredExpenses]);

  /*
   * ---------------------------------------------------------
   * COGS / GROSS PROFIT
   * ---------------------------------------------------------
   *
   * If a product exists, we use its CostPrice.
   * If product information is unavailable, we retain the
   * previous 75% fallback.
   */

  const {
    estimatedCOGS,
    estimatedGrossProfit,
  } = useMemo(() => {
    let cogs = 0;

    filteredSales.forEach((sale: any) => {
      const items = Array.isArray(sale.items)
        ? sale.items
        : [];

      if (items.length > 0) {
        items.forEach((item: any) => {
          const product = products.find(
            (productItem) =>
              String(productItem.ProductID) ===
              String(item.ProductID)
          );

          const quantity =
            parseNumber(item.Quantity) || 1;

          const unitPrice =
            parseNumber(
              item.UnitPrice ??
              item.unitPrice ??
              0
            );

          const costPrice = product
            ? parseNumber(product.CostPrice)
            : unitPrice * 0.75;

          cogs += costPrice * quantity;
        });
      } else {
        cogs += getSaleTotal(sale) * 0.75;
      }
    });

    const grossProfit = Math.max(
      0,
      totalSalesRevenue - cogs
    );

    return {
      estimatedCOGS: cogs,
      estimatedGrossProfit: grossProfit,
    };
  }, [
    filteredSales,
    products,
    totalSalesRevenue,
  ]);

  const netProfit =
    estimatedGrossProfit -
    totalExpensesAmount;

  /*
   * ---------------------------------------------------------
   * INVENTORY VALUATION
   * ---------------------------------------------------------
   */

  const inventoryValuation = useMemo(() => {
    let totalStockQty = 0;
    let totalCostVal = 0;
    let totalRetailVal = 0;

    products.forEach((product) => {
      const quantity =
        parseNumber(product.Quantity);

      if (quantity > 0) {
        const costPrice =
          parseNumber(product.CostPrice);

        const sellingPrice =
          parseNumber(product.SellingPrice);

        totalStockQty += quantity;
        totalCostVal +=
          quantity * costPrice;
        totalRetailVal +=
          quantity * sellingPrice;
      }
    });

    return {
      totalStockQty,
      totalCostVal,
      totalRetailVal,
      potentialGrossProfit:
        totalRetailVal - totalCostVal,
    };
  }, [products]);

  /*
   * ---------------------------------------------------------
   * BEST SELLERS
   * ---------------------------------------------------------
   */

  const bestSellers = useMemo(() => {
    const stats: Record<
      string,
      {
        qty: number;
        revenue: number;
        name: string;
      }
    > = {};

    filteredSales.forEach((sale: any) => {
      const items = Array.isArray(sale.items)
        ? sale.items
        : [];

      items.forEach((item: any) => {
        const productId = String(
          item.ProductID ??
          item.productId ??
          ''
        );

        if (!productId) {
          return;
        }

        if (!stats[productId]) {
          stats[productId] = {
            qty: 0,
            revenue: 0,
            name:
              item.ProductName ??
              item.productName ??
              getProductName(productId),
          };
        }

        const quantity =
          parseNumber(item.Quantity) || 1;

        const unitPrice =
          parseNumber(
            item.UnitPrice ??
            item.unitPrice ??
            0
          );

        stats[productId].qty += quantity;
        stats[productId].revenue +=
          quantity * unitPrice;
      });
    });

    return Object.entries(stats)
      .map(([id, stat]) => ({
        id,
        ...stat,
      }))
      .sort(
        (a, b) =>
          b.revenue - a.revenue
      )
      .slice(0, 8);
  }, [
    filteredSales,
    getProductName,
  ]);

  /*
   * ---------------------------------------------------------
   * EXPENSES BY CATEGORY
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   * Uses expenseCategory + amount.
   */

  const expenseByCategory = useMemo(() => {
    const map: Record<
      string,
      number
    > = {};

    filteredExpenses.forEach(
      (expense) => {
        const category =
          getExpenseCategory(expense);

        const amount =
          getExpenseAmount(expense);

        map[category] =
          (map[category] || 0) +
          amount;
      }
    );

    return Object.entries(map)
      .sort(
        (a, b) => b[1] - a[1]
      );
  }, [filteredExpenses]);

  /*
   * ---------------------------------------------------------
   * 30-DAY SALES PERFORMANCE
   * ---------------------------------------------------------
   */

  const thirtyDayPerformance =
    useMemo(() => {
      const timeline: Array<{
        date: string;
        label: string;
        revenue: number;
        profit: number;
        transactions: number;
        units: number;
      }> = [];

      const now = new Date();

      for (let i = 29; i >= 0; i--) {
        const targetDate =
          new Date(now);

        targetDate.setDate(
          now.getDate() - i
        );

        const year =
          targetDate.getFullYear();

        const month = String(
          targetDate.getMonth() + 1
        ).padStart(2, '0');

        const day = String(
          targetDate.getDate()
        ).padStart(2, '0');

        const dateStr =
          `${year}-${month}-${day}`;

        const shortLabel =
          targetDate.toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: 'numeric',
            }
          );

        const daySales =
          sales.filter((sale: any) => {
            const rawDate =
              getSaleDate(sale);

            if (!rawDate) {
              return false;
            }

            const saleDate =
              new Date(rawDate);

            if (
              Number.isNaN(
                saleDate.getTime()
              )
            ) {
              return false;
            }

            const saleYear =
              saleDate.getFullYear();

            const saleMonth = String(
              saleDate.getMonth() + 1
            ).padStart(2, '0');

            const saleDay = String(
              saleDate.getDate()
            ).padStart(2, '0');

            return (
              `${saleYear}-${saleMonth}-${saleDay}` ===
              dateStr
            );
          });

        const dayRevenue =
          daySales.reduce(
            (sum, sale) =>
              sum + getSaleTotal(sale),
            0
          );

        let units = 0;
        let dayProfit = 0;

        daySales.forEach(
          (sale: any) => {
            const items =
              Array.isArray(sale.items)
                ? sale.items
                : [];

            if (items.length > 0) {
              items.forEach(
                (item: any) => {
                  const quantity =
                    parseNumber(
                      item.Quantity
                    ) || 1;

                  const unitPrice =
                    parseNumber(
                      item.UnitPrice ??
                      item.unitPrice ??
                      0
                    );

                  const product =
                    products.find(
                      (productItem) =>
                        String(
                          productItem.ProductID
                        ) ===
                        String(
                          item.ProductID ??
                          item.productId
                        )
                    );

                  const cost =
                    product
                      ? parseNumber(
                        product.CostPrice
                      )
                      : unitPrice * 0.75;

                  units += quantity;

                  dayProfit +=
                    Math.max(
                      0,
                      (
                        unitPrice -
                        cost
                      ) * quantity
                    );
                }
              );
            } else {
              units += 1;

              dayProfit +=
                getSaleTotal(sale) *
                0.25;
            }
          }
        );

        timeline.push({
          date: dateStr,
          label: shortLabel,
          revenue:
            Math.round(dayRevenue),
          profit:
            Math.round(dayProfit),
          transactions:
            daySales.length,
          units,
        });
      }

      return timeline;
    }, [sales, products]);

  /*
   * ---------------------------------------------------------
   * 30-DAY SUMMARY
   * ---------------------------------------------------------
   */

  const thirtyDayStats =
    useMemo(() => {
      const totalRev =
        thirtyDayPerformance.reduce(
          (sum, day) =>
            sum + day.revenue,
          0
        );

      const totalTransactions =
        thirtyDayPerformance.reduce(
          (sum, day) =>
            sum + day.transactions,
          0
        );

      const totalUnits =
        thirtyDayPerformance.reduce(
          (sum, day) =>
            sum + day.units,
          0
        );

      const totalProfit =
        thirtyDayPerformance.reduce(
          (sum, day) =>
            sum + day.profit,
          0
        );

      const avgDailyRev =
        totalRev / 30;

      const peakDay =
        thirtyDayPerformance.reduce(
          (peak, day) =>
            day.revenue >
              peak.revenue
              ? day
              : peak,
          thirtyDayPerformance[0] || {
            date: '',
            label: '',
            revenue: 0,
            profit: 0,
            transactions: 0,
            units: 0,
          }
        );

      return {
        totalRev,
        totalTransactions,
        totalUnits,
        totalProfit,
        avgDailyRev,
        peakDay,
      };
    }, [thirtyDayPerformance]);

  /*
   * ---------------------------------------------------------
   * CSV HELPER
   * ---------------------------------------------------------
   */

  const csvEscape = (
    value: unknown
  ): string => {
    const text = String(
      value ?? ''
    );

    return `"${text.replace(
      /"/g,
      '""'
    )}"`;
  };

  /*
   * ---------------------------------------------------------
   * PDF EXPORT
   * ---------------------------------------------------------
   */

  const handleExportPDF = () => {
    try {
      let reportData: AuditReportData;

      const periodLabel =
        `Filter: ${dateFilter}`;

      const auditorName =
        currentUser?.FullName ||
        'Store Auditor';

      if (
        activeTab ===
        'VALUATION'
      ) {
        reportData = {
          reportTitle:
            'Inventory Stock Valuation & Asset Register',
          periodLabel,
          generatedBy:
            auditorName,
          fileNamePrefix:
            'inventory_valuation_audit',
          summaryMetrics: [
            {
              label:
                'Total Stock Units',
              value:
                `${inventoryValuation.totalStockQty} Pcs`,
            },
            {
              label:
                'Cost Valuation',
              value:
                formatCurrency(
                  inventoryValuation.totalCostVal
                ),
            },
            {
              label:
                'Retail Valuation',
              value:
                formatCurrency(
                  inventoryValuation.totalRetailVal
                ),
            },
            {
              label:
                'Projected Margin',
              value:
                formatCurrency(
                  inventoryValuation.potentialGrossProfit
                ),
            },
          ],
          tableHeaders: [
            'SKU',
            'Product Name',
            'Category',
            'Stock Qty',
            'Cost (NGN)',
            'Selling (NGN)',
            'Asset Val (NGN)',
          ],
          tableRows: products
            .slice()
            .sort(
              (a, b) =>
                parseNumber(
                  b.Quantity
                ) *
                parseNumber(
                  b.SellingPrice
                ) -
                parseNumber(
                  a.Quantity
                ) *
                parseNumber(
                  a.SellingPrice
                )
            )
            .map((product) => [
              product.SKU,
              product.ProductName,
              product.CategoryID ||
              'Hardware',
              parseNumber(
                product.Quantity
              ),
              formatCurrency(
                product.CostPrice
              ),
              formatCurrency(
                product.SellingPrice
              ),
              formatCurrency(
                parseNumber(
                  product.Quantity
                ) *
                parseNumber(
                  product.CostPrice
                )
              ),
            ]),
        };
      } else if (
        activeTab === 'SALES'
      ) {
        reportData = {
          reportTitle:
            'Commercial Sales & Invoicing Audit Ledger',
          periodLabel,
          generatedBy:
            auditorName,
          fileNamePrefix:
            'sales_transactions_audit',
          summaryMetrics: [
            {
              label:
                'Total Inflow',
              value:
                formatCurrency(
                  totalSalesRevenue
                ),
            },
            {
              label:
                'Paid Collected',
              value:
                formatCurrency(
                  totalAmountPaid
                ),
            },
            {
              label:
                'Pending Receivables',
              value:
                formatCurrency(
                  totalUnpaidReceivables
                ),
            },
            {
              label:
                'Total Invoices',
              value:
                `${filteredSales.length} Slips`,
            },
          ],
          tableHeaders: [
            'Date',
            'Invoice #',
            'Customer',
            'Payment Method',
            'Status',
            'Paid (NGN)',
            'Total (NGN)',
          ],
          tableRows:
            filteredSales.map(
              (sale: any) => [
                formatDate(
                  getSaleDate(
                    sale
                  )
                ),
                getSaleInvoiceNumber(
                  sale
                ),
                getCustomerName(
                  getSaleCustomerId(
                    sale
                  )
                ),
                getSalePaymentMethod(
                  sale
                ),
                getSalePaymentStatus(
                  sale
                ),
                formatCurrency(
                  getSaleAmountPaid(
                    sale
                  )
                ),
                formatCurrency(
                  getSaleTotal(
                    sale
                  )
                ),
              ]
            ),
        };
      } else if (
        activeTab ===
        'EXPENSES'
      ) {
        reportData = {
          reportTitle:
            'Operational Expenditure & Workshop Overhead',
          periodLabel,
          generatedBy:
            auditorName,
          fileNamePrefix:
            'expenses_audit_ledger',
          summaryMetrics: [
            {
              label:
                'Total Expenses',
              value:
                formatCurrency(
                  totalExpensesAmount
                ),
            },
            {
              label:
                'Expense Entries',
              value:
                `${filteredExpenses.length} Records`,
            },
            {
              label:
                'Primary Category',
              value:
                expenseByCategory[0]?.[0] ||
                'General',
            },
            {
              label:
                'Top Overhead',
              value:
                formatCurrency(
                  expenseByCategory[0]?.[1] ||
                  0
                ),
            },
          ],
          tableHeaders: [
            'Expense Date',
            'Category',
            'Description',
            'Payment Method',
            'Amount (NGN)',
          ],
          tableRows:
            filteredExpenses.map(
              (expense) => [
                formatDate(
                  getExpenseDate(
                    expense
                  )
                ),
                getExpenseCategory(
                  expense
                ),
                getExpenseDescription(
                  expense
                ) ||
                'Operational disbursement',
                getExpensePaymentMethod(
                  expense
                ),
                formatCurrency(
                  getExpenseAmount(
                    expense
                  )
                ),
              ]
            ),
        };
      } else {
        reportData = {
          reportTitle:
            '30-Day Daily Sales Performance & Revenue Audit',
          periodLabel:
            'Last 30 Consecutive Days',
          generatedBy:
            auditorName,
          fileNamePrefix:
            '30day_sales_performance',
          summaryMetrics: [
            {
              label:
                '30-Day Revenue',
              value:
                formatCurrency(
                  thirtyDayStats.totalRev
                ),
            },
            {
              label:
                '30-Day Gross Profit',
              value:
                formatCurrency(
                  thirtyDayStats.totalProfit
                ),
            },
            {
              label:
                'Total Transactions',
              value:
                `${thirtyDayStats.totalTransactions} Invoices`,
            },
            {
              label:
                'Peak Daily Sales',
              value:
                formatCurrency(
                  thirtyDayStats
                    .peakDay
                    ?.revenue || 0
                ),
            },
          ],
          tableHeaders: [
            'Date',
            'Day',
            'Revenue (NGN)',
            'Est. Margin (NGN)',
            'Invoices',
            'Hardware Units',
          ],
          tableRows:
            thirtyDayPerformance.map(
              (day) => [
                day.date,
                day.label,
                formatCurrency(
                  day.revenue
                ),
                formatCurrency(
                  day.profit
                ),
                day.transactions,
                day.units,
              ]
            ),
        };
      }

      generateAuditPDF(
        reportData
      );

      addToast(
        'success',
        'Official Audit PDF generated and downloaded.',
        'Document Export'
      );
    } catch (error) {
      console.error(
        'PDF export error:',
        error
      );

      addToast(
        'error',
        'Failed to generate PDF document. Check console for details.'
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * CSV EXPORT
   * ---------------------------------------------------------
   */

  const exportToCSV = () => {
    let csvContent =
      'data:text/csv;charset=utf-8,';

    if (
      activeTab === 'SALES'
    ) {
      csvContent +=
        'SaleID,InvoiceNumber,Date,Customer,TotalAmount,AmountPaid,Balance,PaymentMethod,PaymentStatus\n';

      filteredSales.forEach(
        (sale: any) => {
          csvContent +=
            [
              sale?.SaleID ??
              sale?.saleId ??
              '',
              getSaleInvoiceNumber(
                sale
              ),
              getSaleDate(sale),
              getCustomerName(
                getSaleCustomerId(
                  sale
                )
              ),
              getSaleTotal(sale),
              getSaleAmountPaid(
                sale
              ),
              getSaleBalance(
                sale
              ),
              getSalePaymentMethod(
                sale
              ),
              getSalePaymentStatus(
                sale
              ),
            ]
              .map(csvEscape)
              .join(',') +
            '\n';
        }
      );
    } else if (
      activeTab ===
      'VALUATION'
    ) {
      csvContent +=
        'SKU,ProductName,StockQuantity,CostPrice,SellingPrice,TotalCostValue,TotalRetailValue\n';

      products.forEach(
        (product) => {
          const quantity =
            parseNumber(
              product.Quantity
            );

          const cost =
            parseNumber(
              product.CostPrice
            );

          const selling =
            parseNumber(
              product.SellingPrice
            );

          csvContent +=
            [
              product.SKU,
              product.ProductName,
              quantity,
              cost,
              selling,
              quantity * cost,
              quantity * selling,
            ]
              .map(csvEscape)
              .join(',') +
            '\n';
        }
      );
    } else if (
      activeTab ===
      'EXPENSES'
    ) {
      csvContent +=
        'ExpenseID,Date,Category,Amount,Description,PaymentMethod,Reference,RecordedBy\n';

      filteredExpenses.forEach(
        (expense) => {
          csvContent +=
            [
              getExpenseId(
                expense
              ),
              getExpenseDate(
                expense
              ),
              getExpenseCategory(
                expense
              ),
              getExpenseAmount(
                expense
              ),
              getExpenseDescription(
                expense
              ),
              getExpensePaymentMethod(
                expense
              ),
              getExpenseReference(
                expense
              ),
              getExpenseRecordedBy(
                expense
              ),
            ]
              .map(csvEscape)
              .join(',') +
            '\n';
        }
      );
    } else {
      csvContent +=
        'Date,Label,Revenue,Profit,Transactions,Units\n';

      thirtyDayPerformance.forEach(
        (day) => {
          csvContent +=
            [
              day.date,
              day.label,
              day.revenue,
              day.profit,
              day.transactions,
              day.units,
            ]
              .map(csvEscape)
              .join(',') +
            '\n';
        }
      );
    }

    const encodedUri =
      encodeURI(csvContent);

    const link =
      document.createElement(
        'a'
      );

    link.setAttribute(
      'href',
      encodedUri
    );

    link.setAttribute(
      'download',
      `Maigamba_${activeTab.toLowerCase()}_report.csv`
    );

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    addToast(
      'success',
      'CSV spreadsheet exported.'
    );
  };

  /*
   * ---------------------------------------------------------
   * UI HELPERS
   * ---------------------------------------------------------
   */

  const tabs: Array<{
    id: ReportTab;
    label: string;
    icon: React.ReactNode;
  }> = [
      {
        id: 'ANALYTICS',
        label: 'Overview',
        icon: (
          <Activity className="w-4 h-4" />
        ),
      },
      {
        id: 'PROFIT',
        label: 'Profit & Loss',
        icon: (
          <TrendingUp className="w-4 h-4" />
        ),
      },
      {
        id: 'VALUATION',
        label: 'Inventory',
        icon: (
          <Package className="w-4 h-4" />
        ),
      },
      {
        id: 'SALES',
        label: 'Sales',
        icon: (
          <Receipt className="w-4 h-4" />
        ),
      },
      {
        id: 'EXPENSES',
        label: 'Expenses',
        icon: (
          <Wallet className="w-4 h-4" />
        ),
      },
    ];

  const dateFilters: DateFilter[] = [
    'ALL',
    'TODAY',
    'WEEK',
    'MONTH',
    'YEAR',
  ];

  return (
    <div className="min-h-full bg-[#f7f6f3] text-[#181818]">
      <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="bg-white border border-black/[0.08] rounded-2xl shadow-sm overflow-hidden">

          <div className="p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-11 h-11 rounded-xl bg-[#181818] text-white flex items-center justify-center shadow-sm">
                    <BarChart3 className="w-5 h-5" />
                  </div>

                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                      Business Reports
                    </h1>

                    <p className="text-xs text-black/45 mt-1">
                      Maigamba Computer Technology
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-bold uppercase tracking-wider">
                    Live Analytics
                  </span>
                </div>

                <p className="text-xs text-black/50 mt-4 max-w-2xl leading-relaxed">
                  Monitor sales performance, profit,
                  inventory value, customer receivables
                  and operational expenses from one
                  financial reporting workspace.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">

                <button
                  type="button"
                  onClick={
                    exportToCSV
                  }
                  className="h-10 px-4 rounded-xl border border-black/10 bg-white hover:bg-[#f7f6f3] hover:border-black/20 transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>

                <button
                  type="button"
                  onClick={
                    handleExportPDF
                  }
                  className="h-10 px-4 rounded-xl bg-[#181818] hover:bg-black text-white transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider"
                >
                  <FileText className="w-4 h-4 text-amber-300" />
                  Export PDF
                </button>

              </div>
            </div>
          </div>

          {/* Date filter */}

          <div className="px-5 sm:px-6 lg:px-7 py-3 border-t border-black/[0.06] bg-[#fbfaf8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">

            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-black/45">
              <CalendarDays className="w-4 h-4" />
              Reporting Period
            </div>

            <div className="flex items-center gap-1 p-1 bg-white border border-black/[0.08] rounded-xl overflow-x-auto">

              {dateFilters.map(
                (filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() =>
                      setDateFilter(
                        filter
                      )
                    }
                    className={`px-3 sm:px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${dateFilter ===
                        filter
                        ? 'bg-[#181818] text-white shadow-sm'
                        : 'text-black/45 hover:text-black hover:bg-black/[0.04]'
                      }`}
                  >
                    {filter ===
                      'ALL'
                      ? 'All Time'
                      : filter ===
                        'TODAY'
                        ? 'Today'
                        : filter ===
                          'WEEK'
                          ? '7 Days'
                          : filter ===
                            'MONTH'
                            ? 'This Month'
                            : 'This Year'}
                  </button>
                )
              )}

            </div>
          </div>
        </div>

        {/* =====================================================
            TOP SUMMARY CARDS
        ====================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Revenue */}

          <div className="group bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:border-black/15 transition-all duration-300">

            <div className="flex items-center justify-between">

              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>

              <ArrowUpRight className="w-4 h-4 text-black/20 group-hover:text-blue-600 transition-colors" />
            </div>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-black/40">
              Sales Revenue
            </p>

            <h3 className="mt-1 text-2xl font-bold tracking-tight">
              {formatCurrency(
                totalSalesRevenue
              )}
            </h3>

            <p className="mt-2 text-[10px] text-black/40">
              {filteredSales.length}{' '}
              invoices in selected period
            </p>
          </div>

          {/* Profit */}

          <div className="group bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:border-black/15 transition-all duration-300">

            <div className="flex items-center justify-between">

              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>

              <ArrowUpRight className="w-4 h-4 text-black/20 group-hover:text-emerald-600 transition-colors" />
            </div>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-black/40">
              Estimated Gross Profit
            </p>

            <h3 className="mt-1 text-2xl font-bold tracking-tight text-emerald-800">
              {formatCurrency(
                estimatedGrossProfit
              )}
            </h3>

            <p className="mt-2 text-[10px] text-black/40">
              After estimated COGS
            </p>
          </div>

          {/* Expenses */}

          <div className="group bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:border-black/15 transition-all duration-300">

            <div className="flex items-center justify-between">

              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>

              <ArrowDownRight className="w-4 h-4 text-black/20 group-hover:text-rose-600 transition-colors" />
            </div>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-black/40">
              Operating Expenses
            </p>

            <h3 className="mt-1 text-2xl font-bold tracking-tight text-rose-700">
              {formatCurrency(
                totalExpensesAmount
              )}
            </h3>

            <p className="mt-2 text-[10px] text-black/40">
              {filteredExpenses.length}{' '}
              expense records
            </p>
          </div>

          {/* Inventory */}

          <div className="group bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:border-black/15 transition-all duration-300">

            <div className="flex items-center justify-between">

              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>

              <ArrowUpRight className="w-4 h-4 text-black/20 group-hover:text-amber-600 transition-colors" />
            </div>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-black/40">
              Inventory at Cost
            </p>

            <h3 className="mt-1 text-2xl font-bold tracking-tight text-amber-800">
              {formatCurrency(
                inventoryValuation.totalCostVal
              )}
            </h3>

            <p className="mt-2 text-[10px] text-black/40">
              {inventoryValuation.totalStockQty.toLocaleString()}{' '}
              units currently in stock
            </p>
          </div>

        </div>

        {/* =====================================================
            NAVIGATION
        ====================================================== */}

        <div className="bg-white border border-black/[0.08] rounded-2xl p-1.5 shadow-sm overflow-x-auto">

          <div className="flex items-center gap-1 min-w-max">

            {tabs.map(
              (tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      tab.id
                    )
                  }
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab ===
                      tab.id
                      ? 'bg-[#181818] text-white shadow-sm'
                      : 'text-black/45 hover:text-black hover:bg-black/[0.04]'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              )
            )}

          </div>
        </div>

        {/* =====================================================
            ANALYTICS TAB
        ====================================================== */}

        {activeTab ===
          'ANALYTICS' && (
            <div className="space-y-5">

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

                <div className="lg:col-span-3 bg-white border border-black/[0.08] rounded-2xl shadow-sm p-5 sm:p-6">

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                    <div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-600" />
                        <h3 className="text-sm font-bold">
                          Sales Performance
                        </h3>
                      </div>

                      <p className="text-[11px] text-black/40 mt-1">
                        Daily commercial activity for
                        the last 30 days.
                      </p>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-[#f7f6f3] rounded-xl border border-black/[0.06] overflow-x-auto">

                      {[
                        [
                          'REVENUE',
                          'Revenue',
                        ],
                        [
                          'MARGIN',
                          'Profit',
                        ],
                        [
                          'TRANSACTIONS',
                          'Invoices',
                        ],
                        [
                          'UNITS',
                          'Units',
                        ],
                      ].map(
                        ([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setChartMetric(
                                value as ChartMetric
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all ${chartMetric ===
                                value
                                ? 'bg-white text-black shadow-sm'
                                : 'text-black/40 hover:text-black'
                              }`}
                          >
                            {label}
                          </button>
                        )
                      )}

                    </div>

                  </div>

                  <div className="h-[330px] mt-5">

                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <AreaChart
                        data={
                          thirtyDayPerformance
                        }
                        margin={{
                          top: 10,
                          right: 10,
                          left: 0,
                          bottom: 10,
                        }}
                      >
                        <defs>

                          <linearGradient
                            id="reportRevenueGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#181818"
                              stopOpacity={
                                0.2
                              }
                            />
                            <stop
                              offset="95%"
                              stopColor="#181818"
                              stopOpacity={
                                0
                              }
                            />
                          </linearGradient>

                          <linearGradient
                            id="reportProfitGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#d97706"
                              stopOpacity={
                                0.22
                              }
                            />
                            <stop
                              offset="95%"
                              stopColor="#d97706"
                              stopOpacity={
                                0
                              }
                            />
                          </linearGradient>

                          <linearGradient
                            id="reportBlueGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#2563eb"
                              stopOpacity={
                                0.18
                              }
                            />
                            <stop
                              offset="95%"
                              stopColor="#2563eb"
                              stopOpacity={
                                0
                              }
                            />
                          </linearGradient>

                        </defs>

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e8e5df"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="label"
                          stroke="#999"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          interval={
                            'preserveStartEnd'
                          }
                        />

                        <YAxis
                          stroke="#999"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(
                            value
                          ) => {
                            if (
                              chartMetric ===
                              'TRANSACTIONS' ||
                              chartMetric ===
                              'UNITS'
                            ) {
                              return String(
                                value
                              );
                            }

                            if (
                              value >=
                              1000000
                            ) {
                              return `₦${(
                                value /
                                1000000
                              ).toFixed(
                                1
                              )}M`;
                            }

                            if (
                              value >=
                              1000
                            ) {
                              return `₦${(
                                value /
                                1000
                              ).toFixed(
                                0
                              )}k`;
                            }

                            return `₦${value}`;
                          }}
                        />

                        <Tooltip
                          content={({
                            active,
                            payload,
                          }) => {
                            if (
                              !active ||
                              !payload ||
                              !payload.length
                            ) {
                              return null;
                            }

                            const data =
                              payload[0]
                                .payload;

                            return (
                              <div className="bg-[#181818] text-white rounded-xl p-4 shadow-xl border border-white/10 min-w-[190px]">

                                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                                  <span className="font-bold text-xs">
                                    {
                                      data.label
                                    }
                                  </span>

                                  <span className="text-[9px] text-white/40">
                                    {
                                      data.date
                                    }
                                  </span>
                                </div>

                                <div className="space-y-2 text-[10px]">

                                  <div className="flex justify-between gap-5">
                                    <span className="text-white/50">
                                      Revenue
                                    </span>
                                    <span className="font-bold">
                                      {formatCurrency(
                                        data.revenue
                                      )}
                                    </span>
                                  </div>

                                  <div className="flex justify-between gap-5">
                                    <span className="text-white/50">
                                      Profit
                                    </span>
                                    <span className="font-bold text-emerald-300">
                                      {formatCurrency(
                                        data.profit
                                      )}
                                    </span>
                                  </div>

                                  <div className="flex justify-between gap-5">
                                    <span className="text-white/50">
                                      Invoices
                                    </span>
                                    <span>
                                      {
                                        data.transactions
                                      }
                                    </span>
                                  </div>

                                  <div className="flex justify-between gap-5">
                                    <span className="text-white/50">
                                      Units
                                    </span>
                                    <span>
                                      {
                                        data.units
                                      }
                                    </span>
                                  </div>

                                </div>
                              </div>
                            );
                          }}
                        />

                        {chartMetric ===
                          'REVENUE' && (
                            <Area
                              type="monotone"
                              dataKey="revenue"
                              stroke="#181818"
                              strokeWidth={
                                2.5
                              }
                              fill="url(#reportRevenueGradient)"
                              activeDot={{
                                r: 6,
                                fill: '#181818',
                                stroke:
                                  '#fff',
                                strokeWidth: 2,
                              }}
                            />
                          )}

                        {chartMetric ===
                          'MARGIN' && (
                            <Area
                              type="monotone"
                              dataKey="profit"
                              stroke="#d97706"
                              strokeWidth={
                                2.5
                              }
                              fill="url(#reportProfitGradient)"
                              activeDot={{
                                r: 6,
                                fill: '#d97706',
                                stroke:
                                  '#fff',
                                strokeWidth: 2,
                              }}
                            />
                          )}

                        {chartMetric ===
                          'TRANSACTIONS' && (
                            <Area
                              type="monotone"
                              dataKey="transactions"
                              stroke="#2563eb"
                              strokeWidth={
                                2.5
                              }
                              fill="url(#reportBlueGradient)"
                              activeDot={{
                                r: 6,
                                fill: '#2563eb',
                                stroke:
                                  '#fff',
                                strokeWidth: 2,
                              }}
                            />
                          )}

                        {chartMetric ===
                          'UNITS' && (
                            <Area
                              type="monotone"
                              dataKey="units"
                              stroke="#059669"
                              strokeWidth={
                                2.5
                              }
                              fill="url(#reportBlueGradient)"
                              activeDot={{
                                r: 6,
                                fill: '#059669',
                                stroke:
                                  '#fff',
                                strokeWidth: 2,
                              }}
                            />
                          )}

                      </AreaChart>
                    </ResponsiveContainer>

                  </div>
                </div>

                {/* 30 DAY SUMMARY */}

                <div className="space-y-4">

                  <div className="bg-[#181818] text-white rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-white/50">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-[9px] uppercase tracking-wider font-bold">
                        30-Day Revenue
                      </span>
                    </div>

                    <div className="text-2xl font-bold mt-4">
                      {formatCurrency(
                        thirtyDayStats.totalRev
                      )}
                    </div>

                    <div className="text-[10px] text-white/40 mt-1">
                      Total sales volume
                    </div>
                  </div>

                  <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-black/40">
                      Daily Average
                    </p>

                    <p className="text-xl font-bold mt-3">
                      {formatCurrency(
                        thirtyDayStats.avgDailyRev
                      )}
                    </p>

                    <p className="text-[10px] text-black/40 mt-1">
                      Average daily revenue
                    </p>
                  </div>

                  <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-black/40">
                      Peak Sales Day
                    </p>

                    <p className="text-xl font-bold mt-3">
                      {formatCurrency(
                        thirtyDayStats
                          .peakDay
                          ?.revenue || 0
                      )}
                    </p>

                    <p className="text-[10px] text-black/40 mt-1">
                      {
                        thirtyDayStats
                          .peakDay
                          ?.label
                      }
                    </p>
                  </div>

                </div>

              </div>

              {/* Daily ledger */}

              <div className="bg-white border border-black/[0.08] rounded-2xl shadow-sm overflow-hidden">

                <div className="p-5 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  <div>
                    <h3 className="text-sm font-bold">
                      Daily Performance Ledger
                    </h3>

                    <p className="text-[10px] text-black/40 mt-1">
                      Day-by-day sales activity,
                      revenue and units sold.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleExportPDF
                    }
                    className="px-3 py-2 rounded-xl bg-[#181818] hover:bg-black text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" />
                    Print Ledger
                  </button>

                </div>

                <div className="overflow-x-auto max-h-[380px] overflow-y-auto">

                  <table className="w-full text-xs">

                    <thead className="sticky top-0 bg-[#faf9f7] border-b border-black/[0.06]">
                      <tr>
                        <th className="text-left px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Date
                        </th>
                        <th className="text-right px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Revenue
                        </th>
                        <th className="text-right px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Profit
                        </th>
                        <th className="text-center px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Invoices
                        </th>
                        <th className="text-center px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Units
                        </th>
                        <th className="text-right px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          AOV
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-black/[0.05]">

                      {thirtyDayPerformance
                        .slice()
                        .reverse()
                        .map(
                          (day) => {
                            const aov =
                              day.transactions >
                                0
                                ? day.revenue /
                                day.transactions
                                : 0;

                            return (
                              <tr
                                key={
                                  day.date
                                }
                                className="hover:bg-[#faf9f7] transition-colors"
                              >
                                <td className="px-5 py-3 font-medium">
                                  {
                                    day.date
                                  }
                                  <span className="block text-[9px] text-black/35">
                                    {
                                      day.label
                                    }
                                  </span>
                                </td>

                                <td className="px-5 py-3 text-right font-mono font-bold">
                                  {formatCurrency(
                                    day.revenue
                                  )}
                                </td>

                                <td className="px-5 py-3 text-right font-mono text-emerald-700 font-semibold">
                                  {formatCurrency(
                                    day.profit
                                  )}
                                </td>

                                <td className="px-5 py-3 text-center font-mono">
                                  {
                                    day.transactions
                                  }
                                </td>

                                <td className="px-5 py-3 text-center font-mono">
                                  {
                                    day.units
                                  }
                                </td>

                                <td className="px-5 py-3 text-right font-mono text-black/50">
                                  {aov > 0
                                    ? formatCurrency(
                                      aov
                                    )
                                    : '—'}
                                </td>
                              </tr>
                            );
                          }
                        )}

                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        {/* =====================================================
            PROFIT & LOSS
        ====================================================== */}

        {activeTab ===
          'PROFIT' && (
            <div className="space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

                <div className="group bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Sales Revenue
                  </p>

                  <p className="text-2xl font-bold mt-3">
                    {formatCurrency(
                      totalSalesRevenue
                    )}
                  </p>

                  <p className="text-[10px] text-black/40 mt-1">
                    {filteredSales.length}{' '}
                    invoices
                  </p>
                </div>

                <div className="group bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Estimated COGS
                  </p>

                  <p className="text-2xl font-bold mt-3 text-black/70">
                    {formatCurrency(
                      estimatedCOGS
                    )}
                  </p>

                  <p className="text-[10px] text-black/40 mt-1">
                    Cost of hardware sold
                  </p>
                </div>

                <div className="group bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Operating Expenses
                  </p>

                  <p className="text-2xl font-bold mt-3 text-rose-700">
                    -{formatCurrency(
                      totalExpensesAmount
                    )}
                  </p>

                  <p className="text-[10px] text-black/40 mt-1">
                    {filteredExpenses.length}{' '}
                    expense records
                  </p>
                </div>

                <div
                  className={`rounded-2xl p-5 border shadow-sm ${netProfit >= 0
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-rose-50 border-rose-200'
                    }`}
                >
                  <p className="text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Estimated Net Profit
                  </p>

                  <p
                    className={`text-2xl font-bold mt-3 ${netProfit >= 0
                        ? 'text-emerald-800'
                        : 'text-rose-800'
                      }`}
                  >
                    {formatCurrency(
                      netProfit
                    )}
                  </p>

                  <p className="text-[10px] text-black/40 mt-1">
                    Gross profit minus operating expenses
                  </p>
                </div>

              </div>

              <div className="bg-white border border-black/[0.08] rounded-2xl shadow-sm overflow-hidden">

                <div className="p-5 sm:p-6 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  <div>
                    <h3 className="text-sm font-bold">
                      Profit & Loss Statement
                    </h3>

                    <p className="text-[10px] text-black/40 mt-1">
                      Financial summary for{' '}
                      {dateFilter.toLowerCase()}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleExportPDF
                    }
                    className="px-3 py-2 rounded-xl bg-[#181818] hover:bg-black text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-300" />
                    Export P&L
                  </button>

                </div>

                <div className="p-5 sm:p-6">

                  <div className="space-y-1">

                    <div className="flex items-center justify-between py-4">
                      <span className="text-xs font-semibold">
                        Gross Sales Revenue
                      </span>

                      <span className="font-mono font-bold">
                        {formatCurrency(
                          totalSalesRevenue
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-4 border-t border-black/[0.06]">
                      <span className="text-xs text-black/55">
                        Less: Cost of Hardware Sold
                      </span>

                      <span className="font-mono text-rose-700">
                        -{formatCurrency(
                          estimatedCOGS
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-4 px-4 bg-amber-50 rounded-xl border border-amber-100">
                      <span className="text-xs font-bold">
                        Estimated Gross Profit
                      </span>

                      <span className="font-mono font-bold text-amber-800">
                        {formatCurrency(
                          estimatedGrossProfit
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-4 border-t border-black/[0.06]">
                      <span className="text-xs text-black/55">
                        Less: Operating Expenses
                      </span>

                      <span className="font-mono text-rose-700">
                        -{formatCurrency(
                          totalExpensesAmount
                        )}
                      </span>
                    </div>

                    <div
                      className={`mt-2 flex items-center justify-between py-5 px-4 rounded-xl border ${netProfit >= 0
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-rose-50 border-rose-200'
                        }`}
                    >
                      <span className="text-sm font-bold">
                        Estimated Net Profit
                      </span>

                      <span
                        className={`text-xl font-mono font-bold ${netProfit >= 0
                            ? 'text-emerald-800'
                            : 'text-rose-800'
                          }`}
                      >
                        {formatCurrency(
                          netProfit
                        )}
                      </span>
                    </div>

                  </div>

                  <div className="mt-5 p-4 rounded-xl bg-[#f7f6f3] border border-black/[0.05]">
                    <p className="text-[10px] text-black/45 leading-relaxed">
                      <strong className="text-black/70">
                        Note:
                      </strong>{' '}
                      Gross profit and net profit are
                      estimates because COGS uses the
                      product Cost Price where available
                      and a fallback estimate where exact
                      cost information is unavailable.
                    </p>
                  </div>

                </div>
              </div>

            </div>
          )}

        {/* =====================================================
            INVENTORY VALUATION
        ====================================================== */}

        {activeTab ===
          'VALUATION' && (
            <div className="space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>

                  <p className="mt-5 text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Stock Units
                  </p>

                  <p className="text-2xl font-bold mt-2">
                    {inventoryValuation.totalStockQty.toLocaleString()}
                  </p>

                  <p className="text-[10px] text-black/40 mt-1">
                    {products.length} catalog products
                  </p>
                </div>

                <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <div className="w-10 h-10 rounded-xl bg-black/[0.04] text-black flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>

                  <p className="mt-5 text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Inventory Cost Value
                  </p>

                  <p className="text-2xl font-bold mt-2">
                    {formatCurrency(
                      inventoryValuation.totalCostVal
                    )}
                  </p>

                  <p className="text-[10px] text-black/40 mt-1">
                    Capital currently tied in stock
                  </p>
                </div>

                <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>

                  <p className="mt-5 text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Retail Potential
                  </p>

                  <p className="text-2xl font-bold mt-2 text-amber-800">
                    {formatCurrency(
                      inventoryValuation.totalRetailVal
                    )}
                  </p>

                  <p className="text-[10px] text-emerald-700 mt-1 font-semibold">
                    Potential profit:{' '}
                    {formatCurrency(
                      inventoryValuation.potentialGrossProfit
                    )}
                  </p>
                </div>

              </div>

              <div className="bg-white border border-black/[0.08] rounded-2xl shadow-sm overflow-hidden">

                <div className="p-5 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  <div>
                    <h3 className="text-sm font-bold">
                      Inventory Valuation
                    </h3>

                    <p className="text-[10px] text-black/40 mt-1">
                      Current stock value based on quantity,
                      cost price and selling price.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleExportPDF
                    }
                    className="px-3 py-2 rounded-xl bg-[#181818] hover:bg-black text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-300" />
                    Export Valuation
                  </button>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full text-xs">

                    <thead className="bg-[#faf9f7] border-b border-black/[0.06]">
                      <tr>
                        <th className="text-left px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Product
                        </th>
                        <th className="text-center px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Stock
                        </th>
                        <th className="text-right px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Cost
                        </th>
                        <th className="text-right px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Selling
                        </th>
                        <th className="text-right px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Cost Value
                        </th>
                        <th className="text-right px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Retail Value
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-black/[0.05]">

                      {products
                        .slice()
                        .sort(
                          (a, b) =>
                            parseNumber(
                              b.Quantity
                            ) *
                            parseNumber(
                              b.SellingPrice
                            ) -
                            parseNumber(
                              a.Quantity
                            ) *
                            parseNumber(
                              a.SellingPrice
                            )
                        )
                        .map(
                          (product) => {
                            const quantity =
                              parseNumber(
                                product.Quantity
                              );

                            const cost =
                              parseNumber(
                                product.CostPrice
                              );

                            const selling =
                              parseNumber(
                                product.SellingPrice
                              );

                            return (
                              <tr
                                key={
                                  product.ProductID
                                }
                                className="hover:bg-[#faf9f7] transition-colors"
                              >
                                <td className="px-5 py-4">
                                  <p className="font-semibold">
                                    {
                                      product.ProductName
                                    }
                                  </p>

                                  <p className="text-[9px] text-black/35 font-mono mt-1">
                                    {
                                      product.SKU
                                    }
                                  </p>
                                </td>

                                <td className="px-5 py-4 text-center font-mono font-bold">
                                  {
                                    quantity
                                  }
                                </td>

                                <td className="px-5 py-4 text-right font-mono text-black/55">
                                  {formatCurrency(
                                    cost
                                  )}
                                </td>

                                <td className="px-5 py-4 text-right font-mono font-semibold">
                                  {formatCurrency(
                                    selling
                                  )}
                                </td>

                                <td className="px-5 py-4 text-right font-mono">
                                  {formatCurrency(
                                    quantity *
                                    cost
                                  )}
                                </td>

                                <td className="px-5 py-4 text-right font-mono font-bold text-amber-800">
                                  {formatCurrency(
                                    quantity *
                                    selling
                                  )}
                                </td>
                              </tr>
                            );
                          }
                        )}

                    </tbody>
                  </table>

                </div>
              </div>

            </div>
          )}

        {/* =====================================================
            SALES
        ====================================================== */}

        {activeTab ===
          'SALES' && (
            <div className="space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Collected
                  </p>

                  <p className="text-2xl font-bold mt-3 text-emerald-800">
                    {formatCurrency(
                      totalAmountPaid
                    )}
                  </p>

                  <p className="text-[10px] text-black/40 mt-1">
                    Payments received
                  </p>
                </div>

                <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Receivables
                  </p>

                  <p className="text-2xl font-bold mt-3 text-rose-700">
                    {formatCurrency(
                      totalUnpaidReceivables
                    )}
                  </p>

                  <p className="text-[10px] text-black/40 mt-1">
                    Customer balances due
                  </p>
                </div>

                <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Invoices
                  </p>

                  <p className="text-2xl font-bold mt-3">
                    {filteredSales.length}
                  </p>

                  <p className="text-[10px] text-black/40 mt-1">
                    Average order:{' '}
                    {filteredSales.length >
                      0
                      ? formatCurrency(
                        totalSalesRevenue /
                        filteredSales.length
                      )
                      : '₦0'}
                  </p>
                </div>

              </div>

              <div className="bg-white border border-black/[0.08] rounded-2xl shadow-sm overflow-hidden">

                <div className="p-5 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  <div>
                    <h3 className="text-sm font-bold">
                      Best Selling Products
                    </h3>

                    <p className="text-[10px] text-black/40 mt-1">
                      Products ranked by sales turnover
                      for the selected period.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleExportPDF
                    }
                    className="px-3 py-2 rounded-xl bg-[#181818] hover:bg-black text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-300" />
                    Export Sales
                  </button>

                </div>

                <div className="p-5">

                  {bestSellers.length ===
                    0 ? (
                    <div className="py-12 text-center text-black/35">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p className="text-xs font-semibold">
                        No sales recorded
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">

                      {bestSellers.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            key={
                              item.id
                            }
                            className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#faf9f7] border border-black/[0.05] hover:border-black/15 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">

                              <div className="w-8 h-8 rounded-lg bg-[#181818] text-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {index +
                                  1}
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">
                                  {
                                    item.name
                                  }
                                </p>

                                <p className="text-[10px] text-black/40 mt-1">
                                  {
                                    item.qty
                                  }{' '}
                                  units sold
                                </p>
                              </div>

                            </div>

                            <p className="font-mono text-sm font-bold whitespace-nowrap">
                              {formatCurrency(
                                item.revenue
                              )}
                            </p>
                          </div>
                        )
                      )}

                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

        {/* =====================================================
            EXPENSES
        ====================================================== */}

        {activeTab ===
          'EXPENSES' && (
            <div className="space-y-5">

              {/* Expense summary */}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>

                    <ArrowDownRight className="w-4 h-4 text-rose-500" />
                  </div>

                  <p className="mt-5 text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Total Expenses
                  </p>

                  <p className="text-2xl font-bold mt-2 text-rose-700">
                    {formatCurrency(
                      totalExpensesAmount
                    )}
                  </p>

                  <p className="text-[10px] text-black/40 mt-1">
                    Actual recorded expenses
                  </p>
                </div>

                <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <Receipt className="w-5 h-5" />
                    </div>
                  </div>

                  <p className="mt-5 text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Expense Records
                  </p>

                  <p className="text-2xl font-bold mt-2">
                    {
                      filteredExpenses.length
                    }
                  </p>

                  <p className="text-[10px] text-black/40 mt-1">
                    Entries in selected period
                  </p>
                </div>

                <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <PieChart className="w-5 h-5" />
                    </div>
                  </div>

                  <p className="mt-5 text-[9px] uppercase tracking-wider font-bold text-black/40">
                    Largest Category
                  </p>

                  <p className="text-base font-bold mt-3 truncate">
                    {expenseByCategory[0]?.[0] ||
                      'No expenses'}
                  </p>

                  <p className="text-[10px] text-black/40 mt-1">
                    {formatCurrency(
                      expenseByCategory[0]?.[1] ||
                      0
                    )}
                  </p>
                </div>

              </div>

              {/* Expense categories */}

              <div className="bg-white border border-black/[0.08] rounded-2xl shadow-sm overflow-hidden">

                <div className="p-5 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  <div>
                    <h3 className="text-sm font-bold">
                      Expenses by Category
                    </h3>

                    <p className="text-[10px] text-black/40 mt-1">
                      Operational costs, utilities,
                      logistics and other overhead.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleExportPDF
                    }
                    className="px-3 py-2 rounded-xl bg-[#181818] hover:bg-black text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-300" />
                    Export Expenses
                  </button>

                </div>

                <div className="p-5 sm:p-6">

                  {expenseByCategory.length ===
                    0 ? (
                    <div className="py-12 text-center text-black/35">
                      <Wallet className="w-8 h-8 mx-auto mb-3 opacity-30" />

                      <p className="text-xs font-semibold">
                        No expenses found
                      </p>

                      <p className="text-[10px] mt-1">
                        Try changing the reporting period.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">

                      {expenseByCategory.map(
                        (
                          [
                            category,
                            amount,
                          ],
                          index
                        ) => {
                          const percentage =
                            totalExpensesAmount >
                              0
                              ? (amount /
                                totalExpensesAmount) *
                              100
                              : 0;

                          return (
                            <div
                              key={
                                category
                              }
                            >

                              <div className="flex items-center justify-between gap-4 mb-2">

                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-[#f7f6f3] border border-black/[0.06] flex items-center justify-center text-[9px] font-bold shrink-0">
                                    {index +
                                      1}
                                  </span>

                                  <span className="text-xs font-semibold truncate">
                                    {
                                      category
                                    }
                                  </span>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="font-mono text-xs font-bold">
                                    {formatCurrency(
                                      amount
                                    )}
                                  </span>

                                  <span className="ml-2 text-[9px] text-black/35">
                                    {percentage.toFixed(
                                      1
                                    )}
                                    %
                                  </span>
                                </div>

                              </div>

                              <div className="w-full h-2 bg-[#f0eee9] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-600 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      percentage
                                    )}%`,
                                  }}
                                />
                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>
                  )}

                </div>
              </div>

              {/* Expense ledger */}

              <div className="bg-white border border-black/[0.08] rounded-2xl shadow-sm overflow-hidden">

                <div className="p-5 border-b border-black/[0.06]">

                  <div>
                    <h3 className="text-sm font-bold">
                      Expense Ledger
                    </h3>

                    <p className="text-[10px] text-black/40 mt-1">
                      Exact expense records used in the
                      report calculation.
                    </p>
                  </div>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full text-xs">

                    <thead className="bg-[#faf9f7] border-b border-black/[0.06]">

                      <tr>

                        <th className="text-left px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Date
                        </th>

                        <th className="text-left px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Category
                        </th>

                        <th className="text-left px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Description
                        </th>

                        <th className="text-left px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Method
                        </th>

                        <th className="text-right px-5 py-3 text-[9px] uppercase tracking-wider text-black/40">
                          Amount
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-black/[0.05]">

                      {filteredExpenses.length ===
                        0 ? (
                        <tr>
                          <td
                            colSpan={
                              5
                            }
                            className="py-12 text-center text-black/35"
                          >
                            No expenses in this period.
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses
                          .slice()
                          .sort(
                            (
                              a,
                              b
                            ) =>
                              new Date(
                                getExpenseDate(
                                  b
                                )
                              ).getTime() -
                              new Date(
                                getExpenseDate(
                                  a
                                )
                              ).getTime()
                          )
                          .map(
                            (
                              expense
                            ) => {
                              const amount =
                                getExpenseAmount(
                                  expense
                                );

                              return (
                                <tr
                                  key={
                                    getExpenseId(
                                      expense
                                    ) ||
                                    `${getExpenseDate(
                                      expense
                                    )}-${amount}`
                                  }
                                  className="hover:bg-[#faf9f7] transition-colors"
                                >

                                  <td className="px-5 py-3 whitespace-nowrap text-black/55 font-mono text-[10px]">
                                    {formatDate(
                                      getExpenseDate(
                                        expense
                                      )
                                    )}
                                  </td>

                                  <td className="px-5 py-3">
                                    <span className="inline-flex px-2 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-[9px] font-semibold">
                                      {getExpenseCategory(
                                        expense
                                      )}
                                    </span>
                                  </td>

                                  <td className="px-5 py-3 max-w-xs">
                                    <p className="truncate font-medium">
                                      {getExpenseDescription(
                                        expense
                                      ) ||
                                        'Operational disbursement'}
                                    </p>

                                    {getExpenseReference(
                                      expense
                                    ) && (
                                        <p className="text-[9px] text-black/35 mt-1 font-mono">
                                          Ref:{' '}
                                          {getExpenseReference(
                                            expense
                                          )}
                                        </p>
                                      )}
                                  </td>

                                  <td className="px-5 py-3 text-black/50">
                                    {getExpensePaymentMethod(
                                      expense
                                    )}
                                  </td>

                                  <td className="px-5 py-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                                    -{formatCurrency(
                                      amount
                                    )}
                                  </td>

                                </tr>
                              );
                            }
                          )
                      )}

                    </tbody>

                  </table>

                </div>
              </div>

            </div>
          )}

      </div>
    </div>
  );
};