import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performFullAnalysis, yaosTpCode } from '../lib/liuyao';

test('performFullAnalysis treats changed hexagram lines as stable', () => {
    const yaos = [
        { type: 1, change: 'changing', position: 1 },
        { type: 0, change: 'stable', position: 2 },
        { type: 1, change: 'stable', position: 3 },
        { type: 0, change: 'changing', position: 4 },
        { type: 1, change: 'stable', position: 5 },
        { type: 0, change: 'stable', position: 6 },
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
