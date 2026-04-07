import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import { NextResponse } from "next/server";

import type { Transaction } from "@/lib/types";

const SYSTEM_PROMPT = `You are GemWallet's financial auditor persona.
Tone: sassy, brutally honest, and direct roast humor without hate speech.
Task: Analyze full transaction history and produce data-backed, actionable advice.
Rules:
- Roast spending habits aggressively but keep it useful and professional enough to follow.
- Focus on concrete spending patterns, subscription waste, and category concentration.
- Every recommendation must cite estimated savings impact.
- Return valid JSON only following the exact schema.`;

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    roast: { type: SchemaType.STRING },
    highlights: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    savingsOpportunities: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          amount: { type: SchemaType.NUMBER },
          reason: { type: SchemaType.STRING },
        },
        required: ["label", "amount", "reason"],
      },
    },
    budgetPlan: {
      type: SchemaType.OBJECT,
      properties: {
        currentMonthlySpend: { type: SchemaType.NUMBER },
        recommendedMonthlyCap: { type: SchemaType.NUMBER },
        emergencyFundMonths: { type: SchemaType.NUMBER },
      },
      required: [
        "currentMonthlySpend",
        "recommendedMonthlyCap",
        "emergencyFundMonths",
      ],
    },
  },
  required: ["roast", "highlights", "savingsOpportunities", "budgetPlan"],
};

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GOOGLE_AI_API_KEY environment variable." },
      { status: 500 },
    );
  }

  let transactions: Transaction[] = [];

  try {
    const payload = (await request.json()) as { transactions?: Transaction[] };
    transactions = payload.transactions ?? [];
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload. Expected { transactions: [...] }" },
      { status: 400 },
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({ model: "gemma-4" });

    const result = await model.generateContent({
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8,
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify({
                prompt: "Audit this complete local transaction history.",
                transactions,
              }),
            },
          ],
        },
      ],
    });

    const text = result.response.text();
    const parsed = JSON.parse(text);

    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gemma advisor request failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
