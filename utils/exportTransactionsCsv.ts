import type { Transaction, Category } from '../types/finance';

function escapeCsv(value: string) {
  let sanitized = value;
  // Guard against CSV Formula Injection when opened in spreadsheet applications
  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = `'${sanitized}`;
  }
  if (sanitized.includes('"') || sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('\r')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export function exportTransactionsCsv(params: {
  transactions: Transaction[];
  categories: Category[];
  includeNotes: boolean;
}) {
  const header = ['id', 'timestamp', 'type', 'amountCents', 'categoryId', 'categoryName'];
  if (params.includeNotes) header.push('note');

  const categoryNameFor = (id: string) =>
    params.categories.find((c) => c.id === id)?.name ?? '';

  const rows = params.transactions
    .slice()
    .reverse()
    .map((tx) => {
      const base = [
        tx.id,
        new Date(tx.timestamp).toISOString(),
        tx.type,
        String(tx.amountCents),
        tx.categoryId,
        categoryNameFor(tx.categoryId),
      ].map((value) => escapeCsv(value));

      if (params.includeNotes) {
        base.push(escapeCsv(tx.note ?? ''));
      }

      return base.join(',');
    });

  return `${header.join(',')}\n${rows.join('\n')}\n`;
}

