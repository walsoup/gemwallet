import type { CurrencyCode, LanguageCode, RegionCode, ThemePreference } from '../types/finance';

export type AiProvider = 'local' | 'google' | 'huggingface';

export type SettingsPersistedShape = {
  themePreference: ThemePreference;
  oledTrueBlackEnabled: boolean;
  highContrastEnabled: boolean;
  themePrimary: string;
  themeSecondary: string;
  secureAccessEnabled: boolean;
  biometricAuthEnabled: boolean;
  notificationsTransactionAlerts: boolean;
  notificationsWeeklySummary: boolean;
  notificationsSavingsGoalProgress: boolean;
  notificationsBudgetWarnings: boolean;
  passcodeEnabled: boolean;
  passcodePin: string;
  currencyCode: CurrencyCode;
  language: LanguageCode;
  region: RegionCode;
  aiProvider: AiProvider;
  aiFeaturesEnabled: boolean;
  huggingFaceToken: string;
  gemmaModel: string;
  localModelId: string;
  localModelDownloaded: boolean;
  smartCategorizationEnabled: boolean;
  advancedSummariesEnabled: boolean;
  includeNotesInExport: boolean;
  setupCoachDismissed: boolean;
  backupConfigured: boolean;
  customGreetingName: string;
};

export const defaultSettingsState: SettingsPersistedShape = {
  themePreference: 'dark',
  oledTrueBlackEnabled: true,
  highContrastEnabled: false,
  secureAccessEnabled: false,
  biometricAuthEnabled: false,
  notificationsTransactionAlerts: true,
  notificationsWeeklySummary: true,
  notificationsSavingsGoalProgress: true,
  notificationsBudgetWarnings: true,
  passcodeEnabled: false,
  passcodePin: '',
  currencyCode: 'USD',
  language: 'en-US',
  region: 'US',
  aiProvider: 'google',
  themePrimary: '#ff6b6b',
  themeSecondary: '#52dea2',
  aiFeaturesEnabled: false,
  huggingFaceToken: '',
  gemmaModel: 'gemma-4-31b-it',
  localModelId: 'gemma-4-e2b-it',
  localModelDownloaded: false,
  smartCategorizationEnabled: true,
  advancedSummariesEnabled: false,
  includeNotesInExport: true,
  setupCoachDismissed: false,
  backupConfigured: false,
  customGreetingName: '',
};

export function migrateSettingsState(persistedState: unknown): SettingsPersistedShape {
  if (!persistedState || typeof persistedState !== 'object') return defaultSettingsState;

  const legacy = persistedState as Partial<SettingsPersistedShape>;
  const legacyAiProvider = (legacy as { aiProvider?: string }).aiProvider;
  const aiProvider: AiProvider =
    legacyAiProvider === 'huggingface'
      ? 'huggingface'
      : legacyAiProvider === 'google'
        ? 'google'
        : legacyAiProvider === 'local'
          ? defaultSettingsState.aiProvider
          : defaultSettingsState.aiProvider;

  return {
    ...defaultSettingsState,
    ...legacy,
    aiProvider,
    themePrimary: legacy.themePrimary ?? defaultSettingsState.themePrimary,
    themeSecondary: legacy.themeSecondary ?? defaultSettingsState.themeSecondary,
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
    biometricAuthEnabled: (legacy as Partial<SettingsPersistedShape>).biometricAuthEnabled ?? defaultSettingsState.biometricAuthEnabled,
    notificationsTransactionAlerts:
      (legacy as Partial<SettingsPersistedShape>).notificationsTransactionAlerts ??
      defaultSettingsState.notificationsTransactionAlerts,
    notificationsWeeklySummary:
      (legacy as Partial<SettingsPersistedShape>).notificationsWeeklySummary ??
      defaultSettingsState.notificationsWeeklySummary,
    notificationsSavingsGoalProgress:
      (legacy as Partial<SettingsPersistedShape>).notificationsSavingsGoalProgress ??
      defaultSettingsState.notificationsSavingsGoalProgress,
    notificationsBudgetWarnings:
      (legacy as Partial<SettingsPersistedShape>).notificationsBudgetWarnings ??
      defaultSettingsState.notificationsBudgetWarnings,
    advancedSummariesEnabled:
      legacy.advancedSummariesEnabled ?? defaultSettingsState.advancedSummariesEnabled,
    includeNotesInExport: legacy.includeNotesInExport ?? defaultSettingsState.includeNotesInExport,
    setupCoachDismissed: legacy.setupCoachDismissed ?? defaultSettingsState.setupCoachDismissed,
    backupConfigured: legacy.backupConfigured ?? defaultSettingsState.backupConfigured,
    customGreetingName: legacy.customGreetingName ?? defaultSettingsState.customGreetingName,
  };
}
