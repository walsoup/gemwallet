import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Category, Transaction, WalletMeta } from '../types/finance';
import { generateId } from '../utils/generateId';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'expense-food', name: 'Food', emoji: '🍔', kind: 'expense' },
  { id: 'expense-coffee', name: 'Coffee', emoji: '☕', kind: 'expense' },
  { id: 'expense-transit', name: 'Transit', emoji: '🚌', kind: 'expense' },
  { id: 'expense-shopping', name: 'Shopping', emoji: '🛍️', kind: 'expense' },
  { id: 'expense-bills', name: 'Bills', emoji: '🧾', kind: 'expense' },
  { id: 'expense-entertainment', name: 'Fun', emoji: '🎮', kind: 'expense' },
  { id: 'expense-subscriptions', name: 'Subs', emoji: '📺', kind: 'expense' },
  { id: 'expense-savings', name: 'Savings', emoji: '🏦', kind: 'system', isLocked: true },
  { id: 'expense-misc', name: 'Misc', emoji: '🤝', kind: 'system', isLocked: true },
  { id: 'income-atm', name: 'ATM', emoji: '🏧', kind: 'income' },
  { id: 'income-paycheck', name: 'Paycheck', emoji: '💼', kind: 'income' },
  { id: 'income-gift', name: 'Gift', emoji: '🎁', kind: 'income' },
  { id: 'income-side-hustle', name: 'Side Hustle', emoji: '💰', kind: 'income' },
  { id: 'income-custom', name: 'Custom', emoji: '✏️', kind: 'income' },
];

const DEFAULT_WALLET_META: WalletMeta = {
  hasCompletedOnboarding: false,
  voiceAssistantEnabled: false,
};

type AddExpenseInput = {
  amountCents: number;
  categoryId: string;
  note?: string;
  timestamp?: number;
};

type AddIncomeInput = {
  amountCents: number;
  categoryId: string;
  note?: string;
  timestamp?: number;
};

type TransactionState = {
  transactions: Transaction[];
  categories: Category[];
  walletMeta: WalletMeta;
  completeOnboarding: (params: { initialBalanceCents: number; voiceAssistantEnabled: boolean }) => void;
  setVoiceAssistantEnabled: (enabled: boolean) => void;
  addExpense: (params: AddExpenseInput) => Transaction;
  addIncome: (params: AddIncomeInput) => Transaction;
  undoTransaction: (transactionId: string) => void;
  addCustomCategory: (params: { name: string; emoji: string }) => void;
  deleteCategory: (categoryId: string) => void;
  clearAllData: () => void;
};

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      categories: DEFAULT_CATEGORIES,
      walletMeta: DEFAULT_WALLET_META,
      completeOnboarding: ({ initialBalanceCents, voiceAssistantEnabled }) => {
        const amountCents = Math.max(0, Math.round(initialBalanceCents));
        const genesis: Transaction[] =
          amountCents > 0
            ? [
                {
                  id: generateId(),
                  amountCents,
                  type: 'income',
                  timestamp: Date.now(),
                  categoryId: 'income-custom',
                  note: 'Opening balance',
                },
              ]
            : [];

        set((state) => ({
          transactions: state.walletMeta.hasCompletedOnboarding ? state.transactions : genesis,
          walletMeta: {
            hasCompletedOnboarding: true,
            voiceAssistantEnabled,
          },
        }));
      },
      setVoiceAssistantEnabled: (enabled) =>
        set((state) => ({
          walletMeta: {
            ...state.walletMeta,
            voiceAssistantEnabled: enabled,
          },
        })),
      addExpense: ({ amountCents, categoryId, note, timestamp }) => {
        const transaction: Transaction = {
          id: generateId(),
          amountCents: Math.max(1, Math.round(amountCents)),
          type: 'expense',
          timestamp: timestamp ?? Date.now(),
          categoryId,
          note: note?.trim() || undefined,
        };
        set((state) => ({ transactions: [transaction, ...state.transactions] }));
        return transaction;
      },
      addIncome: ({ amountCents, categoryId, note, timestamp }) => {
        const transaction: Transaction = {
          id: generateId(),
          amountCents: Math.max(1, Math.round(amountCents)),
          type: 'income',
          timestamp: timestamp ?? Date.now(),
          categoryId,
          note: note?.trim() || undefined,
        };
        set((state) => ({ transactions: [transaction, ...state.transactions] }));
        return transaction;
      },
      undoTransaction: (transactionId) => {
        set((state) => ({
          transactions: state.transactions.filter((item) => item.id !== transactionId),
        }));
      },
      addCustomCategory: ({ name, emoji }) => {
        const cleaned = name.trim().slice(0, 14);
        if (!cleaned) return;

        const exists = get().categories.some((item) => item.name.toLowerCase() === cleaned.toLowerCase());
        if (exists) return;

        set((state) => ({
          categories: [
            {
              id: `expense-custom-${generateId()}`,
              name: cleaned,
              emoji: emoji.trim() || '🧩',
              kind: 'expense',
            },
            ...state.categories,
          ],
        }));
      },
      deleteCategory: (categoryId) => {
        const category = get().categories.find((item) => item.id === categoryId);
        if (!category || category.isLocked || category.kind !== 'expense') {
          return;
        }

        set((state) => ({
          categories: state.categories.filter((item) => item.id !== categoryId),
          transactions: state.transactions.map((item) =>
            item.categoryId === categoryId ? { ...item, categoryId: 'expense-misc' } : item
          ),
        }));
      },
      clearAllData: () =>
        set({
          transactions: [],
          categories: DEFAULT_CATEGORIES,
          walletMeta: DEFAULT_WALLET_META,
        }),
    }),
    {
      name: 'gemwallet-transactions-v2',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export const selectBalanceCents = (state: TransactionState) =>
  state.transactions.reduce(
    (sum, tx) => sum + (tx.type === 'income' ? tx.amountCents : -tx.amountCents),
    0
  );
