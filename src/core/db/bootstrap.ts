import { isFeatureEnabled } from '../config/featureFlags';

export async function bootstrapDatabase(): Promise<'legacy-async-storage' | 'sqlite-drizzle'> {
  if (isFeatureEnabled('sqlite_domain_store')) {
    return 'sqlite-drizzle';
  }

  return 'legacy-async-storage';
}
