const dynamicImport = new Function('id', 'return import(id);') as <T>(id: string) => Promise<T>;

type FileSystemModule = typeof import('expo-file-system/legacy');
type LiteRtModule = typeof import('react-native-litert-lm');
type LiteRtInstance = ReturnType<LiteRtModule['createLLM']>;

type PrepareEngineResult =
  | { reason: 'runtime-missing'; path?: undefined }
  | { reason: 'model-missing'; path: string }
  | { engine: LiteRtInstance; reason?: undefined };

export type LiteRtModelOption = {
  id: string;
  label: string;
  url: string;
  sizeHint: string;
  notes?: string;
};

let cachedFileSystem: FileSystemModule | null = null;
let cachedModule: LiteRtModule | null = null;
let cachedInstance: LiteRtInstance | null = null;
let cachedModelPath: string | null = null;
let cachedAvailableModels: LiteRtModelOption[] | null = null;

async function loadFileSystem(): Promise<FileSystemModule | null> {
  if (cachedFileSystem) return cachedFileSystem;
  try {
    cachedFileSystem = (await dynamicImport<FileSystemModule>('expo-file-system/legacy')) as FileSystemModule;
    return cachedFileSystem;
  } catch (error) {
    console.warn('Expo FileSystem unavailable in this environment', error);
    return null;
  }
}

async function loadLiteRtModule(): Promise<LiteRtModule | null> {
  if (cachedModule) return cachedModule;
  try {
    cachedModule = (await dynamicImport<LiteRtModule>('react-native-litert-lm')) as LiteRtModule;
    return cachedModule;
  } catch (error) {
    console.warn('LiteRT runtime unavailable in this build', error);
    return null;
  }
}

function fileNameFromUrl(url: string) {
  return url.split('/').pop() || 'local-gemma.litertlm';
}

async function resolveCachePath(fileName: string) {
  const fs = await loadFileSystem();
  const baseDir = fs?.documentDirectory ?? '/tmp/';
  const dir = `${baseDir}litert/`;
  const path = `${dir}${fileName}`;
  return { fs, dir, path };
}

export async function availableLiteRtModels(): Promise<LiteRtModelOption[]> {
  if (cachedAvailableModels) return cachedAvailableModels;

  const mod = await loadLiteRtModule();
  const models: LiteRtModelOption[] = [
    {
      id: 'gemma-4-e2b-it',
      label: 'Gemma 4 E2B (multimodal)',
      url: mod?.GEMMA_4_E2B_IT ?? 'https://huggingface.co/litert-community/gemma-4-e2b-it/resolve/main/model.litertlm',
      sizeHint: '2.6 GB',
      notes: 'Best quality, needs ~6GB RAM',
    },
    {
      id: 'gemma-4-e4b-it',
      label: 'Gemma 4 E4B (higher quality)',
      url: mod?.GEMMA_4_E4B_IT ?? 'https://huggingface.co/litert-community/gemma-4-e4b-it/resolve/main/model.litertlm',
      sizeHint: '3.6 GB',
      notes: 'Sharper responses, higher RAM',
    },
    {
      id: 'gemma-3n-e2b-it-int4',
      label: 'Gemma 3n Int4 (fast, small)',
      url:
        mod?.GEMMA_3N_E2B_IT_INT4 ??
        'https://huggingface.co/litert-community/gemma-3n-e2b-it-int4/resolve/main/model.litertlm',
      sizeHint: '1.3 GB',
      notes: 'Smallest footprint, good for low memory',
    },
  ];

  cachedAvailableModels = models;
  return models;
}

async function resolveModelById(modelId?: string): Promise<LiteRtModelOption> {
  const models = await availableLiteRtModels();
  const fallback = models[0];
  if (!modelId) return fallback;
  return models.find((m) => m.id === modelId) ?? fallback;
}

export async function getLiteRtModelInfo(modelId?: string) {
  const model = await resolveModelById(modelId);
  const fileName = fileNameFromUrl(model.url);
  const { fs, path } = await resolveCachePath(fileName);

  if (!fs) {
    return {
      url: model.url,
      path,
      exists: false,
      size: undefined,
      model,
    };
  }

  const info = await fs.getInfoAsync(path);
  return {
    url: model.url,
    path,
    exists: info.exists && info.isDirectory === false,
    size: info.exists ? info.size : undefined,
    model,
  };
}

export async function downloadLiteRtModel(onProgress?: (progress: number) => void, modelId?: string) {
  const target = await resolveModelById(modelId);
  const { fs, dir, path } = await resolveCachePath(fileNameFromUrl(target.url));
  if (!fs) {
    throw new Error('LiteRT downloads are not supported in this environment');
  }

  try {
    await fs.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // directory likely already exists
  }

  const downloadTask = fs.createDownloadResumable(
    target.url,
    path,
    {},
    (progressEvent) => {
      const progress = progressEvent.totalBytesExpectedToWrite
        ? progressEvent.totalBytesWritten / progressEvent.totalBytesExpectedToWrite
        : 0;
      onProgress?.(progress);
    }
  );

  const result = await downloadTask.downloadAsync();
  if (!result?.uri) {
    throw new Error('LiteRT download failed');
  }
  onProgress?.(1);
  return result.uri;
}

export async function deleteLiteRtModel() {
  const info = await getLiteRtModelInfo();
  cachedInstance?.close?.();
  cachedInstance = null;
  cachedModelPath = null;

  const fs = await loadFileSystem();
  if (fs && info.exists) {
    await fs.deleteAsync(info.path, { idempotent: true });
  }
}

async function prepareLiteRtEngine(config: {
  systemPrompt: string;
  maxTokens: number;
  temperature?: number;
  modelId?: string;
}): Promise<PrepareEngineResult> {
  const mod = await loadLiteRtModule();
  if (!mod) return { reason: 'runtime-missing' as const };

  const fs = await loadFileSystem();
  if (!fs) return { reason: 'runtime-missing' as const };

  const info = await getLiteRtModelInfo(config.modelId);
  if (!info.exists) return { reason: 'model-missing' as const, path: info.path };

  if (!cachedInstance || cachedModelPath !== info.path) {
    cachedInstance?.close?.();
    cachedInstance = mod.createLLM();
    cachedModelPath = info.path;
  }

  const engine = cachedInstance;
  const backend = mod.getRecommendedBackend?.() ?? 'cpu';
  await engine.loadModel(info.path, {
    backend,
    systemPrompt: config.systemPrompt,
    maxTokens: Math.max(64, config.maxTokens),
    temperature: config.temperature ?? 0.35,
  });

  return { engine };
}

export async function runLiteRtCompletion(
  prompt: string,
  config: { systemPrompt: string; maxTokens: number; temperature?: number; modelId?: string }
): Promise<
  | { ok: true; text: string }
  | { ok: false; reason: 'runtime-missing' | 'model-missing' | 'inference-failed'; error?: string }
> {
  try {
    const prepared = await prepareLiteRtEngine(config);
    if (!('engine' in prepared)) {
      return { ok: false, reason: prepared.reason, error: prepared.path };
    }

    const text = await prepared.engine.sendMessage(prompt);
    return { ok: true, text };
  } catch (error) {
    return {
      ok: false,
      reason: 'inference-failed',
      error: error instanceof Error ? error.message : 'Unknown LiteRT error',
    };
  }
}
