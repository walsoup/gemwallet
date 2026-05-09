import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const root = '/home/runner/work/gemwallet/gemwallet';

const read = (p: string) => readFileSync(`${root}/${p}`, 'utf8');

describe('navigation component contracts', () => {
  it('bottom nav filters chat tab behind aiFeaturesEnabled and navigates on press', () => {
    const src = read('src/components/Navigation/CustomBottomNav.tsx');
    assert.match(src, /if \(r\.name === 'chat'\) return aiFeaturesEnabled/);
    assert.match(src, /navigation\.navigate\(route\.name, route\.params\)/);
  });

  it('top nav has no settings gear icon regression', () => {
    const src = read('src/components/Navigation/CustomTopNav.tsx');
    assert.doesNotMatch(src, /cog|settings/i);
    assert.match(src, /<Text[\s\S]*\{title\}/);
  });

  it('layout uses centralized ScreenLayout paddings and avoids nested PaperProvider', () => {
    const layout = read('src/components/Layout/ScreenLayout.tsx');
    const appLayout = read('app/_layout.tsx');
    assert.match(layout, /paddingTop: insets\.top \+ TOP_NAV_ESTIMATED_HEIGHT/);
    assert.match(layout, /paddingBottom: insets\.bottom \+ BOTTOM_NAV_ESTIMATED_HEIGHT/);
    assert.doesNotMatch(appLayout, /PaperProvider/);
  });
});
