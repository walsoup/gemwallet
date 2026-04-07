import type { Transaction } from '../types/finance';

export const seedTransactions: Transaction[] = [
  { id: 't1', title: 'Coffee + pastry', amount: 12.6, category: 'Food', date: '2026-04-01' },
  { id: 't2', title: 'Netflix Premium', amount: 19.99, category: 'Subscription', date: '2026-04-02', recurring: true, interval: 'monthly' },
  { id: 't3', title: 'Ride share', amount: 21.4, category: 'Transport', date: '2026-04-03' },
  { id: 't4', title: 'Retail therapy', amount: 164.22, category: 'Shopping', date: '2026-04-04' },
  { id: 't5', title: 'Spotify', amount: 10.99, category: 'Subscription', date: '2026-04-04', recurring: true, interval: 'monthly' },
  { id: 't6', title: 'Electric bill', amount: 88.31, category: 'Bills', date: '2026-04-05' },
  { id: 't7', title: 'Late-night food delivery', amount: 34.2, category: 'Food', date: '2026-04-06' }
];
