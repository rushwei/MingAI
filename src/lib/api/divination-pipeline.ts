/**
 * 占卜路由工厂
 *
 * 封装 9 条占卜路由共享的 8 步流水线：
 * 1. Auth (requireBearerUser)
 * 2. Route precheck
 * 3. Async prompt-context resolve / request validation
 * 4. Credits + membership check (getUserAuthInfo)
 * 5. Model access resolution (resolveModelAccessAsync)
 * 6. Credit deduction (useCredit)
 * 7. AI call (stream / non-stream, text / vision)
 * 8. Persist conversation + refund on failure
 */

import { type NextRequest } from 'next/server';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { jsonError, requireBearerUser, requireUserContext, SSE_HEADERS } from '@/lib/api-utils';
import { getUserAuthInfo, useCredit, addCredits } from '@/lib/user/credits';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { resolveModelAccessAsync } from '@/lib/ai/ai-access';
import { callAIWithReasoning, callAIUIMessageResult, callAIVision } from '@/lib/ai/ai';
import {
  AIAnalysisConversationPersistenceError,
  createAIAnalysisConversation,
} from '@/lib/ai/ai-analysis';
import type { AIModelConfig } from '@/types';
import type { AIPersonality } from '@/types';
import type { ChartType } from '@/lib/visualization/chart-types';
import { buildVisualizationOutputContractPrompt } from '@/lib/visualization/prompt';
import type { ChartTextDetailLevel } from '@/lib/divination/detail-level';

// ─── Types ───

export interface InterpretInput {
  /** Raw parsed body fields — shape is route-specific */
  [key: string]: unknown;
}

export interface InterpretPrompts {
  systemPrompt: string;
  userPrompt: string;
}

export interface InterpretPromptContext {
  userId: string;
  chartPromptDetailLevel: ChartTextDetailLevel;
  [key: string]: unknown;
}

type RouteError = { error: string; status: number };

type AuthMethod = 'bearer' | 'userContext';

function isRouteError(value: unknown): value is RouteError {
  return Boolean(value && typeof value === 'object' && 'error' in value && 'status' in value);
}

export interface DivinationRouteConfig<
  T extends InterpretInput = InterpretInput,
  TContext extends InterpretPromptContext = InterpretPromptContext,
> {
  /** conversations.source_type */
  sourceType: string | ((input: T, context?: TContext) => string);
  /** Log tag, e.g. 'tarot', 'liuyao' */
  tag: string;
  /** Auth strategy (defaults to Bearer token). */
  authMethod?: AuthMethod;
  /** Parse & validate the request body. Return parsed input or an error. */
  parseInput: (body: unknown) => T | RouteError;
  /** Optional async precheck after auth but before AI pipeline continues. */
  precheck?: (request: NextRequest, input: T, userId: string) => Promise<RouteError | null> | RouteError | null;
  /** Build system + user prompts from parsed input. */
  buildPrompts: (input: T, context?: TContext) => InterpretPrompts | Promise<InterpretPrompts>;
  /** Optional prompt context resolver (used for user settings such as chart prompt detail level). */
  resolvePromptContext?: (input: T, userId: string) => Promise<TContext | RouteError> | TContext | RouteError;
  /** Build source_data for createAIAnalysisConversation. */
  buildSourceData: (input: T, modelId: string, reasoningEnabled: boolean, context?: TContext) => Record<string, unknown>;
  /** Generate conversation title. */
  generateTitle: (input: T, context?: TContext) => string;
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
  /** 该路由允许 AI 输出的可视化图表类型。传入后会自动在 system prompt 尾部追加图表输出合约。 */
  allowedChartTypes?: ChartType[] | ((input: T, context?: TContext) => ChartType[]);
  /** Empty AI result message. */
  emptyResultMessage?: string;
  /** Custom success response shape for non-stream routes. */
  formatSuccessResponse?: (result: {
    content: string;
    reasoning: string | null;
    conversationId: string | null;
  }) => Record<string, unknown>;
  /**
   * Optional transaction payload builder.
   * When provided, conversation persistence and record binding happen in one DB transaction.
   */
  buildHistoryBinding?: (
    input: T,
    userId: string,
    context?: TContext,
  ) => Parameters<typeof createAIAnalysisConversation>[0]['historyBinding'];
  /**
   * Optional post-persist hook. Called after conversation is created.
   * Keep this only for paths that do not need multi-write transactional persistence.
   */
  persistRecord?: (
    input: T,
    userId: string,
    conversationId: string | null,
    context?: TContext,
  ) => Promise<void>;
}

export interface PersistentStreamResult {
  error?: string | null;
}

export function createPersistentStreamResponse({
  streamResult,
  onStreamComplete,
}: {
  streamResult: Awaited<ReturnType<typeof callAIUIMessageResult>>;
  onStreamComplete: (result: { content: string; reasoning: string | null }) => Promise<PersistentStreamResult>;
}): Response {
  const uiStream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.merge(streamResult.toUIMessageStream({
        sendReasoning: true,
        sendSources: false,
        sendStart: false,
        sendFinish: false,
        onFinish: async ({ responseMessage, finishReason, isAborted }) => {
          if (isAborted) {
            return;
          }

          let content = '';
          let reasoning = '';

          for (const part of responseMessage.parts) {
            if (part.type === 'text') {
              content += part.text;
            } else if (part.type === 'reasoning') {
              reasoning += part.text;
            }
          }

          const persistenceResult = await onStreamComplete({
            content,
            reasoning: reasoning || null,
          });
          if (persistenceResult.error) {
            writer.write({ type: 'error', errorText: persistenceResult.error });
          }
          writer.write({ type: 'finish', finishReason });
        },
      }));
    },
  });

  return createUIMessageStreamResponse({
    stream: uiStream,
    headers: {
      ...SSE_HEADERS,
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ─── Factory ───

/**
 * Create a POST handler that runs the shared interpret pipeline.
 *
 * The returned handler:
 * 1. Authenticates via Bearer token
 * 2. Runs route-specific precheck
 * 3. Resolves async prompt context / validation
 * 4. Checks credits & membership
 * 5. Resolves model access
 * 6. Deducts a credit
 * 7. Calls AI (stream or non-stream; text or vision)
 * 8. Persists the conversation and refunds on failure
 */
export function createInterpretHandler<
  T extends InterpretInput,
  TContext extends InterpretPromptContext = InterpretPromptContext,
>(
  config: DivinationRouteConfig<T, TContext>,
) {
  const {
    sourceType,
    tag,
    authMethod = 'bearer',
    parseInput,
    precheck,
    buildPrompts,
    resolvePromptContext,
    buildSourceData,
    generateTitle,
    defaultModelId = DEFAULT_MODEL_ID,
    personality = 'general',
    isVision = false,
    buildVisionOptions,
    modelAccessOptions,
    allowedChartTypes,
    emptyResultMessage = 'AI 分析结果为空，请稍后重试',
    formatSuccessResponse,
    buildHistoryBinding,
    persistRecord,
  } = config;

  return async function handleInterpret(
    request: NextRequest,
    body: Record<string, unknown>,
  ): Promise<Response> {
    // Parse input first (fast fail for invalid params)
    const parsed = parseInput(body);
    if (isRouteError(parsed)) {
      return jsonError(parsed.error, parsed.status, { success: false });
    }
    const input = parsed as T;

    // 1. Auth
    const authResult = authMethod === 'userContext'
      ? await requireUserContext(request)
      : await requireBearerUser(request);
    if ('error' in authResult) {
      return jsonError(authResult.error.message, authResult.error.status, { success: false });
    }
    const { user } = authResult;

    const precheckResult = precheck ? await precheck(request, input, user.id) : null;
    if (precheckResult) {
      return jsonError(precheckResult.error, precheckResult.status, { success: false });
    }

    const promptContextResult = resolvePromptContext
      ? await resolvePromptContext(input, user.id)
      : undefined;
    if (isRouteError(promptContextResult)) {
      return jsonError(promptContextResult.error, promptContextResult.status, { success: false });
    }
    const promptContext = promptContextResult as TContext | undefined;

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

    // Build prompts, optionally appending visualization output contract
    const { systemPrompt: rawSystemPrompt, userPrompt } = await buildPrompts(input, promptContext);
    const resolvedAllowedChartTypes = typeof allowedChartTypes === 'function'
      ? allowedChartTypes(input, promptContext)
      : allowedChartTypes;
    const systemPrompt = resolvedAllowedChartTypes?.length
      ? `${rawSystemPrompt}\n\n${buildVisualizationOutputContractPrompt(resolvedAllowedChartTypes)}`
      : rawSystemPrompt;

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
          systemPrompt, userPrompt, promptContext,
        );
      }

      if (stream) {
        return await handleStreamCall(
          input, user.id, resolvedModelId, reasoningEnabled,
          systemPrompt, userPrompt, promptContext,
        );
      }

      return await handleNonStreamCall(
        input, user.id, resolvedModelId, reasoningEnabled,
        systemPrompt, userPrompt, promptContext,
      );
    } catch (aiError) {
      if (aiError instanceof AIAnalysisConversationPersistenceError) {
        await addCredits(user.id, 1);
        console.error(`[${tag}] 分析结果保存失败:`, aiError);
        return jsonError('保存结果失败，请稍后重试', 500, { success: false });
      }

      await addCredits(user.id, 1);
      console.error(`[${tag}] AI 调用失败:`, aiError);
      return jsonError('AI 分析失败，请稍后重试', 500, { success: false });
    }
  };

  // ── Vision (non-stream) ──
  async function handleVisionCall(
    input: T, userId: string, resolvedModelId: string,
    _modelConfig: AIModelConfig, reasoningEnabled: boolean,
    systemPrompt: string, userPrompt: string,
    promptContext?: TContext,
  ): Promise<Response> {
    const visionOpts = buildVisionOptions!(input);
    const analysisResult = await callAIVision(
      [{ role: 'user', content: userPrompt }],
      personality,
      resolvedModelId,
      `\n\n${systemPrompt}\n\n`,
      { reasoning: reasoningEnabled, temperature: 0.7, ...visionOpts },
    );

    const conversationId = await persistConversation(
      input, userId, resolvedModelId, reasoningEnabled, analysisResult, null, promptContext,
    );
    if (persistRecord) {
      await persistRecord(input, userId, conversationId, promptContext);
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
    promptContext?: TContext,
  ): Promise<Response> {
    const streamResult = await callAIUIMessageResult(
      [{ role: 'user', content: userPrompt }],
      personality,
      `\n\n${systemPrompt}\n\n`,
      resolvedModelId,
      { reasoning: reasoningEnabled, temperature: 0.7 },
    );
    return createPersistentStreamResponse({
      streamResult,
      onStreamComplete: async ({ content, reasoning }) => {
        try {
          if (!content?.trim()) {
            await addCredits(userId, 1);
            return { error: emptyResultMessage };
          }
          const conversationId = await persistConversation(
            input, userId, resolvedModelId, reasoningEnabled, content, reasoning, promptContext,
          );
          if (persistRecord) {
            await persistRecord(input, userId, conversationId, promptContext);
          }
          return {};
        } catch (err) {
          console.error(`[${tag}] 流式结果保存失败:`, err);
          return { error: '保存结果失败，请稍后重试' };
        }
      },
    });
  }

  // ── Non-stream ──
  async function handleNonStreamCall(
    input: T, userId: string, resolvedModelId: string,
    reasoningEnabled: boolean, systemPrompt: string, userPrompt: string,
    promptContext?: TContext,
  ): Promise<Response> {
    const { content, reasoning: reasoningText } = await callAIWithReasoning(
      [{ role: 'user', content: userPrompt }],
      personality,
      resolvedModelId,
      `\n\n${systemPrompt}\n\n`,
      { reasoning: reasoningEnabled, temperature: 0.7 },
    );
    if (!content?.trim()) {
      await addCredits(userId, 1);
      return jsonError(emptyResultMessage, 500, { success: false });
    }

    const conversationId = await persistConversation(
      input, userId, resolvedModelId, reasoningEnabled, content, reasoningText ?? null, promptContext,
    );
    if (persistRecord) {
      await persistRecord(input, userId, conversationId, promptContext);
    }

    return jsonOk(
      formatSuccessResponse
        ? formatSuccessResponse({ content, reasoning: reasoningText ?? null, conversationId })
        : {
            success: true,
            data: { analysis: content, reasoning: reasoningText, conversationId },
          },
    );
  }

  // ── Shared persistence ──
  async function persistConversation(
    input: T, userId: string, resolvedModelId: string,
    reasoningEnabled: boolean, aiResponse: string, reasoningText: string | null,
    promptContext?: TContext,
  ): Promise<string> {
    const sourceData = buildSourceData(input, resolvedModelId, reasoningEnabled, promptContext);
    if (reasoningText) {
      sourceData.reasoning_text = reasoningText;
    }
    const resolvedSourceType = typeof sourceType === 'function'
      ? sourceType(input, promptContext)
      : sourceType;
    const conversationId = await createAIAnalysisConversation({
      userId,
      sourceType: resolvedSourceType as Parameters<typeof createAIAnalysisConversation>[0]['sourceType'],
      sourceData,
      title: generateTitle(input, promptContext),
      aiResponse,
      historyBinding: buildHistoryBinding
        ? buildHistoryBinding(input, userId, promptContext)
        : null,
    });

    if (typeof conversationId !== 'string' || conversationId.trim().length === 0) {
      throw new AIAnalysisConversationPersistenceError(
        resolvedSourceType as Parameters<typeof createAIAnalysisConversation>[0]['sourceType'],
        'createAIAnalysisConversation returned an invalid conversation id',
      );
    }

    return conversationId;
  }
}

// Re-export jsonOk for use in route files that import from this module
import { jsonOk } from '@/lib/api-utils';
export { jsonOk, jsonError };
