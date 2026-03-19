import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const packageJsonPath = resolve(root, 'packages/core/package.json');
const webZiweiPath = resolve(root, 'src/lib/divination/ziwei.ts');

test('core exposes browser-safe shared ziwei calculation via a dedicated subpath export', () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
        exports?: Record<string, unknown>;
    };

    assert.equal(
        typeof pkg.exports?.['./ziwei'],
        'object',
        'shared ziwei calculation should be reachable through @mingai/core/ziwei',
    );
});

test('shared ziwei module exposes sync calculator and astrolabe helper for web adapters', async () => {
    const sharedZiwei = await import('@mingai/core/ziwei');

    assert.equal(
        typeof sharedZiwei.calculateZiweiData,
        'function',
        'shared ziwei module should expose calculateZiweiData for web adapters',
    );
    assert.equal(
        typeof sharedZiwei.calculateZiweiDataWithAstrolabe,
        'function',
        'shared ziwei module should expose calculateZiweiDataWithAstrolabe for web adapters that need horoscope runtime data',
    );
    assert.equal(
        typeof sharedZiwei.calculateZiweiHoroscopeDataWithAstrolabe,
        'function',
        'shared ziwei module should expose calculateZiweiHoroscopeDataWithAstrolabe so web adapters do not keep local horoscope algorithms',
    );
    assert.equal(
        typeof sharedZiwei.calculateZiweiDecadalListWithAstrolabe,
        'function',
        'shared ziwei module should expose calculateZiweiDecadalListWithAstrolabe so web adapters do not keep local decadal extraction logic',
    );
});

test('web ziwei module reuses shared core instead of local iztro chart and horoscope calculation', () => {
    const source = readFileSync(webZiweiPath, 'utf8');

    assert.match(
        source,
        /from '@mingai\/core\/ziwei'/u,
        'web ziwei should reuse shared ziwei helpers from @mingai/core/ziwei',
    );
    assert.match(
        source,
        /calculateZiweiDataWithAstrolabe/u,
        'web ziwei should use shared calculateZiweiDataWithAstrolabe to keep chart data and horoscope runtime aligned',
    );
    assert.match(
        source,
        /output\.fourPillars\.year\.gan/u,
        'web ziwei should read structured four-pillar gan fields directly from shared core output',
    );
    assert.match(
        source,
        /output\.fourPillars\.year\.zhi/u,
        'web ziwei should read structured four-pillar zhi fields directly from shared core output',
    );
    assert.match(
        source,
        /calculateZiweiHoroscopeDataWithAstrolabe/u,
        'web ziwei should use shared calculateZiweiHoroscopeDataWithAstrolabe so horoscope rules stay in core',
    );
    assert.match(
        source,
        /calculateZiweiDecadalListWithAstrolabe/u,
        'web ziwei should use shared calculateZiweiDecadalListWithAstrolabe so decadal extraction rules stay in core',
    );
    assert.doesNotMatch(
        source,
        /from 'iztro'/u,
        'web ziwei should not import iztro directly once shared core is the source of truth',
    );
    assert.doesNotMatch(
        source,
        /astro\.bySolar|astro\.byLunar/u,
        'web ziwei should not construct astrolabe directly once shared core owns the calculation path',
    );
    assert.doesNotMatch(
        source,
        /rawAstrolabe\.horoscope\(/u,
        'web ziwei should not call rawAstrolabe.horoscope directly once shared core owns horoscope rules',
    );
    assert.doesNotMatch(
        source,
        /rawAstrolabe\.palaces as any\[\]/u,
        'web ziwei should not walk raw astrolabe palaces directly once core owns decadal extraction',
    );
    assert.doesNotMatch(
        source,
        /function getFiveElementStartAge/u,
        'web ziwei should not keep a low-precision decadal fallback once complete shared data is required',
    );
    assert.doesNotMatch(
        source,
        /slice\?\.?\(0,\s*1\)|slice\?\.?\(1,\s*2\)/u,
        'web ziwei should not split four-pillar strings locally once core exposes structured fields',
    );
});
