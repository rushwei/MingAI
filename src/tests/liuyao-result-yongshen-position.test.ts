import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveTraditionalYongShenPositions } from '../lib/divination/liuyao-result-state';

test('result page resolves yongshen highlight positions when selected labels include 爻 suffix', () => {
    const positions = resolveTraditionalYongShenPositions({
        yaos: [
            { position: '上九', liuQin: '子孙' },
            { position: '九五', liuQin: '妻财' },
            { position: '九四', liuQin: '兄弟' },
            { position: '六三', liuQin: '官鬼' },
            { position: '六二', liuQin: '父母' },
            { position: '初九', liuQin: '妻财' },
        ],
        yongShenAnalysis: [{
            targetLiuQin: '妻财',
            selectionStatus: '已定',
            selected: {
                position: '初九爻',
                liuQin: '妻财',
                strengthLabel: '旺',
                movementLabel: '静',
            },
        }],
    } as any);

    assert.deepEqual(positions, [1]);
});

test('result page does not highlight yongshen when normalized position matches but liuqin differs', () => {
    const positions = resolveTraditionalYongShenPositions({
        yaos: [
            { position: '上九', liuQin: '子孙' },
            { position: '九五', liuQin: '妻财' },
            { position: '九四', liuQin: '兄弟' },
            { position: '六三', liuQin: '官鬼' },
            { position: '六二', liuQin: '父母' },
            { position: '初九', liuQin: '兄弟' },
        ],
        yongShenAnalysis: [{
            targetLiuQin: '妻财',
            selectionStatus: '已定',
            selected: {
                position: '初九爻',
                liuQin: '妻财',
                strengthLabel: '旺',
                movementLabel: '静',
            },
        }],
    } as any);

    assert.deepEqual(positions, []);
});
