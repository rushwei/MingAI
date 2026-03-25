import 'server-only';

import type { NextRequest } from 'next/server';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { getDefaultModelConfigAsync, getModelConfigAsync } from '@/lib/server/ai-config';
import { getEffectiveMembershipType } from '@/lib/user/membership-server';
import { isModelAllowedForMembership, isReasoningAllowedForMembership } from '@/lib/ai/ai-access';
import { getAuthContext, getSystemAdminClient, jsonError, requireUserContext } from '@/lib/api-utils';
import { buildChatPromptContext } from '@/lib/server/chat/prompt-context';
import { addCredits, hasCredits, useCredit as deductCredit } from '@/lib/user/credits';
import type { ChatMessage, DifyContext } from '@/types';
import type { Mention } from '@/types/mentions';
import { normalizeVisualizationSettings, type VisualizationSettings } from '@/lib/visualization/settings';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

export interface ChatRequestBody {
  messages: ChatMessage[];
  skipCreditCheck?: boolean;
  internalSecret?: string;
  stream?: boolean;
  mangpaiMode?: boolean;
  model?: string;
  reasoning?: boolean;
  difyContext?: DifyContext;
  mentions?: Mention[];
  dreamMode?: boolean;
  expressionStyle?: 'direct' | 'gentle';
  customInstructions?: string;
  userProfile?: unknown;
  visualizationSettings?: VisualizationSettings;
}

export interface ResolvedChatRequest {
  body: ChatRequestBody;
  userId: string | null;
  canSkipCredit: boolean;
  accessTokenForKB: string | null;
  requestedModelId: string;
  membershipType: Awaited<ReturnType<typeof getEffectiveMembershipType>>;
  reasoningEnabled: boolean;
  creditDeducted: boolean;
}

export type PreparedChatRequest =
  ResolvedChatRequest &
  Awaited<ReturnType<typeof buildChatPromptContext>>;

async function resolveUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const authClient = getSystemAdminClient();
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace(/Bearer\s+/i, '');
      try {
        const { data: { user } } = await authClient.auth.getUser(token);
        if (user?.id) return user.id;
      } catch {
        // 在受限环境或测试环境中允许降级
      }
    }

    const accessToken = request.cookies.get('sb-access-token')?.value;
    if (accessToken) {
      try {
        const { data: { user } } = await authClient.auth.getUser(accessToken);
        if (user?.id) return user.id;
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function parseChatRequestBody(request: NextRequest): Promise<ChatRequestBody | Response> {
  const body = await request.json() as ChatRequestBody;
  if (!body.messages || !Array.isArray(body.messages)) {
    return jsonError('无效的消息格式', 400);
  }
  console.log(`[chat-parse] mentions=${JSON.stringify(body.mentions)} msgCount=${body.messages.length}`);
  body.visualizationSettings = normalizeVisualizationSettings(body.visualizationSettings);
  return body;
}

export async function resolveChatRequest(
  request: NextRequest,
  body: ChatRequestBody,
): Promise<ResolvedChatRequest | Response> {
  const canSkipCredit = !!(INTERNAL_SECRET && body.skipCreditCheck && body.internalSecret === INTERNAL_SECRET);

  let accessTokenForKB: string | null = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    accessTokenForKB = authHeader.replace(/Bearer\s+/i, '');
  }

  if (!accessTokenForKB) {
    accessTokenForKB = request.cookies.get('sb-access-token')?.value ?? null;
  }

  let userId: string | null = null;
  if (canSkipCredit) {
    try {
      const { user } = await getAuthContext(request);
      userId = user?.id || null;
    } catch {
      userId = await resolveUserIdFromRequest(request);
    }
  } else {
    try {
      const auth = await requireUserContext(request);
      if ('error' in auth) {
        userId = await resolveUserIdFromRequest(request);
        if (!userId) {
          return jsonError(auth.error.message, auth.error.status);
        }
      } else {
        userId = auth.user.id;
        if (!accessTokenForKB) {
          try {
            const { data: { session } } = await auth.supabase.auth.getSession();
            accessTokenForKB = session?.access_token || null;
          } catch {
            // ignore
          }
        }
      }
    } catch {
      userId = await resolveUserIdFromRequest(request);
      if (!userId) {
        return jsonError('请先登录', 401);
      }
    }
  }

  const requestedModelId = body.model?.trim() || DEFAULT_MODEL_ID;
  const modelConfig = requestedModelId
    ? await getModelConfigAsync(requestedModelId)
    : await getDefaultModelConfigAsync('chat');
  if (!modelConfig) {
    return jsonError('无效的模型', 400);
  }

  const membershipType = userId
    ? await getEffectiveMembershipType(userId)
    : 'free';
  if (!isModelAllowedForMembership(modelConfig, membershipType)) {
    return jsonError('当前会员等级无法使用该模型', 403);
  }

  const reasoningAllowed = isReasoningAllowedForMembership(modelConfig, membershipType);
  const reasoningEnabled = reasoningAllowed ? !!body.reasoning : false;

  let creditDeducted = false;
  if (userId && !canSkipCredit) {
    const hasEnough = await hasCredits(userId);
    if (!hasEnough) {
      return jsonError('积分不足，请充值后继续使用', 402, {
        code: 'INSUFFICIENT_CREDITS',
        needRecharge: true,
      });
    }

    // 流式与非流式统一预扣费，避免并发流式请求在完成后扣费时漏计。
    const remaining = await deductCredit(userId);
    if (remaining === null) {
      return jsonError('积分扣减失败，请重试', 500, {
        code: 'CREDIT_DEDUCTION_FAILED',
      });
    }
    creditDeducted = true;
  }

  return {
    body,
    userId,
    canSkipCredit,
    accessTokenForKB,
    requestedModelId: modelConfig.id,
    membershipType,
    reasoningEnabled,
    creditDeducted,
  };
}

export async function prepareChatRequest(
  request: NextRequest,
  body: ChatRequestBody,
): Promise<PreparedChatRequest | Response> {
  const resolvedRequest = await resolveChatRequest(request, body);
  if (resolvedRequest instanceof Response) {
    return resolvedRequest;
  }

  try {
    const promptContext = await buildChatPromptContext(resolvedRequest);
    return {
      ...resolvedRequest,
      ...promptContext,
    };
  } catch (error) {
    if (resolvedRequest.creditDeducted && resolvedRequest.userId && !resolvedRequest.canSkipCredit) {
      await addCredits(resolvedRequest.userId, 1);
    }
    throw error;
  }
}
