type CurrencyFormatterOptions = {
  currencyCode: string;
  locale?: string;
};

export function formatCurrency(amountCents: number, { currencyCode, locale }: CurrencyFormatterOptions) {
  const amount = amountCents / 100;

  try {
    return new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.warn('Currency formatting fell back to simple formatter', error);
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}
