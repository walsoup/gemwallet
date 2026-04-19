import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

function readWorkspaceFile(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('UI fidelity and integrity contracts', () => {
  it('keeps the expected tab routes in root layout', () => {
    const layout = readWorkspaceFile('app/_layout.tsx');

    assert.match(layout, /<Tabs\.Screen\s+name="index"/);
    assert.match(layout, /<Tabs\.Screen\s+name="analytics"/);
    assert.match(layout, /<Tabs\.Screen\s+name="planning"/);
    assert.match(layout, /<Tabs\.Screen\s+name="settings"/);
  });

  it('keeps critical home screen UI affordances', () => {
    const home = readWorkspaceFile('src/features/home/screens/HomeScreen.tsx');

    assert.match(home, /Available Cash/);
    assert.match(home, /placeholder="Search transactions"/);
    assert.match(home, /icon="robot-outline"/);
    assert.match(home, /AI analysis/);
    assert.match(home, /Pick a category to save instantly/);
    assert.match(home, /AI Assistant/);
  });

  it('keeps theme provider dark palette and true-black override path', () => {
    const themeProvider = readWorkspaceFile('providers/AppThemeProvider.tsx');

    assert.match(themeProvider, /VELVET_DARK_COLORS/);
    assert.match(themeProvider, /isTrueBlack/);
    assert.match(themeProvider, /surfaceContainerLowest/);
  });
});
