export type ThemePreference = 'system' | 'light' | 'dark';

export type TransactionType = 'income' | 'expense';

export type CategoryKind = 'expense' | 'income' | 'system';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'MAD';

export type LanguageCode = 'en-US' | 'en-GB' | 'fr-FR' | 'de-DE' | 'ja-JP';

export type RegionCode = 'US' | 'EU' | 'UK' | 'JP' | 'AU' | 'CA' | 'MA';

export type Goal = {
  id: string;
  name: string;
  targetCents: number;
  savedCents: number;
  dueDate?: number;
  createdAt: number;
  completed: boolean;
  enabled: boolean;
};

export type RecurringInterval = 'weekly' | 'monthly';

export type RecurringCashEvent = {
  id: string;
  name: string;
  amountCents: number;
  type: TransactionType;
  categoryId: string;
  interval: RecurringInterval;
  nextRun: number;
  enabled: boolean;
};

export type TransactionCategory =
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Bills'
  | 'Entertainment'
  | 'Subscriptions';

export type Category = {
  id: string;
  name: string;
  emoji: string;
  kind: CategoryKind;
  tint?: string;
  isLocked?: boolean;
};

export type Transaction = {
  id: string;
  amountCents: number;
  type: TransactionType;
  timestamp: number;
  categoryId: string;
  note?: string;
  isVoid?: boolean;
};

export type WalletMeta = {
  hasCompletedOnboarding: boolean;
  voiceAssistantEnabled: boolean;
};
