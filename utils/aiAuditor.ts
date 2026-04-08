import { GoogleGenerativeAI } from '@google/generative-ai';

import type { Transaction } from '../types/finance';

const SYSTEM_PROMPT = `
You are a sarcastic but useful personal finance auditor.
Roast the user for bad spending patterns while staying non-abusive.
Always include practical steps.

Output format:
1) Roast Summary
2) Top 3 Spending Problems
3) Concrete Weekly Budget Actions
4) One motivational closing line
`;

export async function streamFinancialAudit(
  transactions: Transaction[],
  apiKey: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  if (!apiKey.trim()) {
    throw new Error('Missing Gemma API key. Open Settings to add it.');
  }

  const client = new GoogleGenerativeAI(apiKey.trim());
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `${SYSTEM_PROMPT}\n\nTransactions JSON:\n${JSON.stringify(transactions, null, 2)}`;

  const stream = await model.generateContentStream(prompt);
  let fullText = '';

  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) {
      fullText += text;
      onChunk(text);
    }
  }

  return fullText;
}
