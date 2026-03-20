import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { calculateBazi, generateBaziChartText } from '@/lib/divination/bazi';
import { calculateZiwei, generateZiweiChartText } from '@/lib/divination/ziwei';
import { buildTraditionalInfo } from '@/lib/divination/liuyao-format-utils';
import { findHexagram, type Yao, calculateDerivedHexagrams, calculateGuaShen } from '@/lib/divination/liuyao';
import { drawForSpread, generateTarotReadingText } from '@/lib/divination/tarot';

const qimenRoutePath = resolve(process.cwd(), 'src/app/api/qimen/route.ts');
const qimenResultPath = resolve(process.cwd(), 'src/app/qimen/result/page.tsx');
const tarotResultPath = resolve(process.cwd(), 'src/app/tarot/result/page.tsx');
const tarotRoutePath = resolve(process.cwd(), 'src/app/api/tarot/route.ts');
const tarotHistoryRegistryPath = resolve(process.cwd(), 'src/lib/history/registry.ts');
const baziProfessionalSectionPath = resolve(process.cwd(), 'src/components/bazi/result/ProfessionalSection.tsx');
const ziweiResultPath = resolve(process.cwd(), 'src/app/ziwei/result/page.tsx');
const ziweiGridPath = resolve(process.cwd(), 'src/components/ziwei/ZiweiChartGrid.tsx');
const ziweiStarBadgePath = resolve(process.cwd(), 'src/components/ziwei/StarBadge.tsx');
const baziLibPath = resolve(process.cwd(), 'src/lib/divination/bazi.ts');
const ziweiLibPath = resolve(process.cwd(), 'src/lib/divination/ziwei.ts');
const liuyaoTraditionalPath = resolve(process.cwd(), 'src/components/liuyao/TraditionalAnalysis.tsx');
const qimenSharedPath = resolve(process.cwd(), 'src/lib/divination/qimen-shared.ts');
const qimenGridPath = resolve(process.cwd(), 'src/components/qimen/QimenGrid.tsx');
const daliurenTextPath = resolve(process.cwd(), 'src/lib/divination/daliuren.ts');
const daliurenResultPath = resolve(process.cwd(), 'src/app/daliuren/result/page.tsx');
const mcpFormatterPath = resolve(process.cwd(), 'packages/core/src/formatters.ts');

test('qimen interpret prompt should not prepend a duplicate question block outside the shared chart text', async () => {
    const source = await readFile(qimenRoutePath, 'utf-8');

    assert.doesNotMatch(
        source,
        /【占事】/u,
        'qimen route should let the shared formatter own the question line instead of duplicating it in userPrompt',
    );
});

test('bazi shared chart text should include core-aligned metadata that is currently missing from web output', () => {
    const chart = calculateBazi({
        name: '测试',
        gender: 'male',
        birthYear: 1990,
        birthMonth: 1,
        birthDay: 1,
        birthHour: 12,
        birthMinute: 0,
        birthPlace: '上海',
        longitude: 121.47,
        calendarType: 'solar',
    });

    const text = generateBaziChartText(chart);

    assert.match(text, /命主五行/u, 'bazi text should expose day-master element summary');
    assert.match(text, /真太阳时/u, 'bazi text should expose true solar time info when core provides it');
    assert.match(text, /胎元/u, 'bazi text should expose taiYuan when core provides it');
    assert.match(text, /命宫/u, 'bazi text should expose mingGong when core provides it');
    assert.match(text, /天干冲克/u, 'bazi text should expose tianGanChongKe summary');
    assert.match(text, /地支三会/u, 'bazi text should expose diZhiSanHui summary');
    assert.match(text, /天干五合/u, 'bazi text should expose tianGanWuHe summary');
    assert.match(text, /地支半合/u, 'bazi text should expose diZhiBanHe summary');
});

test('bazi chart text should include naYin/diShi and hidden stem qiType details', () => {
    const chart = calculateBazi({
        name: '测试',
        gender: 'male',
        birthYear: 1990,
        birthMonth: 1,
        birthDay: 1,
        birthHour: 12,
        birthMinute: 0,
        birthPlace: '上海',
        longitude: 121.47,
        calendarType: 'solar',
    });

    const text = generateBaziChartText(chart);
    const qiType = chart.fourPillars.year.hiddenStemDetails?.[0]?.qiType;

    assert.ok(qiType, 'bazi hidden stem details should include qiType from core output');
    assert.match(text, /纳音/u, 'bazi text should include naYin markers for pillars');
    assert.match(text, /地势/u, 'bazi text should include diShi markers for pillars');
    assert.match(text, new RegExp(qiType), 'bazi text should surface hidden stem qiType');
});

test('web divination adapters should use explicit longitude instead of local fuzzy place matching', async () => {
    const [baziSource, ziweiSource] = await Promise.all([
        readFile(baziLibPath, 'utf-8'),
        readFile(ziweiLibPath, 'utf-8'),
    ]);

    assert.doesNotMatch(baziSource, /place-longitude/u);
    assert.doesNotMatch(ziweiSource, /place-longitude/u);

    const baziChart = calculateBazi({
        name: '测试',
        gender: 'male',
        birthYear: 1990,
        birthMonth: 1,
        birthDay: 1,
        birthHour: 12,
        birthMinute: 0,
        calendarType: 'solar',
        longitude: 121.47,
    } as Parameters<typeof calculateBazi>[0] & { longitude: number });

    const ziweiChart = calculateZiwei({
        name: '测试',
        gender: 'male',
        birthYear: 1990,
        birthMonth: 1,
        birthDay: 1,
        birthHour: 12,
        birthMinute: 0,
        calendarType: 'solar',
        longitude: 121.47,
    } as Parameters<typeof calculateZiwei>[0] & { longitude: number });

    assert.equal(baziChart.trueSolarTimeInfo?.longitude, 121.47);
    assert.equal(ziweiChart.trueSolarTimeInfo?.longitude, 121.47);
});

test('bazi professional section should render a direct chart metadata block for the newly aligned core fields', async () => {
    const source = await readFile(baziProfessionalSectionPath, 'utf-8');

    assert.match(
        source,
        /排盘元信息/u,
        'bazi professional section should present a dedicated metadata section for core-aligned chart fields',
    );
    assert.match(
        source,
        /真太阳时|胎元|命宫|天干五合|地支半合|干支关系|地支关系/u,
        'bazi professional section should surface core-aligned metadata directly in the UI',
    );
});

test('ziwei web contract and copy text should preserve richer core metadata and stable palace ordering', () => {
    const chart = calculateZiwei({
        name: '测试',
        gender: 'male',
        birthYear: 1990,
        birthMonth: 1,
        birthDay: 1,
        birthHour: 12,
        birthMinute: 0,
        calendarType: 'solar',
    });

    assert.ok(typeof (chart as Record<string, unknown>).douJun === 'string', 'ziwei chart should preserve douJun from core output');
    assert.ok(typeof (chart as Record<string, unknown>).lifeMasterStar === 'string', 'ziwei chart should preserve lifeMasterStar from core output');
    assert.ok(typeof (chart as Record<string, unknown>).bodyMasterStar === 'string', 'ziwei chart should preserve bodyMasterStar from core output');
    assert.ok(Array.isArray((chart as Record<string, unknown>).smallLimit), 'ziwei chart should preserve smallLimit from core output');
    assert.ok(Array.isArray((chart as Record<string, unknown>).scholarStars), 'ziwei chart should preserve scholarStars from core output');

    const text = generateZiweiChartText(chart);
    assert.match(text, /子年斗君/u, 'ziwei text should include douJun');
    assert.match(text, /命主星/u, 'ziwei text should include life master star');
    assert.match(text, /身主星/u, 'ziwei text should include body master star');
    assert.match(text, /小限/u, 'ziwei text should include smallLimit summary');
    assert.match(text, /博士十二星/u, 'ziwei text should include scholar stars summary');

    const headingLines = text
        .split('\n')
        .filter((line) => line.startsWith('### '))
        .slice(0, 6);
    assert.deepEqual(
        headingLines.map((line) => line.replace(/^### /u, '').split('（')[0]),
        ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄'],
        'ziwei text should render palace sections in the traditional reading order instead of raw storage order',
    );
});

test('ziwei result page should surface richer aligned metadata directly in the visible UI', async () => {
    const [pageSource, gridSource] = await Promise.all([
        readFile(ziweiResultPath, 'utf-8'),
        readFile(ziweiGridPath, 'utf-8'),
    ]);

    assert.match(pageSource, /命主星|身主星|斗君|真太阳时/u);
    assert.match(gridSource, /博士十二星|小限|神煞|流年/u);
});

test('ziwei star mutagen variants should be surfaced in text and UI', async () => {
    const chart = calculateZiwei({
        name: '测试',
        gender: 'male',
        birthYear: 1990,
        birthMonth: 1,
        birthDay: 1,
        birthHour: 12,
        birthMinute: 0,
        calendarType: 'solar',
    });

    const palace = chart.palaces[0];
    if (palace?.majorStars?.[0]) {
        palace.majorStars[0].selfMutagen = '禄';
        palace.majorStars[0].oppositeMutagen = '权';
    }

    const text = generateZiweiChartText(chart);
    assert.match(text, /↓禄/u, 'ziwei text should include self mutagen markers');
    assert.match(text, /↑权/u, 'ziwei text should include opposite mutagen markers');

    const badgeSource = await readFile(ziweiStarBadgePath, 'utf-8');
    assert.match(badgeSource, /selfMutagen|oppositeMutagen/u, 'ziwei star badge should render self/opposite mutagen markers');
});

test('liuyao prompt should include derived hexagrams and gua shen', () => {
    const hexagram = findHexagram('111111');
    assert.ok(hexagram, 'hexagram should exist for testing');

    const yaos: Yao[] = Array.from({ length: 6 }, (_, index) => ({
        type: 1,
        change: 'stable',
        position: index + 1,
    }));

    const text = buildTraditionalInfo(
        yaos,
        '111111',
        undefined,
        '测试问题',
        new Date('2026-01-01T00:00:00Z'),
        ['父母'],
        hexagram!,
    );

    assert.match(text, /互卦/u, 'liuyao prompt should include nuclear hexagram');
    assert.match(text, /错卦/u, 'liuyao prompt should include opposite hexagram');
    assert.match(text, /综卦/u, 'liuyao prompt should include reversed hexagram');
    assert.match(text, /卦身/u, 'liuyao prompt should include gua shen');
    assert.doesNotMatch(text, /互卦：无/u, 'liuyao prompt should resolve nuclear hexagram instead of placeholder');
    assert.doesNotMatch(text, /错卦：无/u, 'liuyao prompt should resolve opposite hexagram instead of placeholder');
    assert.doesNotMatch(text, /综卦：无/u, 'liuyao prompt should resolve reversed hexagram instead of placeholder');
    assert.doesNotMatch(text, /卦身：无/u, 'liuyao prompt should resolve gua shen instead of placeholder');
});

test('liuyao derived helpers should handle invalid hexagram codes defensively', () => {
    const derived = calculateDerivedHexagrams('');
    assert.equal(Object.keys(derived).length, 0, 'invalid hexagram code should not yield derived results');

    const guaShen = calculateGuaShen('');
    assert.equal(guaShen.absent, true, 'invalid hexagram code should return an absent gua shen');
});

test('liuyao traditional analysis UI should surface derived hexagrams and gua shen', async () => {
    const source = await readFile(liuyaoTraditionalPath, 'utf-8');
    assert.match(source, /互卦|错卦|综卦|卦身/u);
});

test('qimen prompt + ui should surface star/gate elements and palace element state', async () => {
    const [sharedSource, gridSource, pageSource] = await Promise.all([
        readFile(qimenSharedPath, 'utf-8'),
        readFile(qimenGridPath, 'utf-8'),
        readFile(qimenResultPath, 'utf-8'),
    ]);

    assert.match(sharedSource, /星五行|门五行|宫五行/u, 'qimen shared text should include star/gate elements and palace element state');
    assert.match(gridSource, /starElement|gateElement|elementState/u, 'qimen grid should display star/gate elements and palace element state');
    assert.match(pageSource, /值符|值使/u, 'qimen result page should surface zhiFu/zhiShi in the header');
});

test('daliuren prompt + ui should surface yin/yang guiren and core date markers', async () => {
    const [textSource, pageSource] = await Promise.all([
        readFile(daliurenTextPath, 'utf-8'),
        readFile(daliurenResultPath, 'utf-8'),
    ]);

    assert.match(textSource, /阴阳贵人/u, 'daliuren shared text should include yin/yang guiren');
    assert.match(textSource, /丁马/u, 'daliuren shared text should include ding ma');
    assert.match(textSource, /天马/u, 'daliuren shared text should include tian ma');
    assert.match(pageSource, /农历|丁马|阴阳贵人/u, 'daliuren result UI should surface lunar date, ding ma, or guiren mappings');
    assert.match(pageSource, /取传法|课体/u, 'daliuren result UI should surface keTi method');
    assert.match(pageSource, /本命|行年/u, 'daliuren result UI should surface benMing/xingNian when available');
    assert.match(pageSource, /遁干|建除|十二宫/u, 'daliuren result UI should surface gongInfos detail fields');
});

test('mcp formatters should surface core-aligned fields across divination features', async () => {
    const source = await readFile(mcpFormatterPath, 'utf-8');
    assert.match(source, /天干五合/u, 'mcp bazi formatter should include tianGanWuHe');
    assert.match(source, /地支半合/u, 'mcp bazi formatter should include diZhiBanHe');
    assert.match(source, /互卦|错卦|综卦|卦身/u, 'mcp liuyao formatter should include derived hexagrams and gua shen');
    assert.match(source, /星五行|门五行|宫五行/u, 'mcp qimen formatter should include element details');
    assert.match(source, /丁马|天马|阴阳贵人|农历/u, 'mcp daliuren formatter should include extended date and guiren data');
    assert.match(source, /星象|逆位关键词/u, 'mcp tarot formatter should include astrological or reversed keyword metadata');
});

test('tarot shared reading text should include core-aligned card metadata and numerology when provided', () => {
    const text = generateTarotReadingText({
        spreadName: '单牌',
        question: '今天如何？',
        cards: [
            {
                position: '当前指引',
                orientation: 'upright',
                meaning: '适合主动推进',
                card: {
                    name: 'The Sun',
                    nameChinese: '太阳',
                    keywords: ['成功', '清晰'],
                    element: '火',
                    number: 19,
                    astrologicalCorrespondence: '太阳',
                    reversedKeywords: ['消极', '迟滞'],
                },
            },
        ],
        numerology: {
            personalityCard: { number: 1, name: 'The Magician', nameChinese: '魔术师' },
            soulCard: { number: 2, name: 'The High Priestess', nameChinese: '女祭司' },
            yearlyCard: { number: 19, name: 'The Sun', nameChinese: '太阳', year: 2026 },
        },
    } as unknown as Parameters<typeof generateTarotReadingText>[0]);

    assert.match(text, /英文名/u, 'tarot text should include english card name');
    assert.match(text, /编号/u, 'tarot text should include card number');
    assert.match(text, /元素/u, 'tarot text should include card element');
    assert.match(text, /星象/u, 'tarot text should include astrological correspondence when provided');
    assert.match(text, /逆位关键词/u, 'tarot text should include reversed keywords when provided');
    assert.match(text, /塔罗数秘术/u, 'tarot text should include numerology section when provided');
    assert.match(text, /人格牌/u, 'tarot numerology section should include personality card');
});

test('tarot shared reading text should include birthDate when provided', () => {
    const text = generateTarotReadingText({
        spreadName: '单牌',
        cards: [],
        birthDate: '1990-01-01',
    } as unknown as Parameters<typeof generateTarotReadingText>[0]);

    assert.match(text, /出生日期/u, 'tarot text should include birth date label');
    assert.match(text, /1990-01-01/u, 'tarot text should include birth date value');
});

test('tarot draw should accept ISO datetime birthDate for numerology', async () => {
    const result = await drawForSpread('single', true, {
        birthDate: '1990-01-01T00:00:00Z',
        seed: 'tdd-numerology',
    });

    assert.ok(result?.numerology, 'tarot draw should return numerology when birth date is provided');
});

test('tarot result, save route, and history restore should preserve optional birthDate and numerology metadata', async () => {
    const [pageSource, routeSource, historySource] = await Promise.all([
        readFile(tarotResultPath, 'utf-8'),
        readFile(tarotRoutePath, 'utf-8'),
        readFile(tarotHistoryRegistryPath, 'utf-8'),
    ]);

    assert.match(pageSource, /birthDate/u, 'tarot result flow should keep birthDate in local state/session payloads');
    assert.match(pageSource, /出生日期/u, 'tarot result page should render birth date with a user-facing label');
    assert.match(pageSource, /塔罗数秘术|人格牌|灵魂牌|年度牌/u, 'tarot result page should render numerology output directly');
    assert.match(pageSource, /卡牌信息|关键词|逆位关键词/u, 'tarot result page should surface core-aligned card metadata in the UI');
    assert.match(routeSource, /birthDate|numerology|metadata/u, 'tarot route should persist numerology-related metadata');
    assert.match(historySource, /birthDate|numerology|metadata/u, 'tarot history restore should recover numerology-related metadata');
});
