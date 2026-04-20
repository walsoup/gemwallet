import type { CurrencyCode, LanguageCode, RegionCode, ThemePreference } from '../types/finance';

export type AiProvider = 'google' | 'huggingface';

export type SettingsPersistedShape = {
  themePreference: ThemePreference;
  oledTrueBlackEnabled: boolean;
  highContrastEnabled: boolean;
  themePrimary: string;
  themeSecondary: string;
  secureAccessEnabled: boolean;
  passcodeEnabled: boolean;
  passcodePin: string;
  currencyCode: CurrencyCode;
  language: LanguageCode;
  region: RegionCode;
  aiProvider: AiProvider;
  geminiApiKey: string;
  huggingFaceToken: string;
  gemmaModel: string;
  localModelId: string;
  localModelDownloaded: boolean;
  smartCategorizationEnabled: boolean;
  advancedSummariesEnabled: boolean;
  includeNotesInExport: boolean;
  setupCoachDismissed: boolean;
  backupConfigured: boolean;
};

export const defaultSettingsState: SettingsPersistedShape = {
  themePreference: 'dark',
  oledTrueBlackEnabled: true,
  highContrastEnabled: false,
  secureAccessEnabled: false,
  passcodeEnabled: false,
  passcodePin: '',
  currencyCode: 'USD',
  language: 'en-US',
  region: 'US',
  aiProvider: 'google',
  themePrimary: '#ff6b6b',
  themeSecondary: '#52dea2',
  geminiApiKey: '',
  huggingFaceToken: '',
  gemmaModel: 'gemma-4-31b-it',
  localModelId: 'gemma-4-e2b-it',
  localModelDownloaded: false,
  smartCategorizationEnabled: true,
  advancedSummariesEnabled: false,
  includeNotesInExport: true,
  setupCoachDismissed: false,
  backupConfigured: false,
};

export function migrateSettingsState(persistedState: unknown): SettingsPersistedShape {
  if (!persistedState || typeof persistedState !== 'object') return defaultSettingsState;

  const legacy = persistedState as Partial<SettingsPersistedShape>;
  const aiProvider = legacy.aiProvider === 'huggingface' ? 'huggingface' : 'google';

  return {
    ...defaultSettingsState,
    ...legacy,
    aiProvider,
    themePrimary: legacy.themePrimary ?? defaultSettingsState.themePrimary,
    themeSecondary: legacy.themeSecondary ?? defaultSettingsState.themeSecondary,
    geminiApiKey: legacy.geminiApiKey ?? '',
    huggingFaceToken: legacy.huggingFaceToken ?? '',
    gemmaModel: legacy.gemmaModel ?? defaultSettingsState.gemmaModel,
    localModelId: legacy.localModelId ?? defaultSettingsState.localModelId,
    localModelDownloaded: legacy.localModelDownloaded ?? defaultSettingsState.localModelDownloaded,
    smartCategorizationEnabled:
      legacy.smartCategorizationEnabled ?? defaultSettingsState.smartCategorizationEnabled,
    currencyCode: legacy.currencyCode ?? defaultSettingsState.currencyCode,
    language: legacy.language ?? defaultSettingsState.language,
    region: legacy.region ?? defaultSettingsState.region,
    passcodeEnabled: legacy.passcodeEnabled ?? defaultSettingsState.passcodeEnabled,
    passcodePin: legacy.passcodePin ?? defaultSettingsState.passcodePin,
    advancedSummariesEnabled:
      legacy.advancedSummariesEnabled ?? defaultSettingsState.advancedSummariesEnabled,
    includeNotesInExport: legacy.includeNotesInExport ?? defaultSettingsState.includeNotesInExport,
    setupCoachDismissed: legacy.setupCoachDismissed ?? defaultSettingsState.setupCoachDismissed,
    backupConfigured: legacy.backupConfigured ?? defaultSettingsState.backupConfigured,
  };
}
