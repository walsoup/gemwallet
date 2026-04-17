import type { Transaction } from '../../../../types/finance';

const STREAM_CHUNK_SIZE = 80;

function summarize(transactions: Transaction[]): string {
  if (!transactions.length) {
    return 'No transactions yet. Start logging expenses to get useful trends.';
  }

  const expenseTotal = transactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amountCents, 0);

  const incomeTotal = transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amountCents, 0);

  const balance = incomeTotal - expenseTotal;

  return [
    'Local Gemma placeholder summary:',
    `• Income: $${(incomeTotal / 100).toFixed(2)}`,
    `• Expenses: $${(expenseTotal / 100).toFixed(2)}`,
    `• Net: $${(balance / 100).toFixed(2)}`,
    'Detailed AI inference is staged behind the on-device bridge rollout.',
  ].join('\n');
}

export async function* streamFinancialAnalysis(transactions: Transaction[]) {
  const text = summarize(transactions);
  const chunks = text.match(new RegExp(`.{1,${STREAM_CHUNK_SIZE}}`, 'g')) ?? [text];

  for (const chunk of chunks) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    yield chunk;
  }
}
