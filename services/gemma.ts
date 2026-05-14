import { GoogleGenerativeAI } from '@google/generative-ai';

export { streamFinancialAnalysis } from '../src/features/nlp/services/gemmaAnalysis';

// In an Expo app, public env vars start with EXPO_PUBLIC_
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

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
