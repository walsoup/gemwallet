import type { DbCategoryRow, DbTransactionRow, DbWalletMetaRow } from './schema';

export interface CategoryRepository {
  listExpenseCategories(userId: string): Promise<DbCategoryRow[]>;
  addExpenseCategory(userId: string, name: string, emoji: string): Promise<DbCategoryRow>;
  deleteExpenseCategory(userId: string, categoryId: string, fallbackCategoryId: string): Promise<void>;
}

export interface TransactionRepository {
  listTransactions(userId: string): Promise<DbTransactionRow[]>;
  addExpense(input: Omit<DbTransactionRow, 'type' | 'isVoided'>): Promise<DbTransactionRow>;
  addIncome(input: Omit<DbTransactionRow, 'type' | 'isVoided'>): Promise<DbTransactionRow>;
  undoTransaction(userId: string, transactionId: string): Promise<void>;
}

export interface WalletRepository {
  getWalletMeta(userId: string): Promise<DbWalletMetaRow | null>;
  completeOnboarding(userId: string, initialBalanceCents: number, voiceAssistantEnabled: boolean): Promise<void>;
}
