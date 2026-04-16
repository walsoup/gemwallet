import { isFeatureEnabled } from '../config/featureFlags';

export type SyncMode = 'disabled' | 'local-only' | 'encrypted-cloud-replication';

export async function bootstrapSync(): Promise<SyncMode> {
  if (!isFeatureEnabled('encrypted_sync')) {
    return 'local-only';
  }

  return 'encrypted-cloud-replication';
}
