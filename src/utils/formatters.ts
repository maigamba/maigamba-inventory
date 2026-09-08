/**
 * Currency, date, and number formatting utilities
 * Tailored for Maigamba Computer Technology (Nigeria / NGN)
 */

export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '₦0.00';
  
  // Clean up any string that might have commas or currency symbols
  const num = typeof amount === 'number' 
    ? amount 
    : parseFloat(String(amount).replace(/[^0-9.-]+/g, ''));

  if (isNaN(num)) return '₦0.00';

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function parseNumber(val: number | string | undefined | null, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(dateString);
  }
}

export function formatShortDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateString);
  }
}

export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${timestamp}-${rand}`;
}
