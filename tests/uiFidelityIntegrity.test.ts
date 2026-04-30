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
    assert.match(layout, /<Tabs\.Screen\s+name="chat"/);
    assert.match(layout, /<Tabs\.Screen\s+name="planning"/);
    assert.match(layout, /<Tabs\.Screen\s+name="settings"/);
  });

  it('keeps critical home screen UI affordances', () => {
    const home = readWorkspaceFile('src/features/home/screens/HomeScreen.tsx');

    assert.match(home, /Total Balance/);
    assert.match(home, /Recent Transactions/);
    assert.match(home, /No transactions yet/);
  });

  it('avoids direct withTiming usage in plain tab icon styles', () => {
    const layout = readWorkspaceFile('app/_layout.tsx');

    assert.doesNotMatch(layout, /backgroundColor:\s*withTiming\(/);
    assert.doesNotMatch(layout, /borderColor:\s*withTiming\(/);
  });

  it('keeps theme provider dark palette and true-black override path', () => {
    const themeProvider = readWorkspaceFile('providers/AppThemeProvider.tsx');

    assert.match(themeProvider, /VELVET_DARK_COLORS/);
    assert.match(themeProvider, /isTrueBlack/);
    assert.match(themeProvider, /surfaceContainerLowest/);
  });
});
