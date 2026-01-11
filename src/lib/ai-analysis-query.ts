/**
 * AI 分析查询工具函数（客户端）
 * 
 * 从 conversations 表查询 AI 分析内容
 */

import { supabase } from './supabase';

/**
 * 根据 chartId 查询最新的八字 AI 分析
 */
export async function getLatestBaziAnalysis(
    chartId: string,
    type: 'wuxing' | 'personality'
): Promise<string | null> {
    const sourceType = type === 'wuxing' ? 'bazi_wuxing' : 'bazi_personality';

    const { data, error } = await supabase
        .from('conversations')
        .select('messages')
        .eq('bazi_chart_id', chartId)
        .eq('source_type', sourceType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data?.messages) {
        return null;
    }

    // 找到 AI 回复内容
    const messages = data.messages as Array<{ role: string; content: string }>;
    const aiMessage = messages.find(m => m.role === 'assistant');
    return aiMessage?.content || null;
}

/**
 * 根据类型查询用户的历史记录列表（用于抽屉组件）
 */
export async function getHistoryList(
    userId: string,
    type: 'tarot' | 'liuyao' | 'mbti' | 'hepan'
): Promise<Array<{ id: string; title: string; createdAt: string }>> {
    let tableName: string;
    let select: string;
    let titleField: string;

    switch (type) {
        case 'tarot':
            tableName = 'tarot_readings';
            select = 'id, question, created_at';
            titleField = 'question';
            break;
        case 'liuyao':
            tableName = 'liuyao_divinations';
            select = 'id, question, hexagram_code, created_at';
            titleField = 'question';
            break;
        case 'mbti':
            tableName = 'mbti_readings';
            select = 'id, mbti_type, created_at';
            titleField = 'mbti_type';
            break;
        case 'hepan':
            tableName = 'hepan_charts';
            select = 'id, person1_name, person2_name, created_at';
            titleField = 'person1_name';
            break;
    }

    const { data, error } = await supabase
        .from(tableName)
        .select(select)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error || !data) {
        return [];
    }

    return (data as unknown as Array<Record<string, unknown>>).map((item) => {
        let title = '';
        if (type === 'hepan' && item.person1_name && item.person2_name) {
            title = `${item.person1_name} & ${item.person2_name}`;
        } else if (type === 'mbti') {
            title = `${item.mbti_type} 人格`;
        } else {
            title = (item[titleField] as string) || '未命名';
        }
        return {
            id: item.id as string,
            title: title.length > 20 ? title.slice(0, 20) + '...' : title,
            createdAt: item.created_at as string,
        };
    });
}
