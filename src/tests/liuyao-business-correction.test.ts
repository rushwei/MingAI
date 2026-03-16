import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

import { calculateFullYaoInfo, performFullAnalysis, type Yao } from '../lib/divination/liuyao';

test('天风姤纳甲应按上下卦固定纳甲而非单爻阴阳切换', () => {
    const yaos: Yao[] = '011111'.split('').map((char, index) => ({
        type: Number(char) as 0 | 1,
        change: 'stable',
        position: index + 1,
    }));

    const info = calculateFullYaoInfo(yaos, '011111', '甲');
    const naJiaList = info.map((yao) => yao.naJia);

    assert.deepEqual(
        naJiaList,
        ['丑', '亥', '酉', '午', '申', '戌'],
        '天风姤应使用巽下乾上的固定纳甲'
    );
    assert.equal(info[1]?.liuQin, '子孙', '二爻亥水对乾宫金应为子孙');
});

test('六爻完整分析不再暴露评分和置信度字段', () => {
    const yaos: Yao[] = [
        { type: 1, change: 'stable', position: 1 },
        { type: 0, change: 'changing', position: 2 },
        { type: 1, change: 'stable', position: 3 },
        { type: 0, change: 'stable', position: 4 },
        { type: 1, change: 'stable', position: 5 },
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

    for (const yao of analysis.fullYaos) {
        assert.equal('score' in yao.strength, false);
    }

    for (const group of analysis.yongShen) {
        assert.equal('strengthScore' in group.selected, false);
        for (const candidate of group.candidates) {
            assert.equal('strengthScore' in candidate, false);
        }
    }

    for (const rec of analysis.timeRecommendations) {
        assert.equal('confidence' in rec, false);
        assert.equal('startDate' in rec, false);
        assert.equal('endDate' in rec, false);
        assert.equal(typeof rec.description, 'string');
    }
});

test('liuyao route rejects interpret when question is empty', async (t) => {
    const credits = require('../lib/user/credits') as typeof import('../lib/user/credits');
    const aiModule = require('../lib/ai/ai') as typeof import('../lib/ai/ai');
    const aiAnalysisModule = require('../lib/ai/ai-analysis') as typeof import('../lib/ai/ai-analysis');
    const aiAccessModule = require('../lib/ai/ai-access') as typeof import('../lib/ai/ai-access');
    const supabaseModule = require('../lib/supabase') as typeof import('../lib/supabase');
    const supabaseServerModule = require('../lib/supabase-server') as typeof import('../lib/supabase-server');

    const originalHasCredits = credits.hasCredits;
    const originalUseCredit = credits.useCredit;
    const originalCallAIWithReasoning = aiModule.callAIWithReasoning;
    const originalCreateConversation = aiAnalysisModule.createAIAnalysisConversation;
    const originalResolveModelAccessAsync = aiAccessModule.resolveModelAccessAsync;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;

    credits.hasCredits = async () => true;
    credits.useCredit = async () => 1;
    aiModule.callAIWithReasoning = async () => ({ content: 'analysis', reasoning: null });
    aiAnalysisModule.createAIAnalysisConversation = async () => 'conv-1';
    aiAccessModule.resolveModelAccessAsync = async () => ({
        modelId: 'deepseek-chat',
        reasoningEnabled: false,
    });
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    supabaseServerModule.getSystemAdminClient = () => ({
        from: (table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({
                                data: { membership: 'pro', membership_expires_at: null },
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            if (table === 'liuyao_divinations') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: { created_at: new Date().toISOString() },
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                };
            }
            return {
                insert: async () => ({ error: null }),
            };
        },
    });

    t.after(() => {
        credits.hasCredits = originalHasCredits;
        credits.useCredit = originalUseCredit;
        aiModule.callAIWithReasoning = originalCallAIWithReasoning;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateConversation;
        aiAccessModule.resolveModelAccessAsync = originalResolveModelAccessAsync;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
    });

    const { POST } = await import('../app/api/liuyao/route');
    const request = new NextRequest('http://localhost/api/liuyao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'interpret',
            question: '',
            hexagram: {
                name: '乾为天',
                code: '111111',
                upperTrigram: '乾',
                lowerTrigram: '乾',
                element: '金',
                nature: '刚健',
            },
            yaos: [
                { type: 1, change: 'stable', position: 1 },
                { type: 1, change: 'stable', position: 2 },
                { type: 1, change: 'stable', position: 3 },
                { type: 1, change: 'stable', position: 4 },
                { type: 1, change: 'stable', position: 5 },
                { type: 1, change: 'stable', position: 6 },
            ],
            changedLines: [],
        }),
    });

    const response = await POST(request);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, '请先明确问题后再解卦');
});
