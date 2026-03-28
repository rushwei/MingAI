import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('buildPreviewPromptContext passes resolved membershipType to knowledge search in override mode', async (t) => {
    const promptBuilderModule = require('../lib/ai/prompt-builder') as typeof import('../lib/ai/prompt-builder');
    const searchModule = require('../lib/knowledge-base/search') as typeof import('../lib/knowledge-base/search');

    const originalBuildPromptWithSources = promptBuilderModule.buildPromptWithSources;
    const originalGetPromptBudget = promptBuilderModule.calculatePromptBudget;
    const originalSearchKnowledge = searchModule.searchKnowledge;
    let capturedMembershipType: unknown = null;

    promptBuilderModule.calculatePromptBudget = (async () => 1024) as typeof promptBuilderModule.calculatePromptBudget;
    promptBuilderModule.buildPromptWithSources = (async () => ({
        systemPrompt: '',
        userMessagePrefix: '',
        userMessageTokens: 0,
        sources: [],
        diagnostics: [],
        totalTokens: 0,
        budgetTotal: 0,
    })) as typeof promptBuilderModule.buildPromptWithSources;
    searchModule.searchKnowledge = (async (_query, options) => {
        capturedMembershipType = options?.membershipType;
        return [];
    }) as typeof searchModule.searchKnowledge;

    t.after(() => {
        promptBuilderModule.buildPromptWithSources = originalBuildPromptWithSources;
        promptBuilderModule.calculatePromptBudget = originalGetPromptBudget;
        searchModule.searchKnowledge = originalSearchKnowledge;
        delete require.cache[require.resolve('../lib/chat/preview-context')];
    });

    delete require.cache[require.resolve('../lib/chat/preview-context')];
    const { buildPreviewPromptContext } = await import('../lib/chat/preview-context');
    await buildPreviewPromptContext({
        auth: {
            user: { id: 'user-1' },
            supabase: {
                from(table: string) {
                    if (table === 'user_settings') {
                        return {
                            select() {
                                return {
                                    eq() {
                                        return {
                                            maybeSingle: async () => ({
                                                data: {
                                                    expression_style: 'direct',
                                                    user_profile: {},
                                                    custom_instructions: '',
                                                    prompt_kb_ids: ['kb-1'],
                                                    visualization_settings: null,
                                                },
                                                error: null,
                                            }),
                                        };
                                    },
                                };
                            },
                        };
                    }

                    if (table === 'knowledge_bases') {
                        return {
                            select() {
                                return {
                                    eq() {
                                        return {
                                            in: async () => ({
                                                data: [{ id: 'kb-1', name: '知识库', weight: 'normal' }],
                                                error: null,
                                            }),
                                        };
                                    },
                                };
                            },
                        };
                    }

                    return {
                        select() {
                            return {
                                eq() {
                                    return {
                                        maybeSingle: async () => ({ data: null, error: null }),
                                    };
                                },
                            };
                        },
                    };
                },
            },
        } as never,
        body: {
            messages: [
                {
                    id: 'm1',
                    role: 'user',
                    content: '帮我查一下知识库内容',
                    createdAt: new Date().toISOString(),
                },
            ],
            expressionStyle: 'gentle',
        },
        requestedModelId: 'deepseek-chat',
        reasoningEnabled: false,
        membershipType: 'pro',
        knowledgeBaseFeatureEnabled: true,
        accessTokenForKB: 'token-1',
        sharedPromptContextBuilder: (async () => {
            throw new Error('sharedPromptContextBuilder should not be used in override mode');
        }) as never,
    });

    assert.equal(capturedMembershipType, 'pro');
});
