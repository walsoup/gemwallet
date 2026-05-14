export type DbCategoryKind = 'expense' | 'income' | 'system';
export type DbTransactionType = 'expense' | 'income';

export type DbUserRow = {
  id: string;
  createdAt: number;
  updatedAt: number;
};

export type DbCategoryRow = {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  kind: DbCategoryKind;
  isLocked: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DbTransactionRow = {
  id: string;
  userId: string;
  categoryId: string;
  type: DbTransactionType;
  amountCents: number;
  note?: string;
  timestamp: number;
  isVoided: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DbWalletMetaRow = {
  userId: string;
  hasCompletedOnboarding: boolean;
  voiceAssistantEnabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DbSyncMetaRow = {
  id: string;
  entityType: 'transaction' | 'category' | 'wallet_meta';
  entityId: string;
  revision: number;
  syncedAt?: number;
};
