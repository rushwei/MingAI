/**
 * AI 分析查询工具函数（客户端）
 *
 * 浏览器侧统一通过 feature API 查询历史分析与摘要。
 */

import type { ChatMessage } from '@/types';

export function extractAnalysisFromConversation(
    messages: ChatMessage[] = [],
    sourceData?: Record<string, unknown>
) {
    const assistant = messages.find(m => m.role === 'assistant');
    const modelId = typeof assistant?.model === 'string'
        ? assistant.model
        : typeof sourceData?.model_id === 'string'
            ? sourceData.model_id
            : null;
    const reasoning = typeof assistant?.reasoning === 'string'
        ? assistant.reasoning
        : typeof sourceData?.reasoning_text === 'string'
            ? sourceData.reasoning_text
            : null;

    return {
        analysis: assistant?.content || null,
        reasoning,
        modelId,
    };
}

export function hydrateConversationMessages(
    messages: ChatMessage[] = [],
    sourceData?: Record<string, unknown>
) {
    if (!sourceData) return messages;
    const modelId = typeof sourceData.model_id === 'string' ? sourceData.model_id : null;
    const reasoningText = typeof sourceData.reasoning_text === 'string' ? sourceData.reasoning_text : null;
    if (!modelId && !reasoningText) return messages;
    return messages.map(msg => {
        if (msg.role !== 'assistant') return msg;
        return {
            ...msg,
            model: msg.model || modelId || undefined,
            reasoning: msg.reasoning || reasoningText || undefined,
        };
    });
}

/**
 * 根据 chartId 查询最新的八字 AI 分析
 */
export async function getLatestBaziAnalysis(
    chartId: string,
    type: 'wuxing' | 'personality'
): Promise<string | null> {
    const sourceType = type === 'wuxing' ? 'bazi_wuxing' : 'bazi_personality';

    const query = new URLSearchParams({
        limit: '1',
        includeArchived: 'true',
        sourceType,
        baziChartId: chartId,
    });

    const response = await fetch(`/api/conversations?${query.toString()}`, {
        credentials: 'include',
    });
    if (!response.ok) {
        return null;
    }

    const payload = await response.json().catch(() => null) as {
        conversations?: Array<{ messages?: ChatMessage[] | null }>;
    } | null;
    const messages = payload?.conversations?.[0]?.messages;
    if (!messages?.length) return null;

    // 找到 AI 回复内容
    const aiMessage = messages.find((message) => message.role === 'assistant');
    return aiMessage?.content || null;
}

/**
 * 根据类型查询用户的历史记录列表（用于抽屉组件）
 */
export async function getHistoryList(
    userId: string,
    type: 'tarot' | 'liuyao' | 'mbti' | 'hepan'
): Promise<Array<{ id: string; title: string; createdAt: string }>> {
    void userId;

    const response = await fetch(`/api/history-summaries?type=${type}`, {
        credentials: 'include',
    });
    if (!response.ok) {
        return [];
    }

    const payload = await response.json().catch(() => null) as {
        items?: Array<{ id: string; title: string; createdAt: string }>;
    } | null;
    return payload?.items || [];
}
