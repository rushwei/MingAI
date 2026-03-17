import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Architecture guard: verifies TraditionalAnalysis uses the expected grouped layout labels
// and liuyao-term-tips contains the canonical liuqin descriptions.
// If this test fails after UI refactoring, update assertions to match the new structure.
test('traditional analysis uses compact grouped layout labels', () => {
    const filePath = path.join(process.cwd(), 'src/components/liuyao/TraditionalAnalysis.tsx');
    const content = fs.readFileSync(filePath, 'utf8');
    const termsPath = path.join(process.cwd(), 'src/lib/divination/liuyao-term-tips.ts');
    const termsContent = fs.readFileSync(termsPath, 'utf8');

    assert.equal(content.includes('关键信号'), true);
    assert.equal(content.includes('近期应期'), true);
    assert.equal(content.includes('候选（'), true);
    assert.equal(content.includes('伏神提示'), true);
    assert.equal(content.includes('max-w-3xl'), true);
    assert.equal(content.includes('yongShen.length > 0 && ('), true);
    assert.equal(content.includes('关键信号提示'), true);
    assert.equal(content.includes('groupIndex === 0 && ('), true);

    assert.equal(termsContent.includes('合同文书/证件/学业/房屋车辆/长辈'), true);
    assert.equal(termsContent.includes('功名求官/工作事业/规则/压力/风险/疾病'), true);
    assert.equal(termsContent.includes('同辈/合作/竞争'), true);
    assert.equal(termsContent.includes('婚恋多见于男问对象或以财为线索时'), true);
    assert.equal(termsContent.includes('婚恋多见于女问对象或以官为线索时'), true);
    assert.equal(termsContent.includes('子女后辈/医药'), true);
});
