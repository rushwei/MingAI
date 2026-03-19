import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';

test('bazi analysis route builds prompt from server chart context instead of client chartSummary', async (t) => {
    const apiUtils = require('../lib/api-utils') as {
        requireUserContext: typeof import('../lib/api-utils').requireUserContext;
        getSystemAdminClient: typeof import('../lib/api-utils').getSystemAdminClient;
    };
    const creditsModule = require('../lib/user/credits') as any;
    const aiAccessModule = require('../lib/ai/ai-access') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const rateLimitModule = require('../lib/rate-limit') as any;
    const aiAnalysisModule = require('../lib/ai/ai-analysis') as any;

    const originalRequireUserContext = apiUtils.requireUserContext;
    const originalGetSystemAdminClient = apiUtils.getSystemAdminClient;
    const originalGetUserAuthInfo = creditsModule.getUserAuthInfo;
    const originalUseCredit = creditsModule.useCredit;
    const originalAddCredits = creditsModule.addCredits;
    const originalResolveModelAccessAsync = aiAccessModule.resolveModelAccessAsync;
    const originalCallAIWithReasoning = aiModule.callAIWithReasoning;
    const originalCheckRateLimit = rateLimitModule.checkRateLimit;
    const originalGetClientIP = rateLimitModule.getClientIP;
    const originalCreateAIAnalysisConversation = aiAnalysisModule.createAIAnalysisConversation;

    let capturedUserPrompt = '';
    let capturedSourceData: Record<string, unknown> | null = null;

    apiUtils.requireUserContext = (async () => ({
        user: { id: 'user-1' },
        supabase: {},
    })) as unknown as typeof apiUtils.requireUserContext;

    apiUtils.getSystemAdminClient = (() => ({
        from(table: string) {
            if (table === 'bazi_charts') {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    eq() {
                                        return {
                                            single: async () => ({
                                                data: {
                                                    id: '11111111-1111-1111-1111-111111111111',
                                                    user_id: 'user-1',
                                                    name: '张三',
                                                    gender: 'male',
                                                    birth_date: '1990-01-01',
                                                    birth_time: '08:00',
                                                    birth_place: '北京',
                                                    calendar_type: 'solar',
                                                    is_leap_month: false,
                                                    chart_data: {
                                                        name: '张三',
                                                        gender: 'male',
                                                        birthDate: '1990-01-01',
                                                        birthTime: '08:00',
                                                        birthPlace: '北京',
                                                        timezone: 8,
                                                        calendarType: 'solar',
                                                        fourPillars: {
                                                            year: { stem: '甲', branch: '子', hiddenStems: ['癸'] },
                                                            month: { stem: '乙', branch: '丑', hiddenStems: ['己'] },
                                                            day: { stem: '丙', branch: '寅', hiddenStems: ['甲'] },
                                                            hour: { stem: '丁', branch: '卯', hiddenStems: ['乙'] },
                                                        },
                                                        dayMaster: '丙',
                                                        fiveElements: { 金: 0, 木: 3, 水: 1, 火: 2, 土: 1 },
                                                    },
                                                },
                                                error: null,
                                            }),
                                        };
                                    },
                                };
                            },
                        };
                    },
                };
            }

            if (table === 'bazi_case_profiles') {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    eq() {
                                        return {
                                            maybeSingle: async () => ({
                                                data: {
                                                    id: 'profile-1',
                                                    user_id: 'user-1',
                                                    bazi_chart_id: '11111111-1111-1111-1111-111111111111',
                                                    master_review: {
                                                        strengthLevel: '偏强',
                                                        patterns: ['财格'],
                                                        yongShen: { basic: ['水'], advanced: ['壬'] },
                                                        xiShen: { basic: ['金'], advanced: [] },
                                                        jiShen: { basic: ['火'], advanced: [] },
                                                        xianShen: { basic: ['土'], advanced: [] },
                                                        summary: '财可生官。',
                                                    },
                                                    owner_feedback: {
                                                        occupation: '上班族',
                                                        education: '本科',
                                                        wealthLevel: '小康',
                                                        marriageStatus: '已婚',
                                                        healthStatus: '健康稳定',
                                                        familyStatusTags: ['父母助力'],
                                                        temperamentTags: ['务实'],
                                                        summary: '近年工作稳定。',
                                                    },
                                                    created_at: '2026-03-20T00:00:00.000Z',
                                                    updated_at: '2026-03-20T00:00:00.000Z',
                                                },
                                                error: null,
                                            }),
                                        };
                                    },
                                };
                            },
                        };
                    },
                };
            }

            if (table === 'bazi_case_events') {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    order: async () => ({
                                        data: [
                                            {
                                                id: 'event-1',
                                                profile_id: 'profile-1',
                                                bazi_chart_id: '11111111-1111-1111-1111-111111111111',
                                                event_date: '2024-06-01',
                                                category: '事业',
                                                title: '晋升',
                                                detail: '升任主管',
                                                created_at: '2026-03-20T00:00:00.000Z',
                                                updated_at: '2026-03-20T00:00:00.000Z',
                                            },
                                        ],
                                        error: null,
                                    }),
                                };
                            },
                        };
                    },
                };
            }

            throw new Error(`Unexpected table: ${table}`);
        },
    })) as unknown as typeof apiUtils.getSystemAdminClient;

    creditsModule.getUserAuthInfo = async () => ({
        effectiveMembership: 'free',
        hasCredits: true,
    });
    creditsModule.useCredit = async () => 0;
    creditsModule.addCredits = async () => 1;
    aiAccessModule.resolveModelAccessAsync = async () => ({
        modelId: 'deepseek-v3.2',
        reasoningEnabled: false,
    });
    aiModule.callAIWithReasoning = async (messages: Array<{ content: string }>) => {
        capturedUserPrompt = messages[0]?.content || '';
        return {
            content: '分析结果',
            reasoning: null,
        };
    };
    rateLimitModule.checkRateLimit = async () => ({ allowed: true });
    rateLimitModule.getClientIP = () => '127.0.0.1';
    aiAnalysisModule.createAIAnalysisConversation = async (args: { sourceData: Record<string, unknown> }) => {
        capturedSourceData = args.sourceData;
        return 'conversation-1';
    };

    t.after(() => {
        apiUtils.requireUserContext = originalRequireUserContext;
        apiUtils.getSystemAdminClient = originalGetSystemAdminClient;
        creditsModule.getUserAuthInfo = originalGetUserAuthInfo;
        creditsModule.useCredit = originalUseCredit;
        creditsModule.addCredits = originalAddCredits;
        aiAccessModule.resolveModelAccessAsync = originalResolveModelAccessAsync;
        aiModule.callAIWithReasoning = originalCallAIWithReasoning;
        rateLimitModule.checkRateLimit = originalCheckRateLimit;
        rateLimitModule.getClientIP = originalGetClientIP;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateAIAnalysisConversation;
    });

    const { POST } = await import('../app/api/bazi/analysis/route');
    const request = new NextRequest('http://localhost/api/bazi/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chartId: '11111111-1111-1111-1111-111111111111',
            type: 'wuxing',
            modelId: 'deepseek-v3.2',
            reasoning: false,
            stream: false,
        }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.match(capturedUserPrompt, /断事笔记/u);
    assert.match(capturedUserPrompt, /岗位晋升|晋升/u);
    assert.equal(capturedSourceData?.['case_profile_id'], 'profile-1');
    assert.match(String(capturedSourceData?.['case_prompt_snapshot'] || ''), /命主反馈/u);
});
