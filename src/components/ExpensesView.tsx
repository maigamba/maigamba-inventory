import React, { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Expense } from '../types/inventory';
import { inventoryApi } from '../services/api';
import { formatCurrency, formatDate, parseNumber } from '../utils/formatters';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Wallet,
  Plus,
  Search,
  RotateCw,
  X,
  Trash2,
  CalendarDays,
  Filter,
  ArrowUpRight,
  Receipt,
  CreditCard,
  TrendingDown,
  BarChart3,
  ChevronDown,
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Electricity / NEPA',
  'Generator Fuel / Diesel',
  'Internet / Data',
  'Salaries / Wages',
  'Transport / Logistics',
  'Repair Tools & Consumables',
  'Office Supplies & Stationeries',
  'Shop Rent & Rates',
  'Marketing & Advertising',
  'Equipment Maintenance',
  'Security & Sanitation',
  'Miscellaneous / Other',
];

type ExpenseLike = (Expense & Record<string, any>) | null | undefined;

const getExpenseId = (expense: ExpenseLike): string =>
  String(expense?.expenseId ?? expense?.ExpenseID ?? '').trim();

const getExpenseCategory = (expense: ExpenseLike): string =>
  String(
    expense?.expenseCategory ??
    expense?.ExpenseCategory ??
    expense?.Category ??
    ''
  ).trim();

const getExpenseDescription = (expense: ExpenseLike): string =>
  String(expense?.description ?? expense?.Description ?? '').trim();

const getExpenseAmount = (expense: ExpenseLike): number =>
  parseNumber(expense?.amount ?? expense?.Amount ?? 0);

const getExpenseDate = (expense: ExpenseLike): string =>
  String(
    expense?.expenseDate ??
    expense?.ExpenseDate ??
    expense?.createdAt ??
    expense?.CreatedAt ??
    ''
  );

const getPaymentMethod = (expense: ExpenseLike): string =>
  String(
    expense?.paymentMethod ?? expense?.PaymentMethod ?? 'Cash'
  ).trim() || 'Cash';

const getReceipt = (expense: ExpenseLike): string =>
  String(expense?.receipt ?? expense?.Reference ?? '').trim();

const getRecordedBy = (expense: ExpenseLike): string =>
  String(
    expense?.recordedBy ?? expense?.RecordedBy ?? 'Admin'
  ).trim() || 'Admin';

const methodIcon = (method: string) => {
  if (method === 'Bank Transfer') return <CreditCard className="w-3.5 h-3.5" />;
  if (method === 'POS') return <Receipt className="w-3.5 h-3.5" />;
  return <Wallet className="w-3.5 h-3.5" />;
};

export const ExpensesView: React.FC = () => {
  const {
    expenses,
    currentUser,
    refreshExpenses,
    refreshDashboard,
    addToast,
    loading,
  } = useInventory();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    ExpenseDate: new Date().toISOString().slice(0, 10),
    Category: EXPENSE_CATEGORIES[0],
    Amount: '',
    Description: '',
    PaymentMethod: 'Cash',
    Reference: '',
  });

  const openAdd = () => {
    setFormData({
      ExpenseDate: new Date().toISOString().slice(0, 10),
      Category: EXPENSE_CATEGORIES[0],
      Amount: '',
      Description: '',
      PaymentMethod: 'Cash',
      Reference: '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const category = String(formData.Category ?? '').trim();
    const amountVal = Number.parseFloat(String(formData.Amount ?? '').trim());

    if (!category) {
      addToast('warning', 'Please select an expense category.');
      return;
    }

    if (!Number.isFinite(amountVal) || amountVal <= 0) {
      addToast('warning', 'Please enter a valid expense amount greater than zero.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        expenseCategory: category,
        description: formData.Description.trim() || undefined,
        amount: amountVal,
        paymentMethod: String(formData.PaymentMethod || 'Cash').trim() || 'Cash',
        expenseDate: formData.ExpenseDate
          ? new Date(`${formData.ExpenseDate}T00:00:00`).toISOString()
          : undefined,
        recordedBy: String(
          (currentUser as any)?.FullName ??
          (currentUser as any)?.fullName ??
          'Admin Staff'
        ).trim() || 'Admin Staff',
        receipt: formData.Reference.trim() || undefined,
        notes: undefined,
      };

      const res = await inventoryApi.createExpense(payload);

      if (res.success) {
        addToast('success', `Expense of ${formatCurrency(amountVal)} recorded.`);
        setIsModalOpen(false);
        await Promise.all([refreshExpenses(), refreshDashboard()]);
      } else {
        addToast('error', res.message || 'Failed to record expense.');
      }
    } catch (error) {
      console.error('Create expense error:', error);
      addToast(
        'error',
        error instanceof Error ? error.message : 'Failed to record expense.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;

    const expenseId = getExpenseId(deletingExpense as ExpenseLike);

    if (!expenseId) {
      addToast('error', 'Expense ID is missing. The record cannot be deleted.');
      setDeletingExpense(null);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await inventoryApi.deleteExpense(expenseId);

      if (res.success) {
        addToast('success', 'Expense record removed.');
        setDeletingExpense(null);
        await Promise.all([refreshExpenses(), refreshDashboard()]);
      } else {
        addToast('error', res.message || 'Failed to delete expense.');
      }
    } catch (error) {
      console.error('Delete expense error:', error);
      addToast(
        'error',
        error instanceof Error ? error.message : 'Failed to delete expense.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();

    return expenses.filter((rawExpense) => {
      const e = rawExpense as ExpenseLike;
      const category = getExpenseCategory(e);
      const description = getExpenseDescription(e);
      const reference = getReceipt(e);

      const matchCat =
        selectedCategory === 'ALL' || category === selectedCategory;

      const matchSearch =
        !q ||
        description.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q) ||
        reference.toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [expenses, selectedCategory, search]);

  const totalExpenseSum = useMemo(
    () =>
      filteredExpenses.reduce(
        (sum, expense) =>
          sum + getExpenseAmount(expense as ExpenseLike),
        0
      ),
    [filteredExpenses]
  );

  const averageExpense = filteredExpenses.length
    ? totalExpenseSum / filteredExpenses.length
    : 0;

  const categoryCount = new Set(
    filteredExpenses.map((expense) =>
      getExpenseCategory(expense as ExpenseLike)
    )
  ).size;

  return (
    <div className="min-h-full bg-[#f7f7f5] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-black/40">
              <Wallet className="h-3.5 w-3.5" />
              Finance / Operating Costs
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-[#171717]">
              Expenses
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-black/50">
              Monitor operational spending, payment methods and daily business
              outflow from one place.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshExpenses()}
              disabled={loading.expenses}
              className="group inline-flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-semibold text-black/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              title="Refresh expenses"
            >
              <RotateCw
                className={`h-4 w-4 transition-transform ${loading.expenses ? 'animate-spin' : 'group-hover:rotate-90'
                  }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              id="btn-add-expense"
              onClick={openAdd}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#171717] px-5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-black hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Record Expense
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="group rounded-2xl border border-black/5 bg-[#171717] p-5 text-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <TrendingDown className="h-5 w-5 text-white/80" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Total Outflow
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {formatCurrency(totalExpenseSum)}
            </p>
            <p className="mt-1 text-xs text-white/40">
              Current search & category view
            </p>
          </div>

          <div className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Receipt className="h-5 w-5" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
              Expense Records
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#171717]">
              {filteredExpenses.length}
            </p>
            <p className="mt-1 text-xs text-black/40">Matching records</p>
          </div>

          <div className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <BarChart3 className="h-5 w-5" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
              Average Expense
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#171717]">
              {formatCurrency(averageExpense)}
            </p>
            <p className="mt-1 text-xs text-black/40">Per recorded expense</p>
          </div>

          <div className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Filter className="h-5 w-5" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
              Active Categories
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#171717]">
              {categoryCount}
            </p>
            <p className="mt-1 text-xs text-black/40">
              Categories represented in view
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, reference or category..."
                className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] pl-11 pr-4 text-sm text-[#171717] outline-none transition-all placeholder:text-black/35 focus:border-black/25 focus:bg-white focus:ring-4 focus:ring-black/5"
              />
            </div>

            <div className="relative w-full xl:w-72">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-black/10 bg-[#f8f8f6] pl-11 pr-10 text-sm text-[#171717] outline-none transition-all focus:border-black/25 focus:bg-white focus:ring-4 focus:ring-black/5"
              >
                <option value="ALL">All expense categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            </div>

            {(search || selectedCategory !== 'ALL') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('ALL');
                }}
                className="h-11 rounded-xl border border-black/10 bg-white px-4 text-xs font-semibold text-black/60 transition hover:bg-[#f7f7f5] hover:text-black"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-black/40">
            <CalendarDays className="h-3.5 w-3.5" />
            Showing {filteredExpenses.length} of {expenses.length} expense
            records
          </div>
        </div>

        {/* Expense table */}
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-black/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#171717]">
                Expense Ledger
              </h3>
              <p className="mt-0.5 text-xs text-black/40">
                Complete record of operating expenses
              </p>
            </div>
            <div className="rounded-lg bg-[#f7f7f5] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black/50">
              {formatCurrency(totalExpenseSum)} total
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="border-b border-black/5 bg-[#fafaf8]">
                <tr className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Payment</th>
                  <th className="px-5 py-3.5">Reference</th>
                  <th className="px-5 py-3.5">Recorded By</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-20 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7f7f5]">
                        <Wallet className="h-6 w-6 text-black/20" />
                      </div>
                      <p className="mt-4 text-sm font-bold text-black/60">
                        No expenses found
                      </p>
                      <p className="mt-1 text-xs text-black/35">
                        Try changing your search or category filter.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const expense = exp as ExpenseLike;
                    const expenseId = getExpenseId(expense);
                    const category = getExpenseCategory(expense);
                    const description = getExpenseDescription(expense);
                    const amount = getExpenseAmount(expense);
                    const expenseDate = getExpenseDate(expense);
                    const paymentMethod = getPaymentMethod(expense);
                    const reference = getReceipt(expense);
                    const recordedBy = getRecordedBy(expense);

                    return (
                      <tr
                        key={
                          expenseId ||
                          `${category}-${expenseDate}-${amount}`
                        }
                        className="group transition-colors hover:bg-[#fafaf8]"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f4f4f1] text-black/45">
                              <CalendarDays className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-medium text-black/65">
                              {formatDate(expenseDate)}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex max-w-[210px] rounded-lg border border-black/5 bg-[#f5f5f2] px-2.5 py-1.5 text-[10px] font-bold leading-4 text-black/65">
                            {category || 'Miscellaneous / Other'}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <span className="text-sm font-bold text-rose-700">
                            -{formatCurrency(amount)}
                          </span>
                        </td>

                        <td className="max-w-[280px] px-5 py-4">
                          <p
                            className="truncate text-xs font-semibold text-black/75"
                            title={description || 'No description'}
                          >
                            {description || 'No description'}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700">
                            {methodIcon(paymentMethod)}
                            {paymentMethod}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-[10px] text-black/45">
                            {reference || '—'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-xs text-black/55">
                            {recordedBy}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setDeletingExpense(exp)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-black/30 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-700"
                            title="Delete expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Expense Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">
                    <Wallet className="h-3.5 w-3.5" />
                    Finance
                  </div>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-[#171717]">
                    Record Expense
                  </h3>
                  <p className="mt-1 text-xs text-black/40">
                    Add a new operating cost to the ledger.
                  </p>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6f6f3] text-black/45 transition hover:bg-black/5 hover:text-black"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black/45">
                      Date *
                    </label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
                      <input
                        type="date"
                        required
                        value={formData.ExpenseDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ExpenseDate: e.target.value,
                          })
                        }
                        className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] pl-10 pr-3 text-sm outline-none transition focus:border-black/25 focus:bg-white focus:ring-4 focus:ring-black/5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black/45">
                      Amount (₦) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.Amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          Amount: e.target.value,
                        })
                      }
                      placeholder="15,000"
                      className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] px-3 text-sm font-bold outline-none transition focus:border-black/25 focus:bg-white focus:ring-4 focus:ring-black/5"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black/45">
                    Expense Category *
                  </label>
                  <select
                    required
                    value={formData.Category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        Category: e.target.value,
                      })
                    }
                    className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] px-3 text-sm outline-none transition focus:border-black/25 focus:bg-white focus:ring-4 focus:ring-black/5"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black/45">
                    Description / Memo
                  </label>
                  <textarea
                    rows={3}
                    value={formData.Description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        Description: e.target.value,
                      })
                    }
                    placeholder="e.g. Purchased 20 litres diesel for shop generator..."
                    className="w-full resize-none rounded-xl border border-black/10 bg-[#f8f8f6] px-3 py-3 text-sm outline-none transition focus:border-black/25 focus:bg-white focus:ring-4 focus:ring-black/5"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black/45">
                      Payment Method
                    </label>
                    <select
                      value={formData.PaymentMethod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          PaymentMethod: e.target.value,
                        })
                      }
                      className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] px-3 text-sm outline-none transition focus:border-black/25 focus:bg-white focus:ring-4 focus:ring-black/5"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="POS">POS</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black/45">
                      Receipt / Voucher #
                    </label>
                    <input
                      type="text"
                      value={formData.Reference}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          Reference: e.target.value,
                        })
                      }
                      placeholder="REC-00124"
                      className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] px-3 font-mono text-sm outline-none transition focus:border-black/25 focus:bg-white focus:ring-4 focus:ring-black/5"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-black/5 pt-5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-11 rounded-xl border border-black/10 bg-white px-5 text-xs font-semibold text-black/60 transition hover:bg-[#f7f7f5]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#171717] px-6 text-xs font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {isSubmitting ? 'Recording...' : 'Record Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={!!deletingExpense}
          title="Delete Expense Record"
          message={`Are you sure you want to delete this ${getExpenseCategory(
            deletingExpense as ExpenseLike
          )} expense of ${formatCurrency(
            getExpenseAmount(deletingExpense as ExpenseLike)
          )}?`}
          confirmText="Delete Record"
          isLoading={isSubmitting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingExpense(null)}
        />
      </div>
    </div>
  );
};
