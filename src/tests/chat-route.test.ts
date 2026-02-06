import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.INTERNAL_API_SECRET = 'internal-secret';

const waitForMicrotask = () => new Promise((resolve) => setTimeout(resolve, 0));

test('chat route refunds credit when streaming reader throws after response starts', async (t) => {
    const aiModule = require('../lib/ai') as any;
    const creditsModule = require('../lib/credits') as any;
    const aiConfigModule = require('../lib/ai-config') as any;
    const aiAccessModule = require('../lib/ai-access') as any;
    const membershipServerModule = require('../lib/membership-server') as any;
    const promptBuilderModule = require('../lib/prompt-builder') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalCallAIStream = aiModule.callAIStream;
    const originalHasCredits = creditsModule.hasCredits;
    const originalUseCredit = creditsModule.useCredit;
    const originalAddCredits = creditsModule.addCredits;
    const originalGetModelConfigAsync = aiConfigModule.getModelConfigAsync;
    const originalIsModelAllowedForMembership = aiAccessModule.isModelAllowedForMembership;
    const originalIsReasoningAllowedForMembership = aiAccessModule.isReasoningAllowedForMembership;
    const originalGetEffectiveMembershipType = membershipServerModule.getEffectiveMembershipType;
    const originalBuildPromptWithSources = promptBuilderModule.buildPromptWithSources;
    const originalGetPromptBudget = promptBuilderModule.getPromptBudget;
    const originalResolvePersonalities = promptBuilderModule.resolvePersonalities;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;

    let refundCount = 0;

    const encoder = new TextEncoder();
    const failingStream = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"partial"}}]}\\n\\n'));
        },
        pull() {
            throw new Error('stream read failed');
        },
    });

    aiModule.callAIStream = async () => failingStream;
    creditsModule.hasCredits = async () => true;
    creditsModule.useCredit = async () => 0;
    creditsModule.addCredits = async () => {
        refundCount += 1;
        return 1;
    };

    aiConfigModule.getModelConfigAsync = async () => ({
        id: 'deepseek-chat',
        modelKey: 'deepseek-chat',
        vendor: 'deepseek',
        supportsReasoning: true,
        supportsVision: false,
        requiredTier: 'free',
    });
    aiAccessModule.isModelAllowedForMembership = () => true;
    aiAccessModule.isReasoningAllowedForMembership = () => true;
    membershipServerModule.getEffectiveMembershipType = async () => 'free';

    promptBuilderModule.getPromptBudget = async () => 1024;
    promptBuilderModule.resolvePersonalities = () => ({ personalities: ['general'] });
    promptBuilderModule.buildPromptWithSources = async () => ({
        userMessagePrefix: '',
        sources: [],
        diagnostics: [],
        totalTokens: 0,
        budgetTotal: 0,
        userMessageTokens: 0,
        systemPrompt: '',
    });

    supabaseServerModule.getServiceClient = () => ({
        auth: {
            getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
        },
        from: (table: string) => {
            if (table === 'user_settings') {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({ data: null, error: null }),
                        }),
                    }),
                };
            }
            if (table === 'knowledge_bases') {
                return {
                    select: () => ({
                        eq: () => ({
                            in: async () => ({ data: [], error: null }),
                        }),
                    }),
                };
            }
            return {
                select: () => ({
                    eq: () => ({
                        maybeSingle: async () => ({ data: null, error: null }),
                    }),
                }),
            };
        },
    });

    t.after(() => {
        aiModule.callAIStream = originalCallAIStream;
        creditsModule.hasCredits = originalHasCredits;
        creditsModule.useCredit = originalUseCredit;
        creditsModule.addCredits = originalAddCredits;
        aiConfigModule.getModelConfigAsync = originalGetModelConfigAsync;
        aiAccessModule.isModelAllowedForMembership = originalIsModelAllowedForMembership;
        aiAccessModule.isReasoningAllowedForMembership = originalIsReasoningAllowedForMembership;
        membershipServerModule.getEffectiveMembershipType = originalGetEffectiveMembershipType;
        promptBuilderModule.buildPromptWithSources = originalBuildPromptWithSources;
        promptBuilderModule.getPromptBudget = originalGetPromptBudget;
        promptBuilderModule.resolvePersonalities = originalResolvePersonalities;
        supabaseServerModule.getServiceClient = originalGetServiceClient;
    });

    const { POST } = await import('../app/api/chat/route');

    const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
            stream: true,
            messages: [
                {
                    id: 'm1',
                    role: 'user',
                    content: '你好',
                    createdAt: new Date().toISOString(),
                },
            ],
        }),
    });

    const response = await POST(request);
    await response.text().catch(() => undefined);
    await waitForMicrotask();

    assert.equal(refundCount, 1);
});
