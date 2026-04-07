import localforage from "localforage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { monthlyBudget, seededTransactions } from "@/lib/seed";
import type { Category, Transaction } from "@/lib/types";

type ExpenseInput = {
  title: string;
  amount: number;
  category: Category;
  recurring?: "monthly";
};

type FinanceState = {
  monthlyBudget: number;
  transactions: Transaction[];
  hydrated: boolean;
  addExpense: (expense: ExpenseInput) => void;
  setHydrated: (value: boolean) => void;
};

const localForageStorage = createJSONStorage<FinanceState>(() => ({
  getItem: async (name) => {
    const value = await localforage.getItem<string>(name);
    return value ?? null;
  },
  setItem: async (name, value) => {
    await localforage.setItem(name, value);
  },
  removeItem: async (name) => {
    await localforage.removeItem(name);
  },
}));

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      monthlyBudget,
      transactions: seededTransactions,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      addExpense: ({ title, amount, category, recurring }) =>
        set((state) => ({
          transactions: [
            {
              id: crypto.randomUUID(),
              title,
              amount,
              category,
              recurring,
              date: new Date().toISOString().slice(0, 10),
            },
            ...state.transactions,
          ],
        })),
    }),
    {
      name: "gemwallet-finance-store",
      storage: localForageStorage,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
