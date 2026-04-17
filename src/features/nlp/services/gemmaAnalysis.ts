import { GoogleGenerativeAI } from '@google/generative-ai';

import type { Transaction } from '../../../../types/finance';
import { formatCurrency } from '../../../../utils/formatCurrency';

const STREAM_CHUNK_SIZE = 80;
const DEFAULT_MODEL = 'gemma-2-9b-it';

type AnalysisOptions = {
  apiKey?: string;
  currencyCode: string;
  locale: string;
  region: string;
  model?: string;
  advanced?: boolean;
};

function chunkText(text: string) {
  return text.match(new RegExp(`.{1,${STREAM_CHUNK_SIZE}}`, 'g')) ?? [text];
}

function summarize(transactions: Transaction[], options: Pick<AnalysisOptions, 'currencyCode' | 'locale'>): string {
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
    'Quick local summary:',
    `• Income: ${formatCurrency(incomeTotal, options)}`,
    `• Expenses: ${formatCurrency(expenseTotal, options)}`,
    `• Net: ${formatCurrency(balance, options)}`,
  ].join('\n');
}

function buildPrompt(transactions: Transaction[], options: AnalysisOptions) {
  const recent = transactions.slice(0, 30);
  const rows = recent
    .map((tx) => {
      const amount = formatCurrency(tx.amountCents, { currencyCode: options.currencyCode, locale: options.locale });
      const direction = tx.type === 'income' ? 'income' : 'expense';
      return `${amount} ${direction} for ${tx.note ?? 'no note'} (${tx.categoryId}) on ${new Date(tx.timestamp).toISOString()}`;
    })
    .join('\n');

  return [
    'You are Gemma summarizing a cash ledger. Respond with concise, actionable bullets.',
    `Locale: ${options.locale}, Region: ${options.region}, Currency: ${options.currencyCode}.`,
    'Focus on: balance trend, biggest categories, spending vs income, and one practical next action.',
    'Avoid apologizing. Keep it under 5 short bullets.',
    'Transactions:',
    rows || 'No transactions yet.',
  ].join('\n');
}

export async function* streamFinancialAnalysis(transactions: Transaction[], options: AnalysisOptions) {
  const fallback = summarize(transactions, {
    currencyCode: options.currencyCode,
    locale: options.locale,
  });

  if (!options.apiKey?.trim()) {
    yield 'Add your Gemini API key in Settings to unlock Gemma insights.';
    for (const chunk of chunkText(fallback)) {
      yield chunk;
    }
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(options.apiKey.trim());
    const model = genAI.getGenerativeModel({ model: options.model || DEFAULT_MODEL });
    const prompt = buildPrompt(transactions, options);

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.advanced ? 0.65 : 0.35,
        maxOutputTokens: options.advanced ? 512 : 320,
      },
    });

    const text = response.response.text()?.trim() || fallback;
    for (const chunk of chunkText(text)) {
      await new Promise((resolve) => setTimeout(resolve, 8));
      yield chunk;
    }
  } catch (error) {
    console.error('Gemma analysis failed', error);
    yield 'Gemma had an issue processing this request. Double-check your API key and network connection.';
  }
}
