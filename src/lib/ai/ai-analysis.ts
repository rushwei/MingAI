/**
 * AI 分析对话存储服务端函数
 * 
 * 用于各功能模块（普通聊天、八字五行、八字人格、塔罗、六爻、MBTI、合盘）的 AI 分析结果存储
 * 统一存入 conversations 表，通过 source_type 区分来源
 */

import { getSystemAdminClient } from '@/lib/api-utils';
import {
    getSourceDataModelId,
    getSourceDataReasoning,
    normalizeAnalysisSourceData,
    type AnalysisSourceData,
    type AnalysisSourceType,
} from '@/lib/source-contracts';
import { replaceConversationMessages } from '@/lib/server/conversation-messages';
import type { AIPersonality, ChatMessage } from '@/types';


const SOURCE_PERSONALITY_MAP: Partial<Record<AnalysisSourceType, AIPersonality>> = {
    bazi_wuxing: 'bazi',
    bazi_personality: 'bazi',
    tarot: 'tarot',
    liuyao: 'liuyao',
    mbti: 'mbti',
    hepan: 'hepan',
    qimen: 'qimen',
    daliuren: 'daliuren',
};

// 创建 AI 分析对话记录的参数
export interface CreateAIAnalysisParams {
    userId: string;
    sourceType: AnalysisSourceType;
    sourceData: AnalysisSourceData;
    title: string;
    aiResponse: string;
}

/**
 * 创建 AI 分析对话记录（服务端使用）
 * 绕过 RLS，用于 API 路由中保存 AI 分析结果
 */
export async function createAIAnalysisConversation(params: CreateAIAnalysisParams): Promise<string | null> {
    const serviceClient = getSystemAdminClient();
    const normalizedSourceData = normalizeAnalysisSourceData(params.sourceType, params.sourceData);

    const modelId = getSourceDataModelId(normalizedSourceData) ?? undefined;
    const reasoningText = getSourceDataReasoning(normalizedSourceData) ?? undefined;
    const createdAt = new Date().toISOString();
    const messages: ChatMessage[] = [
        {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: params.aiResponse,
            createdAt,
            model: modelId,
            reasoning: reasoningText,
        },
    ];

    const personality = SOURCE_PERSONALITY_MAP[params.sourceType] ?? 'general';
    const { data, error } = await serviceClient
        .from('conversations')
        .insert({
            user_id: params.userId,
            source_type: params.sourceType,
            source_data: normalizedSourceData,
            title: params.title,
            personality,
        })
        .select('id')
        .single();

    if (error) {
        console.error(`[${params.sourceType}] 创建 AI 分析对话失败:`, error.message);
        return null;
    }

    if (data?.id) {
        const syncResult = await replaceConversationMessages(serviceClient, data.id, messages);
        if (syncResult.error) {
            console.error(`[${params.sourceType}] 同步 AI 分析消息失败:`, syncResult.error.message);
            return null;
        }
    }

    return data?.id || null;
}

// 塔罗牌阵 ID 到中文名称的映射
const SPREAD_ID_TO_NAME: Record<string, string> = {
    'single': '单牌',
    'three-card': '三牌阵',
    'love': '爱情牌阵',
    'celtic-cross': '凯尔特十字',
};

/**
 * 生成塔罗牌分析标题
 */
export function generateTarotTitle(question: string | undefined, spreadId: string): string {
    const spreadName = SPREAD_ID_TO_NAME[spreadId] || spreadId || '自定义';
    if (question && question.trim()) {
        return `${question.trim().substring(0, 20)} - ${spreadName}`;
    }
    return `塔罗占卜 - ${spreadName}`;
}

/**
 * 生成六爻分析标题
 * @param hexagramName 主卦名称
 * @param changedHexagramName 变卦名称（可选）
 */
export function generateLiuyaoTitle(
    question: string | undefined,
    hexagramName: string,
    changedHexagramName?: string
): string {
    // 生成卦象显示文本：主卦 或 主卦 -> 变卦
    const hexagramDisplay = changedHexagramName
        ? `${hexagramName} 变 ${changedHexagramName}`
        : hexagramName;

    if (question && question.trim()) {
        return `${question.trim().substring(0, 20)} - ${hexagramDisplay}`;
    }
    return `六爻占卜 - ${hexagramDisplay}`;
}

/**
 * 生成 MBTI 分析标题
 */
export function generateMbtiTitle(mbtiType: string): string {
    return `${mbtiType} 人格分析`;
}

/**
 * 生成合盘分析标题
 */
export function generateHepanTitle(person1: string, person2: string, type: string): string {
    const typeNames: Record<string, string> = {
        'love': '情侣合盘',
        'business': '商业合伙',
        'family': '亲子关系'
    };
    return `${person1} & ${person2} - ${typeNames[type] || '合盘分析'}`;
}

/**
 * 生成八字分析标题
 */
export function generateBaziAnalysisTitle(chartName: string, analysisType: 'wuxing' | 'personality'): string {
    const typeName = analysisType === 'wuxing' ? '五行分析' : '人格分析';
    return `${chartName} - ${typeName}`;
}
