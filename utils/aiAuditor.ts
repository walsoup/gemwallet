import { GoogleGenerativeAI } from '@google/generative-ai';

import type { Transaction } from '../types/finance';

const SYSTEM_PROMPT = `
You are a sassy, brutally honest financial auditor.
Analyze the user's local transaction array and roast their spending habits aggressively.
Be funny but not abusive. Be direct and candid.
Always provide practical actions.

Output format:
1) Roast Summary
2) Top 3 Spending Problems
3) Concrete Weekly Budget Actions
4) One motivational closing line
`;

export async function runFinancialAudit(transactions: Transaction[]): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMMA_API_KEY;

  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_GEMMA_API_KEY environment variable.');
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemma-3-27b-it' });

  const prompt = `${SYSTEM_PROMPT}\n\nTransactions:\n${JSON.stringify(transactions, null, 2)}`;

  const response = await model.generateContent(prompt);
  return response.response.text();
}
