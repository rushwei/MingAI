/**
 * 占卜路由工厂
 *
 * 封装 9 条占卜路由共享的 7 步流水线：
 * 1. Auth (requireBearerUser)
 * 2. Credits + membership check (getUserAuthInfo)
 * 3. Model access resolution (resolveModelAccessAsync)
 * 4. Credit deduction (useCredit)
 * 5. AI call (stream / non-stream, text / vision)
 * 6. Persist conversation (createAIAnalysisConversation)
 * 7. Refund on failure (addCredits)
 */

import { type NextRequest } from 'next/server';
import { jsonError, requireBearerUser } from '@/lib/api-utils';
import { getUserAuthInfo, useCredit, addCredits } from '@/lib/user/credits';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { resolveModelAccessAsync } from '@/lib/ai/ai-access';
import { callAIWithReasoning, callAIStream, readAIStream } from '@/lib/ai/ai';
import { createAIAnalysisConversation } from '@/lib/ai/ai-analysis';
import type { AIModelConfig } from '@/types';
import type { AIPersonality } from '@/types';

// ─── Types ───

export interface InterpretInput {
  /** Raw parsed body fields — shape is route-specific */
  [key: string]: unknown;
}

export interface InterpretPrompts {
  systemPrompt: string;
  userPrompt: string;
}

export interface DivinationRouteConfig<T extends InterpretInput = InterpretInput> {
  /** conversations.source_type */
  sourceType: string;
  /** Log tag, e.g. 'tarot', 'liuyao' */
  tag: string;
  /** Parse & validate the request body. Return parsed input or an error. */
  parseInput: (body: unknown) => T | { error: string; status: number };
  /** Build system + user prompts from parsed input. */
  buildPrompts: (input: T) => InterpretPrompts;
  /** Build source_data for createAIAnalysisConversation. */
  buildSourceData: (input: T, modelId: string, reasoningEnabled: boolean) => Record<string, unknown>;
  /** Generate conversation title. */
  generateTitle: (input: T) => string;
  /** Default model ID (defaults to DEFAULT_MODEL_ID). */
  defaultModelId?: string;
  /** AI personality for the call (defaults to 'general'). */
  personality?: AIPersonality;
  /** Whether this is a vision route (face/palm). */
  isVision?: boolean;
  /** Vision-specific options builder. Only used when isVision=true. */
  buildVisionOptions?: (input: T) => { imageBase64: string; imageMimeType: string };
  /** resolveModelAccessAsync extra options (e.g. requireVision). */
  modelAccessOptions?: {
    requireVision?: boolean;
    membershipDeniedMessage?: string;
  };
  /**
   * Optional post-persist hook. Called after conversation is created.
   * Use for updating reading/divination records with conversation_id.
   */
  persistRecord?: (
    input: T,
    userId: string,
    conversationId: string | null,
  ) => Promise<void>;
}

// ─── SSE response headers ───

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
} as const;

// ─── Factory ───

/**
 * Create a POST handler that runs the 7-step interpret pipeline.
 *
 * The returned handler:
 * 1. Authenticates via Bearer token
 * 2. Checks credits & membership
 * 3. Resolves model access
 * 4. Deducts a credit
 * 5. Calls AI (stream or non-stream; text or vision)
 * 6. Persists the conversation
 * 7. Refunds on failure
 */
export function createInterpretHandler<T extends InterpretInput>(
  config: DivinationRouteConfig<T>,
) {
  const {
    sourceType,
    tag,
    parseInput,
    buildPrompts,
    buildSourceData,
    generateTitle,
    defaultModelId = DEFAULT_MODEL_ID,
    personality = 'general',
    isVision = false,
    buildVisionOptions,
    modelAccessOptions,
    persistRecord,
  } = config;

  return async function handleInterpret(
    request: NextRequest,
    body: Record<string, unknown>,
  ): Promise<Response> {
    // Parse input first (fast fail for invalid params)
    const parsed = parseInput(body);
    if (parsed && typeof parsed === 'object' && 'error' in parsed && 'status' in parsed) {
      const err = parsed as { error: string; status: number };
      return jsonError(err.error, err.status, { success: false });
    }
    const input = parsed as T;

    // 1. Auth
    const authResult = await requireBearerUser(request);
    if ('error' in authResult) {
      return jsonError(authResult.error.message, authResult.error.status, { success: false });
    }
    const { user } = authResult;

    // 2. Credits + membership
    const authInfo = await getUserAuthInfo(user.id);
    if (!authInfo || !authInfo.hasCredits) {
      return jsonError('积分不足，请充值后使用', 403, { success: false });
    }

    // 3. Model access
    const modelId = (body.modelId as string | undefined);
    const reasoning = (body.reasoning as boolean | undefined);
    const stream = (body.stream as boolean | undefined);
    const membershipType = authInfo.effectiveMembership;
    const access = await resolveModelAccessAsync(
      modelId, defaultModelId, membershipType, reasoning, modelAccessOptions,
    );
    if ('error' in access) {
      return jsonError(access.error, access.status, { success: false });
    }
    const { modelId: resolvedModelId, modelConfig, reasoningEnabled } = access;

    // Build prompts
    const { systemPrompt, userPrompt } = buildPrompts(input);

    // 4. Deduct credit
    // eslint-disable-next-line react-hooks/rules-of-hooks -- useCredit is a server function, not a React hook
    const remaining = await useCredit(user.id);
    if (remaining === null) {
      return jsonError('积分扣减失败，请稍后重试', 500, { success: false });
    }

    // 5 + 6 + 7: AI call, persist, refund on failure
    try {
      if (isVision && buildVisionOptions) {
        return await handleVisionCall(
          input, user.id, resolvedModelId, modelConfig, reasoningEnabled,
          systemPrompt, userPrompt,
        );
      }

      if (stream) {
        return await handleStreamCall(
          input, user.id, resolvedModelId, reasoningEnabled,
          systemPrompt, userPrompt,
        );
      }

      return await handleNonStreamCall(
        input, user.id, resolvedModelId, reasoningEnabled,
        systemPrompt, userPrompt,
      );
    } catch (aiError) {
      await addCredits(user.id, 1);
      console.error(`[${tag}] AI 调用失败:`, aiError);
      return jsonError('AI 分析失败，请稍后重试', 500, { success: false });
    }
  };

  // ── Vision (non-stream) ──
  async function handleVisionCall(
    input: T, userId: string, resolvedModelId: string,
    modelConfig: AIModelConfig, reasoningEnabled: boolean,
    systemPrompt: string, userPrompt: string,
  ): Promise<Response> {
    const { getProvider } = await import('@/lib/ai/providers');
    const visionOpts = buildVisionOptions!(input);
    const provider = getProvider(modelConfig);
    const analysisResult = await provider.chat(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
      modelConfig,
      { reasoning: reasoningEnabled, temperature: 0.7, ...visionOpts },
    );

    const conversationId = await persistConversation(
      input, userId, resolvedModelId, reasoningEnabled, analysisResult, null,
    );
    if (persistRecord) {
      await persistRecord(input, userId, conversationId);
    }

    return jsonOk({
      success: true,
      data: { analysis: analysisResult, conversationId },
    });
  }

  // ── Stream ──
  async function handleStreamCall(
    input: T, userId: string, resolvedModelId: string,
    reasoningEnabled: boolean, systemPrompt: string, userPrompt: string,
  ): Promise<Response> {
    const streamBody = await callAIStream(
      [{ role: 'user', content: userPrompt }],
      personality,
      `\n\n${systemPrompt}\n\n`,
      resolvedModelId,
      { reasoning: reasoningEnabled, temperature: 0.7 },
    );
    const [clientStream, tapStream] = streamBody.tee();

    void (async () => {
      try {
        const { content, reasoning: reasoningText } = await readAIStream(tapStream);
        const conversationId = await persistConversation(
          input, userId, resolvedModelId, reasoningEnabled, content, reasoningText ?? null,
        );
        if (persistRecord) {
          await persistRecord(input, userId, conversationId);
        }
      } catch (err) {
        console.error(`[${tag}] 流式结果保存失败:`, err);
      }
    })();

    return new Response(clientStream, { headers: SSE_HEADERS });
  }

  // ── Non-stream ──
  async function handleNonStreamCall(
    input: T, userId: string, resolvedModelId: string,
    reasoningEnabled: boolean, systemPrompt: string, userPrompt: string,
  ): Promise<Response> {
    const { content, reasoning: reasoningText } = await callAIWithReasoning(
      [{ role: 'user', content: userPrompt }],
      personality,
      resolvedModelId,
      `\n\n${systemPrompt}\n\n`,
      { reasoning: reasoningEnabled, temperature: 0.7 },
    );

    const conversationId = await persistConversation(
      input, userId, resolvedModelId, reasoningEnabled, content, reasoningText ?? null,
    );
    if (persistRecord) {
      await persistRecord(input, userId, conversationId);
    }

    return jsonOk({
      success: true,
      data: { analysis: content, reasoning: reasoningText, conversationId },
    });
  }

  // ── Shared persistence ──
  async function persistConversation(
    input: T, userId: string, resolvedModelId: string,
    reasoningEnabled: boolean, aiResponse: string, reasoningText: string | null,
  ): Promise<string | null> {
    const sourceData = buildSourceData(input, resolvedModelId, reasoningEnabled);
    if (reasoningText) {
      sourceData.reasoning_text = reasoningText;
    }
    return createAIAnalysisConversation({
      userId,
      sourceType: sourceType as Parameters<typeof createAIAnalysisConversation>[0]['sourceType'],
      sourceData,
      title: generateTitle(input),
      aiResponse,
    });
  }
}

// Re-export jsonOk for use in route files that import from this module
import { jsonOk } from '@/lib/api-utils';
export { jsonOk, jsonError };
