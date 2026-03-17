/**
 * AI 对话 API 路由
 *
 * 路由仅负责协议层：
 * - 请求解析与错误边界
 * - 复用 server-only chat orchestration
 * - 返回 JSON / SSE 响应
 */

import { NextRequest } from 'next/server';
import { callAI, callAIStream } from '@/lib/ai/ai';
import { addCredits } from '@/lib/user/credits';
import { jsonError, jsonOk } from '@/lib/api-utils';
import {
  parseChatRequestBody,
  prepareChatRequest,
} from '@/lib/server/chat/request';
import { createChatStreamResponse } from '@/lib/server/chat/stream-response';

export async function POST(request: NextRequest) {
  let creditDeducted = false;
  let userId: string | null = null;
  let canSkipCredit = false;

  try {
    const body = await parseChatRequestBody(request);
    if (body instanceof Response) {
      return body;
    }

    const preparedRequest = await prepareChatRequest(request, body);
    if (preparedRequest instanceof Response) {
      return preparedRequest;
    }

    ({
      creditDeducted,
      userId,
      canSkipCredit,
    } = preparedRequest);

    const {
      body: resolvedBody,
      requestedModelId,
      reasoningEnabled,
      sanitizedMessages,
      metadata,
      fallbackPersonality,
      systemPrompt,
    } = preparedRequest;

    if (resolvedBody.stream) {
      const streamBody = await callAIStream(
        sanitizedMessages,
        fallbackPersonality,
        '',
        requestedModelId,
        { reasoning: reasoningEnabled, systemPromptOverride: systemPrompt }
      );

      return createChatStreamResponse({
        streamBody,
        metadata,
        userId,
        canSkipCredit,
      });
    }

    const content = await callAI(
      sanitizedMessages,
      fallbackPersonality,
      requestedModelId,
      '',
      { reasoning: reasoningEnabled, systemPromptOverride: systemPrompt }
    );

    return jsonOk({ content, metadata });
  } catch (error) {
    if (creditDeducted && userId && !canSkipCredit) {
      await addCredits(userId, 1);
    }

    console.error('AI API 错误:', error);
    return jsonError('服务暂时不可用', 500);
  }
}
