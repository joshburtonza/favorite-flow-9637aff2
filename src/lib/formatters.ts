import { format, parseISO, isValid } from 'date-fns';

export type CurrencyCode = 'USD' | 'EUR' | 'ZAR';

const currencySymbols: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  ZAR: 'R',
};

const currencyLocales: Record<CurrencyCode, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  ZAR: 'en-ZA',
};

export function formatCurrency(
  amount: number | null | undefined,
  currency: CurrencyCode = 'ZAR',
  options?: { showSymbol?: boolean; compact?: boolean }
): string {
  if (amount === null || amount === undefined) return '-';
  
  const { showSymbol = true, compact = false } = options || {};
  
  const formatter = new Intl.NumberFormat(currencyLocales[currency], {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    notation: compact ? 'compact' : 'standard',
  });
  
  return formatter.format(amount);
}

export function formatNumber(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined) return '-';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '-';
  return formatNumber(rate, 4);
}

export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 1
): string {
  if (value === null || value === undefined) return '-';
  return `${formatNumber(value, decimals)}%`;
}

export function formatDate(
  date: string | Date | null | undefined,
  formatStr: string = 'dd MMM yyyy'
): string {
  if (!date) return '-';
  
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) return '-';
    return format(parsedDate, formatStr);
  } catch {
    return '-';
  }
}

export function formatDateShort(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd MMM');
}

export function formatDateFull(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd MMMM yyyy');
}

export function getCurrencySymbol(currency: CurrencyCode): string {
  return currencySymbols[currency];
}

export function getProfitClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return 'profit-neutral';
  return value > 0 ? 'profit-positive' : 'profit-negative';
}