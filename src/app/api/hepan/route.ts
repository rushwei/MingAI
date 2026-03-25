/**
 * 关系合盘 API 路由
 */
import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';
import { type HepanResult, getHepanTypeName } from '@/lib/divination/hepan';
import { createInterpretHandler, type InterpretInput } from '@/lib/api/divination-pipeline';
import { SOURCE_CHART_TYPE_MAP } from '@/lib/visualization/chart-types';

interface HepanRequest {
    action: 'analyze' | 'save' | 'list';
    result?: HepanResult;
    chartId?: string;
    modelId?: string;
    reasoning?: boolean;
    stream?: boolean;
}

// ─── Interpret pipeline config ───

interface HepanInterpretInput extends InterpretInput {
    result: HepanResult;
    chartId?: string;
}

const handleInterpret = createInterpretHandler<HepanInterpretInput>({
    sourceType: 'hepan',
    tag: 'hepan',
    personality: 'hepan',
    allowedChartTypes: [...SOURCE_CHART_TYPE_MAP.hepan_chart],
    parseInput: (body) => {
        const b = body as HepanRequest;
        if (!b.result) return { error: '请提供合盘结果', status: 400 };
        return { result: b.result, chartId: b.chartId };
    },
    buildPrompts: (input) => {
        const { result } = input;
        const typeName = getHepanTypeName(result.type);
        const dimensionsSummary = result.dimensions
            .map(d => `${d.name}: ${d.score}分 - ${d.description}`)
            .join('\n');
        const conflictsSummary = result.conflicts.length > 0
            ? result.conflicts.map(c => `[${c.severity}] ${c.title}: ${c.description}`).join('\n')
            : '无明显冲突';

        const userPrompt = `合盘类型：${typeName}

双方信息：
- ${result.person1.name}：${result.person1.year}年${result.person1.month}月${result.person1.day}日
- ${result.person2.name}：${result.person2.year}年${result.person2.month}月${result.person2.day}日

综合契合度：${result.overallScore}分

各维度分析：
${dimensionsSummary}

潜在冲突点：
${conflictsSummary}

请为这对关系提供深度分析和相处建议。`;

        return { systemPrompt: '', userPrompt };
    },
    buildSourceData: (input, modelId, reasoningEnabled) => ({
        type: input.result.type,
        person1_name: input.result.person1.name,
        person1_birth: input.result.person1,
        person2_name: input.result.person2.name,
        person2_birth: input.result.person2,
        compatibility_score: input.result.overallScore,
        dimensions: input.result.dimensions,
        conflicts: input.result.conflicts,
        model_id: modelId,
        reasoning: reasoningEnabled,
    }),
    generateTitle: (input) => {
        const typeNames: Record<string, string> = {
            love: '情侣合盘', business: '商业合伙', family: '亲子关系',
        };
        return `${input.result.person1.name} & ${input.result.person2.name} - ${typeNames[input.result.type] || '合盘分析'}`;
    },
    persistRecord: async (input, userId, conversationId) => {
        const serviceClient = getSystemAdminClient();
        const { result, chartId } = input;
        if (chartId) {
            await serviceClient
                .from('hepan_charts')
                .update({ conversation_id: conversationId })
                .eq('id', chartId)
                .eq('user_id', userId);
        } else {
            await serviceClient
                .from('hepan_charts')
                .insert({
                    user_id: userId,
                    type: result.type,
                    person1_name: result.person1.name,
                    person1_birth: { year: result.person1.year, month: result.person1.month, day: result.person1.day, hour: result.person1.hour },
                    person2_name: result.person2.name,
                    person2_birth: { year: result.person2.year, month: result.person2.month, day: result.person2.day, hour: result.person2.hour },
                    compatibility_score: result.overallScore,
                    conversation_id: conversationId,
                    result_data: result,
                });
        }
    },
});

export async function POST(request: NextRequest) {
    try {
        const body: HepanRequest = await request.json();
        const { action } = body;

        if (action === 'save') {
            if (!body.result) return jsonError('请提供合盘结果', 400, { success: false });
            const authResult = await requireBearerUser(request);
            if ('error' in authResult) return jsonError(authResult.error.message, authResult.error.status, { success: false });
            const { user } = authResult;
            const result = body.result;
            const serviceClient = getSystemAdminClient();
            const { data: insertedChart, error: insertError } = await serviceClient
                .from('hepan_charts')
                .insert({
                    user_id: user.id,
                    type: result.type,
                    person1_name: result.person1.name,
                    person1_birth: { year: result.person1.year, month: result.person1.month, day: result.person1.day, hour: result.person1.hour },
                    person2_name: result.person2.name,
                    person2_birth: { year: result.person2.year, month: result.person2.month, day: result.person2.day, hour: result.person2.hour },
                    compatibility_score: result.overallScore,
                    result_data: result,
                })
                .select('id')
                .single();
            if (insertError) {
                console.error('[hepan] 保存合盘记录失败:', insertError.message);
                return jsonError('保存记录失败', 500, { success: false });
            }
            return jsonOk({ success: true, data: { chartId: insertedChart?.id } });
        }

        if (action === 'analyze') {
            return handleInterpret(request, body as unknown as Record<string, unknown>);
        }

        if (action === 'list') {
            const authResult = await requireBearerUser(request);
            if ('error' in authResult) return jsonError(authResult.error.message, authResult.error.status, { success: false });
            const serviceClient = getSystemAdminClient();
            const { data: charts, error: listError } = await serviceClient
                .from('hepan_charts')
                .select('*')
                .eq('user_id', authResult.user.id)
                .order('created_at', { ascending: false })
                .limit(20);
            if (listError) return jsonError('获取历史记录失败', 500, { success: false });
            return jsonOk({ success: true, data: { charts } });
        }

        return jsonError('未知操作', 400, { success: false });
    } catch (error) {
        console.error('[hepan] API 错误:', error);
        return jsonError('服务器错误', 500, { success: false });
    }
}
