/* eslint-disable import/namespace */
import * as FileSystem from 'expo-file-system';

export type LiteRtModel = {
  id: string;
  label: string;
  description: string;
  fileName: string;
  sizeLabel: string;
  repoPath: string;
};

export const DEFAULT_LITERT_MODEL_ID = 'gemma-4-E2B-it';

export const LITERT_MODELS: LiteRtModel[] = [
  {
    id: 'gemma-4-E2B-it',
    label: 'Gemma 4 E2B LiteRT',
    description: 'Balanced on-device Gemma model in .litertlm format.',
    fileName: 'gemma-4-E2B-it.litertlm',
    sizeLabel: '2.58 GB',
    repoPath: 'litert-community/gemma-4-E2B-it-litert-lm',
  },
  {
    id: 'gemma-4-E2B-it-qualcomm-qcs8275',
    label: 'Gemma 4 E2B Qualcomm LiteRT',
    description: 'Device-tuned variant for Qualcomm QCS8275 hardware.',
    fileName: 'gemma-4-E2B-it_qualcomm_qcs8275.litertlm',
    sizeLabel: '3.29 GB',
    repoPath: 'litert-community/gemma-4-E2B-it-litert-lm',
  },
];

export function getLiteRtModel(modelId: string) {
  return LITERT_MODELS.find((item) => item.id === modelId) ?? LITERT_MODELS[0];
}

export function getLiteRtDownloadUrl(modelId: string) {
  const model = getLiteRtModel(modelId);
  return `https://huggingface.co/${model.repoPath}/resolve/main/${model.fileName}?download=true`;
}

export function getLiteRtCacheUri(modelId: string) {
  const model = getLiteRtModel(modelId);
  return `${(FileSystem as any).documentDirectory ?? ''}litert/${model.fileName}`;
}

export async function isLiteRtModelCached(modelId: string) {
  const cacheUri = getLiteRtCacheUri(modelId);
  const info = await FileSystem.getInfoAsync(cacheUri);
  return info.exists;
}

export async function ensureLiteRtCacheDir() {
  const baseDir = `${(FileSystem as any).documentDirectory ?? ''}litert`;
  const info = await FileSystem.getInfoAsync(baseDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
  }
  return baseDir;
}

// @ts-ignore
export async function downloadLiteRtModel(
  modelId: string,
  onProgress?: (progress: number) => void,
  headers?: Record<string, string>
) {
  const model = getLiteRtModel(modelId);
  const destination = getLiteRtCacheUri(model.id);
  await ensureLiteRtCacheDir();

  const download = FileSystem.createDownloadResumable(
    getLiteRtDownloadUrl(model.id),
    destination,
    {
      headers: {
        ...headers,
      },
    },
    (event) => {
      if (!event.totalBytesExpectedToWrite) {
        onProgress?.(0);
        return;
      }
      onProgress?.(event.totalBytesWritten / event.totalBytesExpectedToWrite);
    }
  );

  const result = await download.downloadAsync();
  if (!result?.uri) {
    throw new Error('LiteRT download did not produce a file.');
  }

  onProgress?.(1);
  return result.uri;
}