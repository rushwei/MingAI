import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const buildMinimalBaziChart = () => ({
    name: '张三',
    gender: 'male',
    birthDate: '1990-01-01',
    birthTime: '08:00',
    birthPlace: '北京',
    timezone: 8,
    calendarType: 'solar',
    fourPillars: {
        year: { stem: '甲', branch: '子', stemElement: '木', branchElement: '水', hiddenStems: ['癸'] },
        month: { stem: '乙', branch: '丑', stemElement: '木', branchElement: '土', hiddenStems: ['癸', '辛', '己'] },
        day: { stem: '甲', branch: '子', stemElement: '木', branchElement: '水', hiddenStems: ['癸'] },
        hour: { stem: '丙', branch: '寅', stemElement: '火', branchElement: '木', hiddenStems: ['甲', '丙', '戊'] },
    },
    dayMaster: '甲',
    fiveElements: { 金: 1, 木: 2, 水: 2, 火: 1, 土: 0 },
});

test('buildPromptWithSources includes base rules and dify prefix', async () => {
    const pb = require('../lib/prompt-builder') as any;
    const res = await pb.buildPromptWithSources({
        modelId: 'deepseek-chat',
        userMessage: '测试问题',
        mentions: [],
        knowledgeHits: [],
        userSettings: { expressionStyle: 'direct', userProfile: {}, customInstructions: '' },
        difyContext: { webContent: '网页内容', fileContent: '文件内容' }
    });

    assert.ok(res.systemPrompt.includes('数据使用规则'));
    assert.ok(res.diagnostics.some((layer: { id: string; included: boolean }) => layer.id === 'base_rules' && layer.included));
    assert.ok(res.userMessagePrefix.includes('【用户上传的文件内容如下】'));
    assert.ok(res.userMessagePrefix.includes('【网络搜索结果如下】'));
    assert.ok(!res.systemPrompt.includes('【用户上传的文件内容如下】'));
});

test('buildPromptWithSources injects dream and mangpai layers', async () => {
    const pb = require('../lib/prompt-builder') as any;
    const res = await pb.buildPromptWithSources({
        modelId: 'deepseek-chat',
        userMessage: '测试问题',
        mentions: [],
        knowledgeHits: [],
        userSettings: { expressionStyle: 'direct', userProfile: {}, customInstructions: '' },
        dreamMode: { enabled: true, baziText: '命盘文本', fortuneText: '运势文本' },
        chartContext: { baziChart: buildMinimalBaziChart(), analysisMode: 'mangpai' }
    });

    assert.ok(res.systemPrompt.includes('解梦'));
    assert.ok(res.systemPrompt.includes('【命盘信息】'));
    assert.ok(res.systemPrompt.includes('【今日运势】'));
    assert.ok(res.systemPrompt.includes('盲派'));
    assert.ok(res.systemPrompt.includes('【盲派口诀】'));
    assert.ok(res.diagnostics.some((layer: { id: string; included: boolean }) => layer.id === 'personality_role' && layer.included));
    assert.ok(res.diagnostics.some((layer: { id: string; included: boolean }) => layer.id === 'mangpai_data' && layer.included));
});

test('buildPromptWithSources skips P2 layers when budget exceeded', async () => {
    const pb = require('../lib/prompt-builder') as any;
    const hugeContent = 'a'.repeat(20000);
    const res = await pb.buildPromptWithSources({
        modelId: 'deepseek-chat',
        userMessage: '测试问题',
        mentions: [{ type: 'ming_record', id: 'r1', name: '记录1', preview: 'p', resolvedContent: hugeContent }],
        knowledgeHits: [],
        userSettings: { expressionStyle: 'direct', userProfile: {}, customInstructions: '' }
    });

    const mentionLayer = res.diagnostics.find((layer: { id: string }) => layer.id === 'mention_r1');
    assert.ok(mentionLayer);
    assert.equal(mentionLayer.included, false);
    assert.ok(!res.systemPrompt.includes(hugeContent.slice(0, 200)));
});

test('resolvePersonalities selects dream and mangpai correctly', () => {
    const pb = require('../lib/prompt-builder') as any;
    const dreamOnly = pb.resolvePersonalities({ dreamMode: { enabled: true } });
    assert.deepEqual(dreamOnly, { personalities: ['dream'], isMultiple: false });

    const mangpai = pb.resolvePersonalities({
        chartContext: { baziChart: buildMinimalBaziChart(), analysisMode: 'mangpai' }
    });
    assert.deepEqual(mangpai, { personalities: ['mangpai'], isMultiple: false });
});

test('resolvePersonalities selects bazi/ziwei/general correctly', () => {
    const pb = require('../lib/prompt-builder') as any;
    const baziZiwei = pb.resolvePersonalities({
        chartContext: { baziChart: buildMinimalBaziChart(), ziweiChart: { palaces: {} } }
    });
    assert.deepEqual(baziZiwei, { personalities: ['bazi', 'ziwei'], isMultiple: true });

    const ziweiOnly = pb.resolvePersonalities({
        chartContext: { ziweiChart: { palaces: {} } }
    });
    assert.deepEqual(ziweiOnly, { personalities: ['ziwei'], isMultiple: false });

    const none = pb.resolvePersonalities({});
    assert.deepEqual(none, { personalities: ['general'], isMultiple: false });
});

test('resolvePersonalities considers mentions for bazi/ziwei', () => {
    const pb = require('../lib/prompt-builder') as any;
    const baziMention = pb.resolvePersonalities({
        mentions: [{ type: 'bazi_chart', id: 'b1', name: '八字', preview: 'p' }]
    });
    assert.deepEqual(baziMention, { personalities: ['bazi'], isMultiple: false });

    const bothMentions = pb.resolvePersonalities({
        mentions: [
            { type: 'bazi_chart', id: 'b1', name: '八字', preview: 'p' },
            { type: 'ziwei_chart', id: 'z1', name: '紫微', preview: 'p' }
        ]
    });
    assert.deepEqual(bothMentions, { personalities: ['bazi', 'ziwei'], isMultiple: true });
});

test('buildPersonalityPrompt composes single and multi roles', () => {
    const pb = require('../lib/prompt-builder') as any;
    const single = pb.buildPersonalityPrompt(['dream']);
    assert.ok(single.includes('解梦'));
    assert.ok(!single.includes('你同时具备以下专业能力'));

    const multi = pb.buildPersonalityPrompt(['bazi', 'ziwei']);
    assert.ok(multi.includes('你同时具备以下专业能力'));
    assert.ok(multi.includes('【八字宗师】'));
    assert.ok(multi.includes('【紫微宗师】'));
    assert.ok(multi.includes('综合结论'));
});

test('prompt builder should truncate P0 layers instead of forcing over-budget injection', async () => {
    const sourcePath = resolve(process.cwd(), 'src/lib/prompt-builder.ts');
    const source = await readFile(sourcePath, 'utf-8');

    assert.ok(
        !source.includes("tokens <= remaining || priority === 'P0'"),
        'P0 should not bypass budget checks directly'
    );
    assert.ok(
        source.includes('truncateToTokens'),
        'prompt builder should use truncateToTokens for overflow handling'
    );
});
