import { getServiceRoleClient } from '@/lib/api-utils';
import { findHexagram, performFullAnalysis, type Yao } from '@/lib/liuyao';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from '@/lib/data-sources/types';

type LiuyaoRow = {
    id: string;
    user_id: string | null;
    question: string | null;
    hexagram_code: string;
    changed_hexagram_code: string | null;
    changed_lines: unknown;
    yongshen_targets: unknown;
    created_at: string;
    conversation_id: string | null;
};

const buildYaosFromCode = (hexagramCode: string, changedLines: number[]): Yao[] => {
    return hexagramCode.split('').map((value, index) => ({
        type: (parseInt(value, 10) as 0 | 1),
        change: changedLines.includes(index + 1) ? 'changing' : 'stable',
        position: index + 1,
    }));
};

export const liuyaoProvider: DataSourceProvider<LiuyaoRow> = {
    type: 'liuyao_divination',
    displayName: '六爻记录',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const limit = ctx?.limit ?? 50;
        const { data, error } = await supabase
            .from('liuyao_divinations')
            .select('id, question, hexagram_code, changed_hexagram_code, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return (data || []).map((row: { id: string; question: string | null; hexagram_code: string; changed_hexagram_code: string | null; created_at: string }) => {
            const baseHexagram = findHexagram(row.hexagram_code);
            const baseName = baseHexagram?.name || '未知卦';
            const changedHexagram = row.changed_hexagram_code ? findHexagram(row.changed_hexagram_code) : undefined;
            const changedName = changedHexagram?.name || (row.changed_hexagram_code ? '未知卦' : '');
            const hexagramDisplay = changedName ? `${baseName} → ${changedName}` : baseName;
            return {
                id: row.id,
                type: 'liuyao_divination',
                name: `六爻 - ${hexagramDisplay}`,
                preview: row.question
                    ? `问题：${row.question}`
                    : `本卦：${baseName}${changedName ? ` / 变卦：${changedName}` : ''}`,
                createdAt: row.created_at
            };
        });
    },

    async get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<LiuyaoRow | null> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const { data, error } = await supabase
            .from('liuyao_divinations')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as LiuyaoRow) || null;
    },

    formatForAI(r: LiuyaoRow): string {
        const changedLines = Array.isArray(r.changed_lines) ? r.changed_lines.filter((v): v is number => typeof v === 'number') : [];
        const yongShenTargets = Array.isArray(r.yongshen_targets)
            ? r.yongshen_targets.filter((item): item is '父母' | '兄弟' | '子孙' | '妻财' | '官鬼' =>
                typeof item === 'string' && ['父母', '兄弟', '子孙', '妻财', '官鬼'].includes(item)
            )
            : [];
        const question = r.question || '';
        const hasQuestion = question.trim().length > 0;
        const shouldAnalyze = Boolean(r.hexagram_code) && (yongShenTargets.length > 0 || !hasQuestion);
        const analysis = shouldAnalyze
            ? performFullAnalysis(
                buildYaosFromCode(r.hexagram_code, changedLines),
                r.hexagram_code,
                r.changed_hexagram_code || undefined,
                question,
                new Date(r.created_at),
                { yongShenTargets }
            )
            : null;
        const ganZhiTime = analysis
            ? `${analysis.ganZhiTime.year.gan}${analysis.ganZhiTime.year.zhi}年 ${analysis.ganZhiTime.month.gan}${analysis.ganZhiTime.month.zhi}月 ${analysis.ganZhiTime.day.gan}${analysis.ganZhiTime.day.zhi}日 ${analysis.ganZhiTime.hour.gan}${analysis.ganZhiTime.hour.zhi}时`
            : '';
        const kongWangSummary = analysis?.kongWangByPillar
            ? `年${analysis.kongWangByPillar.year.xun}（${analysis.kongWangByPillar.year.kongDizhi.join(' ')}）；月${analysis.kongWangByPillar.month.xun}（${analysis.kongWangByPillar.month.kongDizhi.join(' ')}）；日${analysis.kongWangByPillar.day.xun}（${analysis.kongWangByPillar.day.kongDizhi.join(' ')}）；时${analysis.kongWangByPillar.hour.xun}（${analysis.kongWangByPillar.hour.kongDizhi.join(' ')}）`
            : analysis
                ? `日${analysis.kongWang.xun}（${analysis.kongWang.kongDizhi.join(' ')}）`
                : '';

        return [
            '## 六爻占卜',
            question ? `- 问题：${question}` : '',
            `- 本卦：${r.hexagram_code}`,
            r.changed_hexagram_code ? `- 变卦：${r.changed_hexagram_code}` : '',
            changedLines.length ? `- 动爻：${changedLines.join('、')}` : '',
            yongShenTargets.length ? `- 分析目标：${yongShenTargets.join('、')}` : '- 分析目标：缺失（历史旧记录）',
            ganZhiTime ? `- 起卦时间：${ganZhiTime}` : '',
            kongWangSummary ? `- 旬空（年/月/日/时）：${kongWangSummary}` : '',
            kongWangSummary ? '- 注：六爻断卦判空亡以“日旬空”为主，年/月/时旬空供参考。' : '',
            analysis?.yongShen?.length
                ? `- 用神：${analysis.yongShen.map(group => `${group.targetLiuQin}=>${group.selected.liuQin}${group.selected.position ? `@${group.selected.position}` : ''}(rank=${group.selected.rankScore})`).join('；')}`
                : '',
            analysis?.fuShen?.length ? `- 伏神：${JSON.stringify(analysis.fuShen)}` : '',
            analysis?.shenSystemByYongShen?.length ? `- 原神/忌神/仇神：${JSON.stringify(analysis.shenSystemByYongShen)}` : '',
            analysis?.globalShenSha?.length ? `- 全局神煞：${analysis.globalShenSha.join('、')}` : '',
            analysis?.liuChongGuaInfo ? `- 六冲卦：${analysis.liuChongGuaInfo.isLiuChongGua ? '是' : '否'}${analysis.liuChongGuaInfo.description ? `（${analysis.liuChongGuaInfo.description}）` : ''}` : '',
            analysis?.sanHeAnalysis ? `- 三合局：${JSON.stringify(analysis.sanHeAnalysis)}` : '',
            analysis?.timeRecommendations?.length ? `- 时间建议：${JSON.stringify(analysis.timeRecommendations)}` : '',
            analysis?.warnings?.length ? `- 风险提示：${analysis.warnings.join('；')}` : '',
            analysis ? `- 完整分析数据：${JSON.stringify(analysis)}` : ''
        ].filter(Boolean).join('\n');
    },

    summarize(r: LiuyaoRow): string {
        return r.question || '六爻占卜';
    }
};
