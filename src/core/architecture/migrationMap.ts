export type MigrationMapEntry = {
  legacyPath: string;
  targetPath: string;
  domain: 'onboarding' | 'wealth' | 'ledger' | 'categories' | 'settings' | 'nlp' | 'ui-shell';
  notes: string;
};

export const migrationMap: MigrationMapEntry[] = [
  {
    legacyPath: 'app/index.tsx',
    targetPath: 'src/features/home/screens/HomeScreen.tsx',
    domain: 'ui-shell',
    notes: 'Route file remains composition-only; feature screen hosts current behavior during migration.',
  },
  {
    legacyPath: 'app/settings.tsx',
    targetPath: 'src/features/settings/screens/SettingsScreen.tsx',
    domain: 'settings',
    notes: 'Settings route moved behind feature module boundary.',
  },
  {
    legacyPath: 'store/useTransactionStore.ts',
    targetPath: 'src/core/db/repositories.ts',
    domain: 'ledger',
    notes: 'Legacy store treated as compatibility layer until SQLite/Drizzle rollout is enabled.',
  },
  {
    legacyPath: 'store/useSettingsStore.ts',
    targetPath: 'src/core/config/featureFlags.ts',
    domain: 'settings',
    notes: 'Zustand remains for UI-ephemeral state and rollout control.',
  },
  {
    legacyPath: 'providers/AppThemeProvider.tsx',
    targetPath: 'src/core/theme/themeContract.ts',
    domain: 'ui-shell',
    notes: 'Paper/Monet theming remains compatible while elite theme contract is introduced.',
  },
];
