import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('liuyao entry pages enforce yongShenTargets only when question is provided', () => {
    const pageFile = fs.readFileSync(path.join(process.cwd(), 'src/app/liuyao/page.tsx'), 'utf8');
    const selectFile = fs.readFileSync(path.join(process.cwd(), 'src/app/liuyao/select/page.tsx'), 'utf8');
    const divineFile = fs.readFileSync(path.join(process.cwd(), 'src/app/liuyao/divine/page.tsx'), 'utf8');

    assert.equal(pageFile.includes('yongShenTargets'), true);
    assert.equal(pageFile.includes('question.trim()'), true);
    assert.equal(pageFile.includes("writeSessionJSON('liuyao_question'"), true);

    assert.equal(selectFile.includes('yongShenTargets'), true);
    assert.equal(selectFile.includes('question.trim()'), true);
    assert.equal(selectFile.includes("writeSessionJSON('liuyao_result'"), true);

    assert.equal(divineFile.includes('yongShenTargets'), true);
    assert.equal(divineFile.includes('question.trim()'), true);
    assert.equal(divineFile.includes("readSessionJSON<"), true);
    assert.equal(divineFile.includes("writeSessionJSON('liuyao_question'"), true);
    assert.equal(divineFile.includes("action: 'save'"), true);
});

test('result page blocks analysis when old record has no yongShenTargets', () => {
    const file = fs.readFileSync(path.join(process.cwd(), 'src/app/liuyao/result/page.tsx'), 'utf8');

    assert.equal(file.includes('必须先选择分析目标'), true);
    assert.equal(file.includes('YongShenTargetPicker'), true);
    assert.equal(file.includes('pendingYongShenTargets'), true);
    assert.equal(file.includes("readSessionJSON<LiuyaoQuestionSession | string>('liuyao_question')"), true);
    assert.equal(file.includes('resolveResultYongShenState('), true);
    assert.equal(file.includes('const appliedYongShenTargets = yongShenTargetState.appliedTargets;'), true);
    assert.equal(file.includes('missingYongShenTargets = requiresYongShenTargets && appliedYongShenTargets.length === 0'), true);
    assert.equal(file.includes('performFullAnalysis('), true);
});

test('result page provides terms-reference modal entry on desktop and mobile menu', () => {
    const file = fs.readFileSync(path.join(process.cwd(), 'src/app/liuyao/result/page.tsx'), 'utf8');

    assert.equal(file.includes('术语参考'), true);
    assert.equal(file.includes("id: 'terms'"), true);
    assert.equal(file.includes('setShowTermsModal(true)'), true);
    assert.equal(file.includes('showTermsModal'), true);
});

test('inline yongshen picker uses modal overlay to avoid click-through', () => {
    const pickerFile = fs.readFileSync(path.join(process.cwd(), 'src/components/liuyao/YongShenTargetPicker.tsx'), 'utf8');

    assert.equal(pickerFile.includes('fixed inset-0'), true);
    assert.equal(pickerFile.includes('选择分析目标（可多选）'), true);
    assert.equal(pickerFile.includes('完成选择'), true);
    assert.equal(pickerFile.includes('items-center justify-center'), true);
    assert.equal(pickerFile.includes('合同文书/证件/学业/房屋车辆/长辈'), true);
    assert.equal(pickerFile.includes('功名求官/工作事业/规则/压力/风险/疾病'), true);
    assert.equal(pickerFile.includes('同辈/合作/竞争'), true);
    assert.equal(pickerFile.includes('婚恋多见于男问对象或以财为线索时'), true);
    assert.equal(pickerFile.includes('婚恋多见于女问对象或以官为线索时'), true);
    assert.equal(pickerFile.includes('子女后辈/医药'), true);
    assert.equal(pickerFile.includes('至少选择 1 项后再起卦。'), false);
    assert.equal(pickerFile.includes('系统才会开始六爻分析'), false);
    assert.equal(pickerFile.includes('有明确问题时再选择分析目标并正式解卦；无问题可仅起卦保存。'), true);
});

test('select page hides question content and no longer has editable question input', () => {
    const selectFile = fs.readFileSync(path.join(process.cwd(), 'src/app/liuyao/select/page.tsx'), 'utf8');

    assert.equal(selectFile.includes('问题来自主页面'), false);
    assert.equal(selectFile.includes('例如：这次合作能否顺利？'), false);
    assert.equal(selectFile.includes('YongShenTargetPicker'), true);
    assert.equal(selectFile.includes('必须先选择分析目标'), true);
});

test('main page keeps picker button inside input right side', () => {
    const pageFile = fs.readFileSync(path.join(process.cwd(), 'src/app/liuyao/page.tsx'), 'utf8');

    assert.equal(pageFile.includes('absolute inset-y-0 right-2 z-10 flex items-center'), true);
    assert.equal(pageFile.includes('-translate-y-1/2'), false);
    assert.equal(pageFile.includes('分析目标</p>'), false);
    assert.equal(pageFile.includes('已选分析目标：'), false);
});
