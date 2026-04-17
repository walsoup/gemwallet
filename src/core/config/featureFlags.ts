export type FeatureFlagKey =
  | 'elite_ui_foundations'
  | 'sqlite_domain_store'
  | 'flashlist_ledger'
  | 'encrypted_sync'
  | 'on_device_ai_bridge';

export type FeatureFlagState = Record<FeatureFlagKey, boolean>;

export const featureFlags: FeatureFlagState = {
  elite_ui_foundations: false,
  sqlite_domain_store: false,
  flashlist_ledger: false,
  encrypted_sync: false,
  on_device_ai_bridge: false,
};

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return featureFlags[flag];
}
