export type TransactionCategory =
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Bills'
  | 'Entertainment'
  | 'Subscriptions';

export type Recurrence = 'monthly' | 'yearly';

export type Transaction = {
  id: string;
  title: string;
  amount: number;
  category: TransactionCategory;
  date: string;
  recurring?: boolean;
  interval?: Recurrence;
};
