import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const packageJsonPath = resolve(root, 'packages/mcp-core/package.json');
const webBaziPath = resolve(root, 'src/lib/divination/bazi.ts');
const diZhiRelationsPath = resolve(root, 'src/components/bazi/result/DiZhiRelations.tsx');
const professionalTablePath = resolve(root, 'src/components/bazi/result/ProfessionalTable.tsx');
const liuYueTablePath = resolve(root, 'src/components/bazi/result/LiuYueTable.tsx');
const baziResultPagePath = resolve(root, 'src/app/bazi/result/page.tsx');

test('mcp-core exposes browser-safe shared bazi utilities via a dedicated subpath export', () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
        exports?: Record<string, unknown>;
    };

    assert.equal(
        typeof pkg.exports?.['./utils'],
        'object',
        'shared bazi helpers should be reachable through @mingai/mcp-core/utils',
    );
});

test('mcp-core exposes browser-safe shared dayun calculation via a dedicated subpath export', () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
        exports?: Record<string, unknown>;
    };

    assert.equal(
        typeof pkg.exports?.['./dayun'],
        'object',
        'shared dayun calculation should be reachable through @mingai/mcp-core/dayun',
    );
});

test('mcp-core exposes browser-safe shared bazi calculation via a dedicated subpath export', () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
        exports?: Record<string, unknown>;
    };

    assert.equal(
        typeof pkg.exports?.['./bazi'],
        'object',
        'shared bazi calculation should be reachable through @mingai/mcp-core/bazi',
    );
});

test('shared bazi module exposes fortune shensha helper for web adapters', async () => {
    const sharedBazi = await import('@mingai/mcp-core/bazi');

    assert.equal(
        typeof sharedBazi.calculateBaziFortuneShenSha,
        'function',
        'shared bazi module should expose calculateBaziFortuneShenSha for web fortune-column adapters',
    );
    assert.equal(
        typeof sharedBazi.calculateBaziLiuYueData,
        'function',
        'shared bazi module should expose calculateBaziLiuYueData for web liuyue adapters',
    );
    assert.equal(
        typeof sharedBazi.calculateBaziLiuRiData,
        'function',
        'shared bazi module should expose calculateBaziLiuRiData for web liuri adapters',
    );
    assert.equal(
        typeof sharedBazi.calculateBaziFiveElementsStats,
        'function',
        'shared bazi module should expose calculateBaziFiveElementsStats for web chart adapters',
    );
    assert.equal(
        typeof sharedBazi.calculateBaziShenShaData,
        'function',
        'shared bazi module should expose calculateBaziShenShaData for web shensha adapters',
    );
});

test('web bazi module imports shared primitive rules from mcp-core instead of redefining them locally', () => {
    const source = readFileSync(webBaziPath, 'utf8');

    assert.match(
        source,
        /from '@mingai\/mcp-core\/utils'/u,
        'web bazi should reuse shared ganzhi helpers from @mingai/mcp-core/utils',
    );
    assert.match(
        source,
        /from '@mingai\/mcp-core\/data\/shensha-data'/u,
        'web bazi should reuse shared static rule tables from @mingai/mcp-core/data/shensha-data',
    );
    assert.match(
        source,
        /from '@mingai\/mcp-core\/dayun'/u,
        'web bazi should reuse shared dayun calculation from @mingai/mcp-core/dayun',
    );
    assert.match(
        source,
        /from '@mingai\/mcp-core\/bazi'/u,
        'web bazi should reuse shared bazi calculation from @mingai/mcp-core/bazi',
    );
    assert.match(
        source,
        /calculateBaziLiuYueData/u,
        'web bazi should reuse shared bazi liuyue helpers from @mingai/mcp-core/bazi',
    );
    assert.match(
        source,
        /calculateBaziLiuRiData/u,
        'web bazi should reuse shared bazi liuri helpers from @mingai/mcp-core/bazi',
    );
    assert.match(
        source,
        /calculateBaziFiveElementsStats/u,
        'web bazi should reuse shared bazi five-element aggregation from @mingai/mcp-core/bazi',
    );
    assert.match(
        source,
        /calculateBaziShenShaData/u,
        'web bazi should reuse shared full shensha payload helpers from @mingai/mcp-core/bazi',
    );
    assert.doesNotMatch(
        source,
        /const XUN_KONG: Record<string, EarthlyBranch\[\]>/u,
        'web bazi should not keep a second local xunkong truth table',
    );
    assert.doesNotMatch(
        source,
        /getDayJiShen|getDayXiongSha|getDayYi|getDayJi/u,
        'web bazi should not reconstruct daily shensha payload locally once core owns the full payload',
    );
    assert.doesNotMatch(
        source,
        /ln\.ganZhi\[0\]|ln\.ganZhi\[1\]/u,
        'web bazi professional-data adapter should not split liunian ganZhi locally once core exposes gan/zhi',
    );
    assert.doesNotMatch(
        source,
        /export function getNaYin|export function getDiShi|export function calculateFortuneShenSha|export function getKongWang/u,
        'web bazi should not keep legacy runtime helper exports once shared payloads are complete',
    );
    const eightCharUsages = source.match(/getEightChar\(/gu) ?? [];
    assert.ok(
        eightCharUsages.length <= 1,
        'web bazi should keep at most one local getEightChar path for bazi-specific shensha only',
    );
});

test('bazi relations UI consumes shared chart relations instead of recomputing local rule tables', () => {
    const source = readFileSync(diZhiRelationsPath, 'utf8');

    assert.match(
        source,
        /relations:/u,
        'DiZhiRelations should accept precomputed relations from shared chart data',
    );
    assert.doesNotMatch(
        source,
        /const LIU_HE: Record<string, string>/u,
        'DiZhiRelations should not keep a local liuhe rule table once core owns relation data',
    );
    assert.doesNotMatch(
        source,
        /const SAN_HE:/u,
        'DiZhiRelations should not keep a local sanhe rule table once core owns relation data',
    );
    assert.doesNotMatch(
        source,
        /const LIU_CHONG: Record<string, string>/u,
        'DiZhiRelations should not keep a local liuchong rule table once core owns relation data',
    );
});

test('bazi professional table consumes full runtime data instead of recalculating fortune metadata locally', () => {
    const source = readFileSync(professionalTablePath, 'utf8');

    assert.doesNotMatch(
        source,
        /calculateTenGod|getNaYin|getDiShi|calculateFortuneShenSha|getKongWang/u,
        'ProfessionalTable should not recalculate ten-god, nayin, dishi, shensha, or kongwang once full data is provided',
    );
    assert.doesNotMatch(
        source,
        /HIDDEN_STEMS/u,
        'ProfessionalTable should not rebuild hidden stems locally once full data is provided',
    );
    assert.match(
        source,
        /baziResult\.kongWang/u,
        'ProfessionalTable should consume chart-level kongwang from the shared chart payload',
    );
    assert.match(
        source,
        /naYin:\s*activeDaYun\.naYin/u,
        'ProfessionalTable should consume full dayun payload fields directly',
    );
});

test('bazi liuyue table consumes direct gan-zhi fields from shared runtime payload', () => {
    const source = readFileSync(liuYueTablePath, 'utf8');

    assert.match(
        source,
        /ly\.gan/u,
        'LiuYueTable should consume the direct gan field from liuyue payload',
    );
    assert.match(
        source,
        /ly\.zhi/u,
        'LiuYueTable should consume the direct zhi field from liuyue payload',
    );
    assert.doesNotMatch(
        source,
        /ly\.ganZhi\[0\]|ly\.ganZhi\[1\]/u,
        'LiuYueTable should not split ganZhi locally once shared payload exposes gan/zhi',
    );
});

test('bazi result page passes natal context into liuyue and liuri calculation so web consumes full returned data', () => {
    const source = readFileSync(baziResultPagePath, 'utf8');

    assert.match(
        source,
        /calculateLiuYue\(selectedLiuNianYear,\s*formData\)/u,
        'bazi result page should pass formData into liuyue calculation for full runtime data',
    );
    assert.match(
        source,
        /calculateLiuRi\(activeLiuYue\.startDate,\s*activeLiuYue\.endDate,\s*formData\)/u,
        'bazi result page should pass formData into liuri calculation for full runtime data',
    );
});

test('shared bazi utils keep classical day-stem dishi rules for yin stems', async () => {
    const sharedUtils = await import('@mingai/mcp-core/utils');

    assert.equal(
        typeof sharedUtils.getDiShi,
        'function',
        'shared utils should expose getDiShi for cross-end reuse',
    );
    assert.equal(sharedUtils.getDiShi('乙', '午'), '长生');
    assert.equal(sharedUtils.getDiShi('乙', '寅'), '帝旺');
});
