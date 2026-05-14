import { GoogleGenerativeAI } from '@google/generative-ai';

// In an Expo app, public env vars start with EXPO_PUBLIC_
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function* streamFinancialAnalysis(transactions: any[]) {
  if (!apiKey) {
    yield "Error: Gemini API key not found. Please set EXPO_PUBLIC_GEMINI_API_KEY in your environment.";
    return;
  }
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `
You are a snarky, highly critical, yet ultimately helpful financial advisor.
Review the following transaction data (provided in JSON).
Give a short, punchy, and sarcastic analysis of your client's spending habits.
Highlight any ridiculous expenses, but also acknowledge if there's any income.
Keep it under 3 short paragraphs.
Format with emojis.

Transactions:
${JSON.stringify(transactions, null, 2)}
`;

  try {
    const result = await model.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      yield chunk.text();
    }
  } catch (error: any) {
    yield `\n\nError generating analysis: ${error.message}`;
  }
}

export async function parseTransactionsWithAI(text: string, categories: any[]) {
  if (!apiKey) {
    throw new Error("Gemini API key not found. Please set EXPO_PUBLIC_GEMINI_API_KEY.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const categoryNames = categories.map(c => c.name).join(', ');
  
  const prompt = `
You are a data extraction engine for a cash-tracking application. 
Your sole function is to parse the user's input, identify distinct financial transactions, extract the numerical cost in decimal format, assign a logical category from the provided list, and output strictly in a JSON array. 
Do not provide conversational filler.

Available Categories: ${categoryNames}
Fallback Category: Misc

Required JSON schema:
[{"item": "String", "amount": Number, "category": "String", "confidence": Number}]

Rules:
- 'amount' must be an integer representing cents (e.g., $5.00 -> 500, $0.40 -> 40).
- 'category' must exactly match one of the Available Categories. If unsure, use the Fallback Category.
- 'confidence' is a float between 0.0 and 1.0.

User Input:
"${text}"
`;

  try {
    const result = await model.generateContent(prompt);
    const textResult = result.response.text();
    const match = textResult.match(/\[.*\]/s);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(textResult);
  } catch (error: any) {
    console.error("AI Parse Error:", error);
    throw new Error("Failed to parse transactions from text.");
  }
}
