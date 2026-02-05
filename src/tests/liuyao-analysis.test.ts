import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performFullAnalysis, yaosTpCode, calculateKongWangByPillar, XUN_KONG_TABLE, type Yao, type YaoType, type YaoChange, type GanZhiTime } from '../lib/liuyao';

test('performFullAnalysis treats changed hexagram lines as stable', () => {
    const yaos: Yao[] = [
        { type: 1 as YaoType, change: 'changing' as YaoChange, position: 1 },
        { type: 0 as YaoType, change: 'stable' as YaoChange, position: 2 },
        { type: 1 as YaoType, change: 'stable' as YaoChange, position: 3 },
        { type: 0 as YaoType, change: 'changing' as YaoChange, position: 4 },
        { type: 1 as YaoType, change: 'stable' as YaoChange, position: 5 },
        { type: 0 as YaoType, change: 'stable' as YaoChange, position: 6 },
    ];
    const hexagramCode = yaosTpCode(yaos);
    const changedCode = yaosTpCode(yaos.map((yao) => ({
        ...yao,
        type: yao.change === 'changing' ? (yao.type === 1 ? 0 : 1) : yao.type,
    })));

    const analysis = performFullAnalysis(
        yaos,
        hexagramCode,
        changedCode,
        '测试用问题',
        new Date('2024-01-02T00:00:00.000Z')
    );

    assert.ok(analysis.changedYaos);
    assert.equal(analysis.changedYaos?.some((yao) => yao.change === 'changing'), false);
});

test('calculateKongWangByPillar returns correct kongWang for each pillar', () => {
    const ganZhiTime: GanZhiTime = {
        year: { gan: '甲', zhi: '子' },
        month: { gan: '甲', zhi: '寅' },
        day: { gan: '甲', zhi: '辰' },
        hour: { gan: '甲', zhi: '午' },
        xun: '甲辰旬',
    };

    const kongWangByPillar = calculateKongWangByPillar(ganZhiTime);

    assert.equal(kongWangByPillar.year.xun, '甲子旬');
    assert.deepEqual(kongWangByPillar.year.kongDizhi, XUN_KONG_TABLE['甲子旬']);

    assert.equal(kongWangByPillar.month.xun, '甲寅旬');
    assert.deepEqual(kongWangByPillar.month.kongDizhi, XUN_KONG_TABLE['甲寅旬']);

    assert.equal(kongWangByPillar.day.xun, '甲辰旬');
    assert.deepEqual(kongWangByPillar.day.kongDizhi, XUN_KONG_TABLE['甲辰旬']);

    assert.equal(kongWangByPillar.hour.xun, '甲午旬');
    assert.deepEqual(kongWangByPillar.hour.kongDizhi, XUN_KONG_TABLE['甲午旬']);
});

test('performFullAnalysis keeps kongWang equal to day pillar kongWang', () => {
    const yaos: Yao[] = [
        { type: 1 as YaoType, change: 'stable' as YaoChange, position: 1 },
        { type: 1 as YaoType, change: 'stable' as YaoChange, position: 2 },
        { type: 1 as YaoType, change: 'stable' as YaoChange, position: 3 },
        { type: 1 as YaoType, change: 'stable' as YaoChange, position: 4 },
        { type: 1 as YaoType, change: 'stable' as YaoChange, position: 5 },
        { type: 1 as YaoType, change: 'stable' as YaoChange, position: 6 },
    ];
    const hexagramCode = yaosTpCode(yaos);

    const analysis = performFullAnalysis(
        yaos,
        hexagramCode,
        undefined,
        '测试用问题',
        new Date('2024-01-02T00:00:00.000Z')
    );

    assert.equal(analysis.kongWang.xun, analysis.kongWangByPillar.day.xun);
    assert.deepEqual(analysis.kongWang.kongDizhi, analysis.kongWangByPillar.day.kongDizhi);
});
