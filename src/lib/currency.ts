import type { Currency } from '@/types/db';

const symbols: Record<Currency, string> = {
  VES: 'REF.',
  USD: '$',
  EUR: '€',
};

// Base unit is USD. Venezuela uses "REF." (referencial) where REF. 23 means $23.
const rates: Record<Currency, number> = {
  VES: 1,
  USD: 1,
  EUR: 0.92,
};

export function formatPrice(amountUSD: number, currency: Currency): string {
  const converted = amountUSD * rates[currency];
  const value = converted.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency === 'VES') {
    return `REF. ${value}`;
  }
  return `${symbols[currency]} ${value}`;
}

export function discountedPrice(price: number, discountPct: number): number {
  return price * (1 - discountPct / 100);
}
