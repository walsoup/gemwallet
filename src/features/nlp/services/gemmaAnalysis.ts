import { GoogleGenerativeAI } from '@google/generative-ai';

import type { Transaction } from '../../../../types/finance';
import { formatCurrency } from '../../../../utils/formatCurrency';

const STREAM_CHUNK_SIZE = 80;
const DEFAULT_MODEL = 'gemma-4-31b-it';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite-preview';
const MIN_CHUNK_DELAY_MS = 4;
const MAX_TOKENS_BASE = 240;

type AnalysisOptions = {
  apiKey?: string;
  currencyCode: string;
  locale: string;
  region: string;
  model?: string;
  advanced?: boolean;
  addExpense?: (params: { amountCents: number; categoryId: string; note?: string }) => Transaction;
};

type AnalysisCallbacks = {
  onCommand?: (command: { amountCents: number; categoryHint: string; note?: string }) => void;
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
    `• Income ${formatCurrency(incomeTotal, options)}`,
    `• Expenses ${formatCurrency(expenseTotal, options)}`,
    `• Net ${formatCurrency(balance, options)}`,
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
    'Summarize this cash ledger for a personal finance assistant.',
    `Locale ${options.locale}, Region ${options.region}, Currency ${options.currencyCode}.`,
    'Return under 5 short bullets: balance trend, biggest categories, spend vs income, and one next action.',
    'If the text contains an add-expense request, emit a single line "ADD_EXPENSE: <amount> <category hint> <note>" instead of bullets.',
    'Keep response user-ready only—no system or prompt text.',
    'Transactions (newest first):',
    rows || 'No transactions yet.',
  ].join('\n');
}

const SYSTEM_PATTERNS = [
  /^you are/i,
  /^avoid/i,
  /^respond/i,
  /^transactions:/i,
  /^focus on/i,
  /^system/i,
  /^locale:/i,
  /^region:/i,
  /^currency:/i,
  /^model:/i,
  /^analysis:/i,
  /^instructions?:/i,
];

function sanitizeModelOutput(text: string) {
  const withoutTags = text.replace(/<\|.*?\|>/g, '').replace(/```.*?```/gs, '');
  const lines = withoutTags
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !SYSTEM_PATTERNS.some((pattern) => pattern.test(line)) && !line.startsWith('ADD_EXPENSE'));

  if (!lines.length) return '';
  const cleaned = lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

export async function generatePersonalGreeting(
  transactions: Transaction[],
  options: AnalysisOptions & { nameHint?: string }
) {
  if (!options.apiKey?.trim()) return null;
  const genAI = new GoogleGenerativeAI(options.apiKey.trim());
  const modelName = options.model || DEFAULT_MODEL;
  const model = genAI.getGenerativeModel({ model: modelName });
  const last = transactions[0];
  const prompt = [
    'Create a short, upbeat greeting for the user of this wallet.',
    options.nameHint ? `User prefers being called ${options.nameHint}.` : '',
    `Locale ${options.locale}, Region ${options.region}, Currency ${options.currencyCode}.`,
    last
      ? `Latest move: ${formatCurrency(last.amountCents, { currencyCode: options.currencyCode, locale: options.locale })} ${last.type} in ${last.categoryId}.`
      : 'No transactions yet.',
    'Keep it to one sentence, no emojis, no system text.',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 48,
      topP: 0.8,
      candidateCount: 1,
      responseMimeType: 'text/plain',
    },
  });

  const text = response.response.text()?.trim();
  const cleaned = text ? sanitizeModelOutput(text) : null;
  return cleaned?.length ? cleaned : null;
}

export async function* streamFinancialAnalysis(
  transactions: Transaction[],
  options: AnalysisOptions,
  callbacks?: AnalysisCallbacks
) {
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

  const genAI = new GoogleGenerativeAI(options.apiKey.trim());
  const preferredModel = options.model || DEFAULT_MODEL;
  const prompt = buildPrompt(transactions, options);
  const modelsToTry = [preferredModel, FALLBACK_MODEL].filter(
    (model, index, arr) => arr.indexOf(model) === index
  );

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.advanced ? 0.55 : 0.28,
          maxOutputTokens: options.advanced ? 360 : MAX_TOKENS_BASE,
          topP: 0.85,
          responseMimeType: 'text/plain',
        },
      });

      const prefix =
        modelName === FALLBACK_MODEL ? 'Using fallback Gemini 3.1 Flash Lite model.\n\n' : '';
      const raw = `${prefix}${response.response.text()?.trim() || fallback}`;
      const command = parseAddExpenseCommand(raw);
      if (command && callbacks?.onCommand) {
        callbacks.onCommand(command);
      }
      const cleaned = sanitizeModelOutput(raw) || fallback;
      for (const chunk of chunkText(cleaned)) {
        await new Promise((resolve) => setTimeout(resolve, MIN_CHUNK_DELAY_MS));
        yield chunk;
      }
      return;
    } catch (error) {
      console.warn(`Gemma analysis failed on model ${modelName}`, error);
      continue;
    }
  }

  yield 'Gemma had an issue processing this request. Double-check your API key and network connection.';
}

export function parseAddExpenseCommand(text: string) {
  const match = text.match(/ADD_EXPENSE:\s*([0-9]+(?:\.[0-9]{1,2})?)\s+([^\s]+)\s*(.*)/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const categoryHint = match[2];
  const note = match[3]?.trim();
  return { amountCents: Math.round(amount * 100), categoryHint, note };
}
