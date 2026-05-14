import { Platform } from 'react-native';
import type { createLLM as createLLMType } from 'react-native-litert-lm';
import { applyGemmaTemplate } from 'react-native-litert-lm';

import type { Transaction } from '../../../../types/finance';

let createLLM: typeof createLLMType | null = null;
let getRecommendedBackend: (() => 'cpu' | 'gpu' | 'npu') | null = null;
let llmInstance: any | null = null;
let loadedModelPath: string | null = null;

async function ensureBindingsLoaded() {
  if (createLLM && getRecommendedBackend) return;
  if (Platform.OS === 'web') {
    throw new Error('LiteRT is not supported on web.');
  }
  const mod = await import('react-native-litert-lm');
  createLLM = mod.createLLM;
  getRecommendedBackend = mod.getRecommendedBackend;
}

export async function ensureLocalLiteRtModelLoaded(params: {
  modelPath: string;
  temperature: number;
  maxTokens: number;
}) {
  await ensureBindingsLoaded();

  if (!llmInstance) {
    llmInstance = createLLM!();
  }

  if (loadedModelPath === params.modelPath && llmInstance.isReady()) {
    return llmInstance;
  }

  await llmInstance.loadModel(params.modelPath, {
    backend: getRecommendedBackend!(),
    temperature: params.temperature,
    maxTokens: params.maxTokens,
  });
  loadedModelPath = params.modelPath;
  return llmInstance;
}

export async function* streamLocalLiteRtAnalysis(params: {
  transactions: Transaction[];
  userQuestion: string;
  modelPath: string;
  temperature: number;
  maxTokens: number;
}) {
  const llm = await ensureLocalLiteRtModelLoaded({
    modelPath: params.modelPath,
    temperature: params.temperature,
    maxTokens: params.maxTokens,
  });

  const prompt = applyGemmaTemplate([
    {
      role: 'system',
      content:
        'You are a private on-device financial assistant. Keep responses concise. ' +
        'If the user asks to log a transaction, respond with a command like: ' +
        'ADD_EXPENSE: <amount> <category> <note> or ADD_INCOME: <amount> <category> <note>.',
    },
    {
      role: 'user',
      content: [
        'Recent transactions:',
        ...params.transactions.slice(0, 20).map((tx) => `${tx.type} ${tx.amountCents} ${tx.categoryId} ${tx.note ?? ''}`),
        '',
        `Question: ${params.userQuestion}`,
      ].join('\n'),
    },
  ]);

  const response = await llm.sendMessage(prompt);
  yield response;
}
