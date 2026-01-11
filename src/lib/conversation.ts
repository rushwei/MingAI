/**
 * 对话历史存储逻辑
 * 
 * 使用 Supabase 存储对话历史，支持跨设备同步
 */

import { supabase } from './supabase';
import type { ChatMessage, AIPersonality, Conversation } from '@/types';

// ===== 类型定义 =====

export interface ConversationWithContext extends Conversation {
    baziContext?: string;
    ziweiContext?: string;
}

// ===== 对话管理函数 =====

/**
 * 创建新对话
 */
export async function createConversation(params: {
    userId: string;
    personality?: AIPersonality;
    title?: string;
    baziChartId?: string;
    ziweiChartId?: string;
}): Promise<string | null> {
    const { data, error } = await supabase
        .from('conversations')
        .insert({
            user_id: params.userId,
            personality: params.personality || 'master',
            title: params.title || '新对话',
            bazi_chart_id: params.baziChartId,
            ziwei_chart_id: params.ziweiChartId,
            messages: [],
        })
        .select('id')
        .single();

    if (error) {
        console.error('创建对话失败:', error);
        return null;
    }

    return data?.id || null;
}

/**
 * 加载用户对话列表
 */
export async function loadConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('加载对话列表失败:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        baziChartId: row.bazi_chart_id,
        ziweiChartId: row.ziwei_chart_id,
        personality: row.personality as AIPersonality,
        title: row.title,
        messages: (row.messages as ChatMessage[]) || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        sourceType: row.source_type || 'chat',
        sourceData: row.source_data,
    }));
}

/**
 * 加载单个对话
 */
export async function loadConversation(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

    if (error || !data) {
        console.error('加载对话失败:', error);
        return null;
    }

    return {
        id: data.id,
        userId: data.user_id,
        baziChartId: data.bazi_chart_id,
        ziweiChartId: data.ziwei_chart_id,
        personality: data.personality as AIPersonality,
        title: data.title,
        messages: (data.messages as ChatMessage[]) || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        sourceType: data.source_type || 'chat',
        sourceData: data.source_data,
    };
}

/**
 * 保存对话消息
 */
export async function saveConversation(
    conversationId: string,
    messages: ChatMessage[],
    title?: string
): Promise<boolean> {
    const updateData: Record<string, unknown> = {
        messages,
        updated_at: new Date().toISOString(),
    };

    if (title) {
        updateData.title = title;
    }

    const { error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId);

    if (error) {
        console.error('保存对话失败:', error);
        return false;
    }

    return true;
}

/**
 * 删除对话
 */
export async function deleteConversation(conversationId: string): Promise<boolean> {
    const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

    if (error) {
        console.error('删除对话失败:', error);
        return false;
    }

    return true;
}

/**
 * 重命名对话
 */
export async function renameConversation(
    conversationId: string,
    title: string
): Promise<boolean> {
    const { error } = await supabase
        .from('conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    if (error) {
        console.error('重命名对话失败:', error);
        return false;
    }

    return true;
}

/**
 * 更新对话人格
 */
export async function updateConversationPersonality(
    conversationId: string,
    personality: AIPersonality
): Promise<boolean> {
    const { error } = await supabase
        .from('conversations')
        .update({ personality })
        .eq('id', conversationId);

    if (error) {
        console.error('更新人格失败:', error);
        return false;
    }

    return true;
}

/**
 * 更新对话关联的命盘
 */
export async function updateConversationCharts(
    conversationId: string,
    charts: { baziChartId?: string | null; ziweiChartId?: string | null }
): Promise<boolean> {
    const { error } = await supabase
        .from('conversations')
        .update({
            bazi_chart_id: charts.baziChartId ?? null,
            ziwei_chart_id: charts.ziweiChartId ?? null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

    if (error) {
        console.error('更新对话命盘失败:', error);
        return false;
    }

    return true;
}

/**
 * 获取对话的命盘上下文（用于 AI 记忆）
 */
export async function getConversationContext(conversationId: string): Promise<string> {
    const { data } = await supabase
        .from('conversations')
        .select(`
            bazi_chart_id,
            ziwei_chart_id,
            bazi_charts:bazi_chart_id(chart_data, name),
            ziwei_charts:ziwei_chart_id(chart_data, name)
        `)
        .eq('id', conversationId)
        .single();

    if (!data) return '';

    const parts: string[] = [];

    if (data.bazi_charts) {
        const bazi = data.bazi_charts as unknown as { name?: string; chart_data?: unknown };
        if (bazi.name) {
            parts.push(`用户八字命盘(${bazi.name})已关联`);
        }
    }

    if (data.ziwei_charts) {
        const ziwei = data.ziwei_charts as unknown as { name?: string; chart_data?: unknown };
        if (ziwei.name) {
            parts.push(`用户紫微命盘(${ziwei.name})已关联`);
        }
    }

    return parts.join('。');
}

/**
 * 自动生成对话标题（基于首条消息）
 */
export function generateConversationTitle(messages: ChatMessage[]): string {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return '新对话';

    const content = firstUserMessage.content.trim();
    if (content.length <= 20) return content;
    return content.substring(0, 20) + '...';
}
