import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Transaction } from '../../../../types/finance';
import { formatCurrency } from '../../../../utils/formatCurrency';
import type { AiProvider } from '../../../../store/useSettingsStore';
import { runLiteRtCompletion } from './litertRuntime';

const DEFAULT_MODEL = 'gemma-4-31b-it';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite-preview';
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models';
const STREAM_CHUNK_SIZE = 80;
const MIN_CHUNK_DELAY_MS = 4;
const MAX_TOKENS_BASE = 240;

type AnalysisOptions = {
  aiProvider: AiProvider;
  geminiApiKey?: string;
  huggingFaceToken?: string;
  localModelDownloaded?: boolean;
  currencyCode: string;
  locale: string;
  region: string;
  model?: string;
  localModelId?: string;
  advanced?: boolean;
  addExpense?: (params: { amountCents: number; categoryId: string; note?: string }) => Transaction;
};

type AnalysisCallbacks = {
  onCommand?: (command: { amountCents: number; categoryHint: string; note?: string }) => void;
  onIncome?: (command: { amountCents: number; categoryHint: string; note?: string }) => void;
  onRecurring?: (command: {
    name: string;
    amountCents: number;
    type: 'income' | 'expense';
    interval: 'weekly' | 'monthly';
    categoryHint?: string;
    startDate?: number;
  }) => void;
  onGoal?: (command: { name: string; targetCents: number; dueDate?: number }) => void;
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

function buildPrompt(transactions: Transaction[], options: AnalysisOptions, userQuestion?: string) {
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
    userQuestion ? `User question: ${userQuestion}` : '',
    'If the user asks to log purchases, emit "ADD_EXPENSE: <amount> <category> <note>" lines.',
    'If the user asks to log income, emit "ADD_INCOME: <amount> <category> <note>".',
    'If the user asks to create recurring items, emit "ADD_RECURRING: <name> <amount> <income|expense> <weekly|monthly> <categoryHint?> <startDate?>".',
    'If the user asks to save a goal, emit "ADD_GOAL: <name> <targetAmount> <dueDate?>".',
    'Keep commands on their own lines; otherwise respond with helpful Markdown.',
    'Keep commands on their own lines; otherwise respond with helpful Markdown.',
    'Use Markdown formatting heavily. Use **bold** for important numbers.',
    'Present the balance trend and biggest categories in a clean Markdown table.',
    'Provide one clear next action bullet point at the end.',
    'If the text contains an add-expense request, emit a single line "ADD_EXPENSE: <amount> <category hint> <note>" instead of the summary.',
    'Keep response user-ready only—no system or prompt text. Do not wrap the whole response in a code block.',
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
  // Remove special model tokens but keep markdown
  const withoutTags = text.replace(/<\|.*?\|>/g, '');
  const lines = withoutTags
    .split('\n')
    .filter((line) => line && !SYSTEM_PATTERNS.some((pattern) => pattern.test(line)) && !line.startsWith('ADD_EXPENSE'));

  if (!lines.length) return '';
  const cleaned = lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
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

export function parseAddIncomeCommand(text: string) {
  const match = text.match(/ADD_INCOME:\s*([0-9]+(?:\.[0-9]{1,2})?)\s+([^\s]+)\s*(.*)/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const categoryHint = match[2];
  const note = match[3]?.trim();
  return { amountCents: Math.round(amount * 100), categoryHint, note };
}

export function parseAddRecurringCommand(text: string) {
  const match = text.match(
    /ADD_RECURRING:\s*([^\s]+)\s+([0-9]+(?:\.[0-9]{1,2})?)\s+(income|expense)\s+(weekly|monthly)\s*([^\s]+)?\s*(.*)?/i
  );
  if (!match) return null;
  const name = match[1]?.trim();
  const amount = Number(match[2]);
  if (!name || !Number.isFinite(amount) || amount <= 0) return null;
  const type: 'income' | 'expense' = match[3] === 'income' ? 'income' : 'expense';
  const interval: 'weekly' | 'monthly' = match[4] === 'weekly' ? 'weekly' : 'monthly';
  const categoryHint = match[5]?.trim();
  const startDateRaw = match[6]?.trim();
  const startDate = startDateRaw ? Date.parse(startDateRaw) : undefined;
  return {
    name,
    amountCents: Math.round(amount * 100),
    type,
    interval,
    categoryHint,
    startDate: Number.isNaN(startDate) ? undefined : startDate,
  };
}

export function parseAddGoalCommand(text: string) {
  const match = text.match(/ADD_GOAL:\s*([^\s].*?)\s+([0-9]+(?:\.[0-9]{1,2})?)\s*(.*)?/i);
  if (!match) return null;
  const name = match[1]?.trim();
  const amount = Number(match[2]);
  if (!name || !Number.isFinite(amount) || amount <= 0) return null;
  const dueDateRaw = match[3]?.trim();
  const dueDate = dueDateRaw ? Date.parse(dueDateRaw) : undefined;
  return {
    name,
    targetCents: Math.round(amount * 100),
    dueDate: Number.isNaN(dueDate) ? undefined : dueDate,
  };
}

async function callHuggingFace(
  token: string,
  model: string,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const url = `${HUGGINGFACE_API_URL}/${model}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: maxTokens,
        temperature,
        top_p: 0.85,
        return_full_text: false,
        do_sample: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HuggingFace API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text;
  }
  if (data?.error) {
    throw new Error(`Model error: ${data.error}`);
  }
  if (typeof data === 'string') {
    return data;
  }

  throw new Error('Unexpected response format from HuggingFace');
}

export async function generatePersonalGreeting(
  transactions: Transaction[],
  options: AnalysisOptions & { nameHint?: string }
) {
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

  try {
    const modelName = options.model || DEFAULT_MODEL;

    if (options.aiProvider === 'local') {
       if (!options.localModelDownloaded) return null;
       const result = await runLiteRtCompletion(prompt, {
         systemPrompt: 'You are GemWallet, a concise finance assistant. Reply with a single warm greeting sentence.',
         maxTokens: 48,
         temperature: 0.2,
         modelId: options.localModelId,
       });
       if (!result.ok) return null;
       const cleaned = sanitizeModelOutput(result.text) || result.text;
       return cleaned?.trim() || null;
    }

    if (options.aiProvider === 'huggingface') {
      if (!options.huggingFaceToken?.trim()) return null;
      const text = await callHuggingFace(options.huggingFaceToken.trim(), modelName, prompt, 48, 0.25);
      const cleaned = text ? sanitizeModelOutput(text.trim()) : null;
      return cleaned?.length ? cleaned : null;
    }

    if (options.aiProvider === 'google') {
      if (!options.geminiApiKey?.trim()) return null;
      const genAI = new GoogleGenerativeAI(options.geminiApiKey.trim());
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 48,
          topP: 0.8,
        },
      });
      const text = response.response.text()?.trim();
      const cleaned = text ? sanitizeModelOutput(text) : null;
      return cleaned?.length ? cleaned : null;
    }
  } catch (error) {
    console.warn(`Greeting fallback (${options.aiProvider})`, error);
    return null;
  }
}

export async function* streamFinancialAnalysis(
  transactions: Transaction[],
  options: AnalysisOptions,
  callbacks?: AnalysisCallbacks,
  userQuestion?: string
) {
  const fallback = summarize(transactions, {
    currencyCode: options.currencyCode,
    locale: options.locale,
  });

  const prompt = buildPrompt(transactions, options, userQuestion);
  const preferredModel = options.model || DEFAULT_MODEL;

  try {
    if (options.aiProvider === 'local') {
      if (!options.localModelDownloaded) {
        yield 'Local LiteRT model not downloaded yet. Please download it in Settings.';
        for (const chunk of chunkText(fallback)) yield chunk;
        return;
      }

      const localResult = await runLiteRtCompletion(prompt, {
        systemPrompt:
          'You are a personal finance analyst for GemWallet. Provide concise Markdown with trends, tables, and one clear next action.',
        maxTokens: options.advanced ? 360 : MAX_TOKENS_BASE,
        temperature: options.advanced ? 0.5 : 0.28,
        modelId: options.localModelId,
      });

      if (!localResult.ok) {
        const reason =
          localResult.reason === 'model-missing'
            ? 'Local LiteRT model is missing. Re-download it in Settings.'
            : 'LiteRT runtime was unavailable; showing a cached summary instead.';
        yield `${reason}\n\n`;
        for (const chunk of chunkText(fallback)) yield chunk;
        return;
      }

      const raw = localResult.text?.trim() || fallback;
      const expenseCommand = parseAddExpenseCommand(raw);
      const incomeCommand = parseAddIncomeCommand(raw);
      const recurringCommand = parseAddRecurringCommand(raw);
      const goalCommand = parseAddGoalCommand(raw);
      if (expenseCommand && callbacks?.onCommand) callbacks.onCommand(expenseCommand);
      if (incomeCommand && callbacks?.onIncome) callbacks.onIncome(incomeCommand);
      if (recurringCommand && callbacks?.onRecurring) callbacks.onRecurring(recurringCommand);
      if (goalCommand && callbacks?.onGoal) callbacks.onGoal(goalCommand);

      const cleaned = sanitizeModelOutput(raw) || fallback;
      for (const chunk of chunkText(cleaned)) {
        await new Promise((resolve) => setTimeout(resolve, MIN_CHUNK_DELAY_MS));
        yield chunk;
      }
      return;
    }

    if (options.aiProvider === 'huggingface') {
      if (!options.huggingFaceToken?.trim()) {
        yield 'Add your HuggingFace token in Settings to unlock AI insights.';
        for (const chunk of chunkText(fallback)) yield chunk;
        return;
      }

      const text = await callHuggingFace(
        options.huggingFaceToken.trim(),
        preferredModel,
        prompt,
        options.advanced ? 360 : MAX_TOKENS_BASE,
        options.advanced ? 0.55 : 0.28
      );

      const raw = text?.trim() || fallback;
      const expenseCommand = parseAddExpenseCommand(raw);
      const incomeCommand = parseAddIncomeCommand(raw);
      const recurringCommand = parseAddRecurringCommand(raw);
      const goalCommand = parseAddGoalCommand(raw);
      if (expenseCommand && callbacks?.onCommand) callbacks.onCommand(expenseCommand);
      if (incomeCommand && callbacks?.onIncome) callbacks.onIncome(incomeCommand);
      if (recurringCommand && callbacks?.onRecurring) callbacks.onRecurring(recurringCommand);
      if (goalCommand && callbacks?.onGoal) callbacks.onGoal(goalCommand);
      const cleaned = sanitizeModelOutput(raw) || fallback;
      for (const chunk of chunkText(cleaned)) {
        await new Promise((resolve) => setTimeout(resolve, MIN_CHUNK_DELAY_MS));
        yield chunk;
      }
      return;
    }

    if (options.aiProvider === 'google') {
       if (!options.geminiApiKey?.trim()) {
         yield 'Add your Gemini API key in Settings to unlock Gemma insights.';
         for (const chunk of chunkText(fallback)) yield chunk;
         return;
       }

       const genAI = new GoogleGenerativeAI(options.geminiApiKey.trim());
       const modelsToTry = [preferredModel, FALLBACK_MODEL];

       for (const modelName of modelsToTry) {
         try {
           const model = genAI.getGenerativeModel({ model: modelName });
           const response = await model.generateContent({
             contents: [{ role: 'user', parts: [{ text: prompt }] }],
             generationConfig: {
               temperature: options.advanced ? 0.55 : 0.28,
               maxOutputTokens: options.advanced ? 360 : MAX_TOKENS_BASE,
               topP: 0.85,
             },
           });

           const prefix = modelName === FALLBACK_MODEL ? 'Using fallback Gemini 3.1 Flash Lite model.\n\n' : '';
           const raw = `${prefix}${response.response.text()?.trim() || fallback}`;
           const command = parseAddExpenseCommand(raw);
           if (command && callbacks?.onCommand) callbacks.onCommand(command);
           
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
    }

  } catch (error) {
    console.warn(`AI analysis failed (${options.aiProvider})`, error);
    yield 'AI had an issue processing this request. Check your settings and try again.';
    for (const chunk of chunkText(fallback)) yield chunk;
  }
}
