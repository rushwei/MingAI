import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performFullAnalysis, type Yao } from '../lib/liuyao';

function daysBetween(startDate: string, endDate: string): number {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

test('fullYaos uses 伏吟 relation when changed branch stays the same', () => {
    const baseCases: Array<{ code: string; changedCode: string; date: string }> = [
        { code: '111111', changedCode: '100010', date: '2026-02-10' },
        { code: '101111', changedCode: '001111', date: '2026-02-10' },
        { code: '101010', changedCode: '010101', date: '2026-03-10' },
        { code: '010010', changedCode: '101101', date: '2026-04-10' },
    ];

    let found = false;
    for (const item of baseCases) {
        const yaos: Yao[] = item.code.split('').map((char, index) => ({
            type: (parseInt(char, 10) as 0 | 1),
            change: item.code[index] === item.changedCode[index] ? 'stable' : 'changing',
            position: index + 1,
        }));

        const analysis = performFullAnalysis(
            yaos,
            item.code,
            item.changedCode,
            '测试伏吟',
            new Date(`${item.date}T00:00:00.000Z`),
            { yongShenTargets: ['兄弟'] }
        );

        for (const yao of analysis.fullYaos) {
            if (!yao.changedYao) continue;
            if (yao.naJia === yao.changedYao.naJia) {
                found = true;
                assert.equal(yao.changedYao.relation, '伏吟');
            }
        }
    }

    assert.ok(found, 'expected at least one same-branch changed yao case');
});

test('timeRecommendations use structured date windows and confidence', () => {
    const yaos: Yao[] = [
        { type: 1, change: 'stable', position: 1 },
        { type: 0, change: 'changing', position: 2 },
        { type: 1, change: 'stable', position: 3 },
        { type: 0, change: 'stable', position: 4 },
        { type: 1, change: 'changing', position: 5 },
        { type: 0, change: 'stable', position: 6 },
    ];

    const analysis = performFullAnalysis(
        yaos,
        '101010',
        '001111',
        '近期计划是否顺利',
        new Date('2026-02-10T00:00:00.000Z'),
        { yongShenTargets: ['兄弟'] }
    );

    assert.ok(analysis.timeRecommendations.length > 0);
    for (const item of analysis.timeRecommendations) {
        assert.match(item.startDate, /^\d{4}-\d{2}-\d{2}$/);
        assert.match(item.endDate, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(item.confidence >= 0 && item.confidence <= 1);
        assert.ok(daysBetween(item.startDate, item.endDate) <= 90);
    }

    const grouped = new Map<string, { favorable?: { startDate: string; endDate: string }; critical?: { startDate: string; endDate: string } }>();
    for (const item of analysis.timeRecommendations) {
        const current = grouped.get(item.targetLiuQin) ?? {};
        if (item.type === 'favorable') current.favorable = { startDate: item.startDate, endDate: item.endDate };
        if (item.type === 'critical') current.critical = { startDate: item.startDate, endDate: item.endDate };
        grouped.set(item.targetLiuQin, current);
    }

    for (const { favorable, critical } of grouped.values()) {
        if (!favorable || !critical) continue;
        assert.notDeepEqual(
            favorable,
            critical,
            'favorable and critical windows should not be identical'
        );
    }
});

test('when target liuqin is not on hexagram, yongshen falls back to fuShen candidate', () => {
    const yaos: Yao[] = [
        { type: 0, change: 'stable', position: 1 },
        { type: 1, change: 'stable', position: 2 },
        { type: 0, change: 'stable', position: 3 },
        { type: 1, change: 'stable', position: 4 },
        { type: 0, change: 'stable', position: 5 },
        { type: 1, change: 'stable', position: 6 },
    ];

    const analysis = performFullAnalysis(
        yaos,
        '010101',
        undefined,
        '事业发展如何',
        new Date('2026-02-10T00:00:00.000Z'),
        { yongShenTargets: ['官鬼'] }
    );

    const target = analysis.yongShen.find(group => group.targetLiuQin === '官鬼');
    assert.ok(target, 'expected 官鬼 target group to exist');
    assert.equal(typeof target.selected.position, 'number');
    assert.ok(target.selected.rankScore > 0);
    assert.ok(
        target.selected.factors.some(factor => factor.includes('伏神')),
        'expected fallback factors to include 伏神 hint'
    );
});
