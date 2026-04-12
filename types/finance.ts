export type ThemePreference = 'system' | 'light' | 'dark';

export type TransactionType = 'income' | 'expense';

export type CategoryKind = 'expense' | 'income' | 'system';

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
