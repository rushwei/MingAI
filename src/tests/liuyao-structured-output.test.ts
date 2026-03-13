import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performFullAnalysis, type Yao } from '../lib/divination/liuyao';

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
            type: parseInt(char, 10) as 0 | 1,
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

test('timeRecommendations use qualitative triggers instead of date windows', () => {
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
        assert.equal(typeof item.trigger, 'string');
        assert.ok(item.trigger.length > 0);
        assert.ok(Array.isArray(item.basis));
        assert.equal(typeof item.description, 'string');
        assert.equal('startDate' in item, false);
        assert.equal('endDate' in item, false);
        assert.equal('confidence' in item, false);
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
    assert.equal(target.selectionStatus, 'from_fushen');
    assert.ok(
        target.selected.evidence.some(factor => factor.includes('伏神') || factor.includes('不上卦')),
        'expected fallback evidence to include 伏神 hint'
    );
});

test('same-business-rank yongshen candidates should remain ambiguous instead of being resolved only by position', () => {
    const yaos: Yao[] = '100010'.split('').map((char, index) => ({
        type: parseInt(char, 10) as 0 | 1,
        change: 'stable',
        position: index + 1,
    }));

    const analysis = performFullAnalysis(
        yaos,
        '100010',
        undefined,
        '测试同类并见',
        new Date('2024-01-02T10:00:00+08:00'),
        { yongShenTargets: ['兄弟'] }
    );

    const target = analysis.yongShen.find(group => group.targetLiuQin === '兄弟');
    assert.ok(target, 'expected 兄弟 target group to exist');
    assert.equal(target.selectionStatus, 'ambiguous');
    assert.ok(target.candidates.length > 0, 'ambiguous selection should preserve alternatives');
});

test('when target is absent in base hexagram but month/day can stand in, use temporal yongshen before fuShen', () => {
    const yaos: Yao[] = '011111'.split('').map((char, index) => ({
        type: parseInt(char, 10) as 0 | 1,
        change: 'stable',
        position: index + 1,
    }));

    const analysis = performFullAnalysis(
        yaos,
        '011111',
        undefined,
        '问财运',
        new Date('2024-02-10T10:00:00+08:00'),
        { yongShenTargets: ['妻财'] }
    );

    const target = analysis.yongShen.find(group => group.targetLiuQin === '妻财');
    assert.ok(target, 'expected 妻财 target group to exist');
    assert.equal(target.selectionStatus, 'from_temporal');
    assert.equal(target.selected.source, 'temporal');
    assert.equal(target.selected.naJia, '寅');
    assert.ok(
        target.selected.evidence.some(factor => factor.includes('月建') || factor.includes('日辰')),
        'temporal yongshen should explain month/day fallback'
    );
});

test('when target is transformed by changing lines, use changed yongshen before fuShen', () => {
    const baseCode = '100010';
    const changedCode = '101100';
    const yaos: Yao[] = baseCode.split('').map((char, index) => ({
        type: parseInt(char, 10) as 0 | 1,
        change: baseCode[index] === changedCode[index] ? 'stable' : 'changing',
        position: index + 1,
    }));

    const analysis = performFullAnalysis(
        yaos,
        baseCode,
        changedCode,
        '问财运',
        new Date('2024-01-02T10:00:00+08:00'),
        { yongShenTargets: ['妻财'] }
    );

    const target = analysis.yongShen.find(group => group.targetLiuQin === '妻财');
    assert.ok(target, 'expected 妻财 target group to exist');
    assert.equal(target.selectionStatus, 'from_changed');
    assert.equal(target.selected.source, 'changed');
    assert.equal(target.selected.position, 4);
    assert.equal(target.selected.naJia, '午');
});

test('changing empty yao with month-jian should surface kong_yue_jian instead of plain kong_changing', () => {
    const baseCode = '111111';
    const changedCode = '101111';
    const yaos: Yao[] = baseCode.split('').map((char, index) => ({
        type: parseInt(char, 10) as 0 | 1,
        change: baseCode[index] === changedCode[index] ? 'stable' : 'changing',
        position: index + 1,
    }));

    const analysis = performFullAnalysis(
        yaos,
        baseCode,
        changedCode,
        '问财运',
        new Date('2024-02-10T10:00:00+08:00'),
        { yongShenTargets: ['妻财'] }
    );

    assert.equal(analysis.fullYaos[1]?.kongWangState, 'kong_yue_jian');
});

test('blocked fuShen fallback should not emit generic favorable branch timing', () => {
    const yaos: Yao[] = '010101'.split('').map((char, index) => ({
        type: parseInt(char, 10) as 0 | 1,
        change: 'stable',
        position: index + 1,
    }));

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
    assert.equal(target.selectionStatus, 'from_fushen');
    assert.equal(
        analysis.timeRecommendations.some(item => item.targetLiuQin === '官鬼' && item.type === 'favorable'),
        false,
        'blocked/conditional fuShen should not receive generic favorable timing'
    );
});

test('sanHe analysis should preserve multiple matching full-sanhe groups instead of only the first hit', () => {
    const baseCode = '111111';
    const changedCode = '001001';
    const yaos: Yao[] = baseCode.split('').map((char, index) => ({
        type: parseInt(char, 10) as 0 | 1,
        change: baseCode[index] === changedCode[index] ? 'stable' : 'changing',
        position: index + 1,
    }));

    const analysis = performFullAnalysis(
        yaos,
        baseCode,
        changedCode,
        '测试三合并存',
        new Date('2024-01-02T10:00:00+08:00'),
        { yongShenTargets: ['子孙'] }
    );

    assert.ok(Array.isArray(analysis.sanHeAnalysis.fullSanHeList), 'expected fullSanHeList to exist');
    assert.equal(analysis.sanHeAnalysis.fullSanHeList?.length, 2);
    assert.deepEqual(
        analysis.sanHeAnalysis.fullSanHeList?.map(item => item.name).sort(),
        ['寅午戌合火局', '申子辰合水局']
    );
});
