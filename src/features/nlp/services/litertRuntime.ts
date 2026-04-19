const dynamicImport = new Function('id', 'return import(id);') as <T>(id: string) => Promise<T>;

const DEFAULT_MODEL_URL =
  'https://huggingface.co/litert-community/gemma-3n-e2b-it-int4/resolve/main/model.litertlm';

type FileSystemModule = typeof import('expo-file-system');
type LiteRtModule = typeof import('react-native-litert-lm');
type LiteRtInstance = ReturnType<LiteRtModule['createLLM']>;

let cachedFileSystem: FileSystemModule | null = null;
let cachedModule: LiteRtModule | null = null;
let cachedInstance: LiteRtInstance | null = null;
let cachedModelPath: string | null = null;

async function loadFileSystem(): Promise<FileSystemModule | null> {
  if (cachedFileSystem) return cachedFileSystem;
  try {
    cachedFileSystem = (await dynamicImport<FileSystemModule>('expo-file-system')) as FileSystemModule;
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

async function resolveModelUrl() {
  const mod = await loadLiteRtModule();
  return mod?.GEMMA_3N_E2B_IT_INT4 ?? DEFAULT_MODEL_URL;
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

export async function getLiteRtModelInfo() {
  const modelUrl = await resolveModelUrl();
  const fileName = fileNameFromUrl(modelUrl);
  const { fs, path } = await resolveCachePath(fileName);

  if (!fs) {
    return {
      url: modelUrl,
      path,
      exists: false,
      size: undefined,
    };
  }

  const info = await fs.getInfoAsync(path);
  return {
    url: modelUrl,
    path,
    exists: info.exists && info.isFile,
    size: info.size,
  };
}

export async function downloadLiteRtModel(onProgress?: (progress: number) => void) {
  const { fs, dir, path } = await resolveCachePath(fileNameFromUrl(await resolveModelUrl()));
  if (!fs) {
    throw new Error('LiteRT downloads are not supported in this environment');
  }

  try {
    await fs.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // directory likely already exists
  }

  const downloadTask = fs.createDownloadResumable(
    await resolveModelUrl(),
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
}) {
  const mod = await loadLiteRtModule();
  if (!mod) return { reason: 'runtime-missing' as const };

  const fs = await loadFileSystem();
  if (!fs) return { reason: 'runtime-missing' as const };

  const info = await getLiteRtModelInfo();
  if (!info.exists) return { reason: 'model-missing' as const, path: info.path };

  if (!cachedInstance || cachedModelPath !== info.path) {
    cachedInstance?.close?.();
    cachedInstance = mod.createLLM();
    cachedModelPath = info.path;
  }

  const backend = mod.getRecommendedBackend?.() ?? 'cpu';
  await cachedInstance.loadModel(info.path, {
    backend,
    systemPrompt: config.systemPrompt,
    maxTokens: Math.max(64, config.maxTokens),
    temperature: config.temperature ?? 0.35,
  });

  return { engine: cachedInstance };
}

export async function runLiteRtCompletion(
  prompt: string,
  config: { systemPrompt: string; maxTokens: number; temperature?: number }
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
