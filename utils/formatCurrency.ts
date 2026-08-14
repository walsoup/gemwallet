const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY', 'KRW', 'VND', 'CLP', 'PYG', 'UGX', 'BIF', 'DJF', 'GNF', 'KMF', 'RWF', 'VUV', 'XAF', 'XOF', 'XPF'
]);

type CurrencyFormatterOptions = {
  currencyCode: string;
  locale?: string;
};

export function formatCurrency(amountCents: number, { currencyCode, locale }: CurrencyFormatterOptions) {
  const code = (currencyCode || 'USD').toUpperCase();
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(code);
  const amount = amountCents / 100;

  try {
    return new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(amount);
  } catch {
    return isZeroDecimal ? `${code} ${Math.round(amount)}` : `${code} ${amount.toFixed(2)}`;
  }
}

