import React, { useState, useMemo } from 'react';
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
  Calendar,
  Filter,
  DollarSign,
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
  String(expense?.expenseId ?? expense?.ExpenseID ?? "").trim();

const getExpenseCategory = (expense: ExpenseLike): string =>
  String(expense?.expenseCategory ?? expense?.ExpenseCategory ?? expense?.Category ?? "").trim();

const getExpenseDescription = (expense: ExpenseLike): string =>
  String(expense?.description ?? expense?.Description ?? "").trim();

const getExpenseAmount = (expense: ExpenseLike): number =>
  parseNumber(expense?.amount ?? expense?.Amount ?? 0);

const getExpenseDate = (expense: ExpenseLike): string =>
  String(
    expense?.expenseDate ??
    expense?.ExpenseDate ??
    expense?.createdAt ??
    expense?.CreatedAt ??
    ""
  );

const getPaymentMethod = (expense: ExpenseLike): string =>
  String(expense?.paymentMethod ?? expense?.PaymentMethod ?? "Cash").trim() || "Cash";

const getReceipt = (expense: ExpenseLike): string =>
  String(expense?.receipt ?? expense?.Reference ?? "").trim();

const getRecordedBy = (expense: ExpenseLike): string =>
  String(expense?.recordedBy ?? expense?.RecordedBy ?? "Admin").trim() || "Admin";

export const ExpensesView: React.FC = () => {
  const { expenses, currentUser, refreshExpenses, refreshDashboard, addToast, loading } = useInventory();
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

    const category = String(formData.Category ?? "").trim();
    const amountVal = Number.parseFloat(String(formData.Amount ?? "").trim());

    if (!category) {
      addToast("warning", "Please select an expense category.");
      return;
    }

    if (!Number.isFinite(amountVal) || amountVal <= 0) {
      addToast("warning", "Please enter a valid expense amount greater than zero.");
      return;
    }

    setIsSubmitting(true);

    try {
      // PostgreSQL / Prisma field names are lower camelCase.
      // Do not send the old Google Sheets PascalCase payload.
      const payload = {
        expenseCategory: category,
        description: formData.Description.trim() || undefined,
        amount: amountVal,
        paymentMethod: String(formData.PaymentMethod || "Cash").trim() || "Cash",
        expenseDate: formData.ExpenseDate
          ? new Date(`${formData.ExpenseDate}T00:00:00`).toISOString()
          : undefined,
        recordedBy: String(
          (currentUser as any)?.FullName ??
          (currentUser as any)?.fullName ??
          "Admin Staff"
        ).trim() || "Admin Staff",
        receipt: formData.Reference.trim() || undefined,
        notes: undefined,
      };

      const res = await inventoryApi.createExpense(payload);

      if (res.success) {
        addToast("success", `Expense of ${formatCurrency(amountVal)} recorded.`);
        setIsModalOpen(false);
        await Promise.all([refreshExpenses(), refreshDashboard()]);
      } else {
        addToast("error", res.message || "Failed to record expense.");
      }
    } catch (error) {
      console.error("Create expense error:", error);
      addToast(
        "error",
        error instanceof Error ? error.message : "Failed to record expense."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;

    const expenseId = getExpenseId(deletingExpense as ExpenseLike);
    if (!expenseId) {
      addToast("error", "Expense ID is missing. The record cannot be deleted.");
      setDeletingExpense(null);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await inventoryApi.deleteExpense(expenseId);

      if (res.success) {
        addToast("success", "Expense record removed.");
        setDeletingExpense(null);
        await Promise.all([refreshExpenses(), refreshDashboard()]);
      } else {
        addToast("error", res.message || "Failed to delete expense.");
      }
    } catch (error) {
      console.error("Delete expense error:", error);
      addToast(
        "error",
        error instanceof Error ? error.message : "Failed to delete expense."
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
        selectedCategory === "ALL" || category === selectedCategory;

      const matchSearch =
        !q ||
        description.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q) ||
        reference.toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [expenses, selectedCategory, search]);

  const totalExpenseSum = useMemo(() => {
    return filteredExpenses.reduce(
      (sum, rawExpense) => sum + getExpenseAmount(rawExpense as ExpenseLike),
      0
    );
  }, [filteredExpenses]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#1a1a1a] tracking-tight">Operating Expenses</h2>
          <p className="text-xs text-black/60 font-light mt-1">
            Track daily workshop costs (fuel, generator diesel, NEPA, internet, staff stipends).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshExpenses()}
            disabled={loading.expenses}
            className="p-2.5 rounded-sm border border-black/15 bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] shadow-xs transition-colors"
            title="Refresh"
          >
            <RotateCw className={`w-4 h-4 ${loading.expenses ? 'animate-spin text-black' : ''}`} />
          </button>
          <button
            id="btn-add-expense"
            onClick={openAdd}
            className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] text-[10px] uppercase tracking-wider font-semibold rounded-sm shadow-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Card */}
      <div className="p-6 bg-[#1a1a1a] text-[#fcfaf7] rounded-sm border border-black/10 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Total Filtered Operational Outflow
          </span>
          <h3 className="text-3xl font-serif font-bold mt-1 text-[#fcfaf7]">{formatCurrency(totalExpenseSum)}</h3>
          <p className="text-xs text-white/60 font-light mt-0.5">
            {filteredExpenses.length} records matching current filter
          </p>
        </div>
        <div className="w-12 h-12 rounded-sm bg-white/10 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-white/80" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-sm border border-black/10 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses by description, reference, or category..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full py-2 px-3 text-xs bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
          >
            <option value="ALL">All Cost Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-sm border border-black/10 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fcfaf7] border-b border-black/10 text-black/60 font-semibold uppercase tracking-[0.15em] text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-black/80">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-black/40 font-light">
                    <Wallet className="w-8 h-8 text-black/20 mx-auto mb-2" />
                    <p className="font-semibold text-black/60">No expenses found</p>
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
                    <tr key={expenseId || `${category}-${expenseDate}-${amount}`} className="hover:bg-[#fcfaf7]/70 transition-colors">
                      <td className="py-3 px-4 text-black/60 font-light whitespace-nowrap">{formatDate(expenseDate)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-sm font-semibold text-[9px] uppercase tracking-wider bg-[#f4f0ea] text-black/80 border border-black/10">
                          {category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-serif font-bold text-rose-800 whitespace-nowrap text-right">
                        -{formatCurrency(amount)}
                      </td>
                      <td className="py-3 px-4 text-[#1a1a1a] font-medium max-w-sm truncate">
                        {description || '—'}
                      </td>
                      <td className="py-3 px-4 text-black/70">{paymentMethod}</td>
                      <td className="py-3 px-4 font-mono text-black/50 text-[11px]">{reference || '—'}</td>
                      <td className="py-3 px-4 text-black/60 font-light">{recordedBy}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeletingExpense(exp)}
                          className="p-1.5 text-black/40 hover:text-rose-700 rounded-sm hover:bg-black/5 transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-sm shadow-2xl border border-black/20 overflow-hidden">
            <div className="p-5 border-b border-black/10 bg-[#fcfaf7] flex items-center justify-between">
              <h3 className="text-sm font-serif font-bold text-[#1a1a1a]">Record Operational Expense</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-black/40 hover:text-black p-1 rounded-sm hover:bg-black/5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.ExpenseDate}
                    onChange={(e) => setFormData({ ...formData, ExpenseDate: e.target.value })}
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Amount (₦) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.Amount}
                    onChange={(e) => setFormData({ ...formData, Amount: e.target.value })}
                    placeholder="15000"
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono font-bold text-[#1a1a1a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Expense Category *</label>
                <select
                  required
                  value={formData.Category}
                  onChange={(e) => setFormData({ ...formData, Category: e.target.value })}
                  className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Description / Memo</label>
                <textarea
                  rows={2}
                  value={formData.Description}
                  onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                  placeholder="e.g. Purchased 20 Litres diesel for shop generator during power outage..."
                  className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Payment Method</label>
                  <select
                    value={formData.PaymentMethod}
                    onChange={(e) => setFormData({ ...formData, PaymentMethod: e.target.value })}
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="POS">POS</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-black/60 uppercase tracking-[0.15em] mb-1">Receipt / Voucher #</label>
                  <input
                    type="text"
                    value={formData.Reference}
                    onChange={(e) => setFormData({ ...formData, Reference: e.target.value })}
                    placeholder="REC-00124"
                    className="w-full p-2.5 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black font-mono text-[#1a1a1a]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-black/70 bg-[#f4f0ea] hover:bg-black/10 rounded-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#1a1a1a] hover:bg-black text-[#fcfaf7] rounded-sm text-[10px] uppercase tracking-wider font-semibold shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Recording...' : 'Record Outflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deletingExpense}
        title="Delete Expense Record"
        message={`Are you sure you want to delete this ${getExpenseCategory(deletingExpense as ExpenseLike)} expense of ${formatCurrency(getExpenseAmount(deletingExpense as ExpenseLike))}?`}
        confirmText="Delete Record"
        isLoading={isSubmitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingExpense(null)}
      />
    </div>
  );
};
