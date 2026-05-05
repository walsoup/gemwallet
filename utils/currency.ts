import { useSettingsStore } from '../store/useSettingsStore';
import type { CurrencyCode, RegionCode } from '../types/finance';
import { formatCurrency } from './formatCurrency';

export const SUPPORTED_CURRENCIES: ReadonlyArray<{
  code: CurrencyCode;
  label: string;
  locales: string[];
}> = [
  { code: 'USD', label: 'US Dollar', locales: ['en-US'] },
  { code: 'EUR', label: 'Euro', locales: ['fr-FR', 'de-DE', 'en-IE'] },
  { code: 'GBP', label: 'British Pound', locales: ['en-GB'] },
  { code: 'MAD', label: 'Moroccan Dirham', locales: ['fr-MA', 'ar-MA'] },
  { code: 'JPY', label: 'Japanese Yen', locales: ['ja-JP'] },
  { code: 'CNY', label: 'Chinese Yuan', locales: ['zh-CN'] },
  { code: 'INR', label: 'Indian Rupee', locales: ['en-IN', 'hi-IN'] },
  { code: 'CAD', label: 'Canadian Dollar', locales: ['en-CA', 'fr-CA'] },
  { code: 'AUD', label: 'Australian Dollar', locales: ['en-AU'] },
  { code: 'CHF', label: 'Swiss Franc', locales: ['de-CH', 'fr-CH', 'it-CH'] },
  { code: 'BRL', label: 'Brazilian Real', locales: ['pt-BR'] },
  { code: 'MXN', label: 'Mexican Peso', locales: ['es-MX'] },
  { code: 'KRW', label: 'South Korean Won', locales: ['ko-KR'] },
  { code: 'SGD', label: 'Singapore Dollar', locales: ['en-SG'] },
  { code: 'AED', label: 'UAE Dirham', locales: ['ar-AE', 'en-AE'] },
  { code: 'SAR', label: 'Saudi Riyal', locales: ['ar-SA'] },
  { code: 'ZAR', label: 'South African Rand', locales: ['en-ZA'] },
  { code: 'TRY', label: 'Turkish Lira', locales: ['tr-TR'] },
  { code: 'SEK', label: 'Swedish Krona', locales: ['sv-SE'] },
  { code: 'NOK', label: 'Norwegian Krone', locales: ['nb-NO'] },
];

export function getLocaleForRegion(region: RegionCode, fallback: string) {
  switch (region) {
    case 'US':
      return 'en-US';
    case 'EU':
      return 'fr-FR';
    case 'UK':
      return 'en-GB';
    case 'JP':
      return 'ja-JP';
    case 'AU':
      return 'en-AU';
    case 'CA':
      return 'en-CA';
    case 'MA':
      return 'fr-MA';
    default:
      return fallback;
  }
}

export function getEffectiveLocale(params: {
  currencyCode: CurrencyCode;
  region: RegionCode;
  language: string;
}) {
  const regionLocale = getLocaleForRegion(params.region, params.language);
  const currency = SUPPORTED_CURRENCIES.find((item) => item.code === params.currencyCode);
  const currencyLocale = currency?.locales.find((locale) => locale.startsWith(params.language.slice(0, 2)));
  return currencyLocale ?? regionLocale ?? params.language;
}

export function formatAppCurrency(amountCents: number) {
  const { currencyCode, language, region } = useSettingsStore.getState();
  const locale = getEffectiveLocale({ currencyCode, language, region });
  return formatCurrency(amountCents, { currencyCode, locale });
}

