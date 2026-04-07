import type { Transaction } from "@/lib/types";

export const monthlyBudget = 1800;

export const seededTransactions: Transaction[] = [
  {
    id: "txn-1",
    title: "30dh for turkey shawarma",
    amount: 30,
    date: "2026-04-01",
    category: "Food",
  },
  {
    id: "txn-2",
    title: "5dh for olives",
    amount: 5,
    date: "2026-04-01",
    category: "Groceries",
  },
  {
    id: "txn-3",
    title: "monthly data plan",
    amount: 120,
    date: "2026-04-02",
    category: "Subscription",
    recurring: "monthly",
  },
  {
    id: "txn-4",
    title: "Video streaming premium",
    amount: 89,
    date: "2026-04-02",
    category: "Subscription",
    recurring: "monthly",
  },
  {
    id: "txn-5",
    title: "Gym membership",
    amount: 220,
    date: "2026-04-03",
    category: "Subscription",
    recurring: "monthly",
  },
  {
    id: "txn-6",
    title: "Weekend rideshare",
    amount: 72,
    date: "2026-04-04",
    category: "Transport",
  },
  {
    id: "txn-7",
    title: "Electricity bill",
    amount: 180,
    date: "2026-04-04",
    category: "Utilities",
  },
  {
    id: "txn-8",
    title: "Impulse coffee spree",
    amount: 64,
    date: "2026-04-05",
    category: "Lifestyle",
  },
];
