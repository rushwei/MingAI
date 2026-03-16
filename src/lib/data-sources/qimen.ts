import { getSystemAdminClient } from '@/lib/api-utils';
import type { QimenOutput, QimenPalaceInfo } from '@/lib/divination/qimen';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from '@/lib/data-sources/types';

type QimenRow = {
    id: string;
    user_id: string;
    question: string | null;
    dun_type: string;
    ju_number: number;
    chart_data: QimenOutput;
    created_at: string;
};

const DUN_LABEL: Record<string, string> = { yang: '阳遁', yin: '阴遁' };

function formatPalace(p: QimenPalaceInfo): string {
    const parts = [
        `${p.palaceName}（${p.direction}·${p.element}）`,
        `  地盘: ${p.earthStem}  天盘: ${p.heavenStem}`,
        `  星: ${p.star}  门: ${p.gate}  神: ${p.god}`,
        p.hiddenStem ? `  暗干: ${p.hiddenStem}` : '',
        p.patterns.length ? `  格局: ${p.patterns.join('、')}` : '',
        p.isEmpty ? '  [空亡]' : '',
        p.isHorseStar ? '  [驿马]' : '',
    ];
    return parts.filter(Boolean).join('\n');
}

export const qimenProvider: DataSourceProvider<QimenRow> = {
    type: 'qimen_chart',
    displayName: '奇门遁甲',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getSystemAdminClient();
        const limit = ctx?.limit ?? 50;
        const { data, error } = await supabase
            .from('qimen_charts')
            .select('id, question, dun_type, ju_number, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return (data || []).map((row: { id: string; question: string | null; dun_type: string; ju_number: number; created_at: string }) => {
            const dunLabel = DUN_LABEL[row.dun_type] || row.dun_type;
            return {
                id: row.id,
                type: 'qimen_chart' as const,
                name: `奇门遁甲 - ${dunLabel}${row.ju_number}局`,
                preview: row.question ? `问题：${row.question}` : `${dunLabel}${row.ju_number}局`,
                createdAt: row.created_at,
            };
        });
    },

    async get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<QimenRow | null> {
        const supabase = ctx?.client ?? getSystemAdminClient();
        const { data, error } = await supabase
            .from('qimen_charts')
            .select('id, question, dun_type, ju_number, chart_data, created_at')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as QimenRow) || null;
    },

    formatForAI(r: QimenRow): string {
        const c = r.chart_data;
        if (!c) return '奇门遁甲排盘数据缺失';

        const dunLabel = DUN_LABEL[c.dunType] || c.dunType;
        const fp = c.fourPillars;

        const lines: string[] = [
            '## 奇门遁甲排盘',
            '',
            '### 基本信息',
            r.question ? `- 问题：${r.question}` : '',
            `- 阳历：${c.solarDate}`,
            c.lunarDate ? `- 阴历：${c.lunarDate}` : '',
            `- 四柱：${fp.year} ${fp.month} ${fp.day} ${fp.hour}`,
            `- ${dunLabel}${c.juNumber}局`,
            c.yuan ? `- 元：${c.yuan}` : '',
            c.solarTerm ? `- 节气：${c.solarTerm}` : '',
            `- 旬首：${c.xunShou}`,
            '',
            '### 值符值使',
            `- 值符：${c.zhiFu}（${c.zhiFuPalace}宫）`,
            `- 值使：${c.zhiShi}（${c.zhiShiPalace}宫）`,
        ];

        if (c.kongWang) {
            lines.push('');
            lines.push('### 空亡');
            lines.push(`- 日空：${c.kongWang.dayKong.branches.join(' ')}（${c.kongWang.dayKong.palaces.join(' ')}宫）`);
            lines.push(`- 时空：${c.kongWang.hourKong.branches.join(' ')}（${c.kongWang.hourKong.palaces.join(' ')}宫）`);
        }

        if (c.yiMa) {
            lines.push(`- 驿马：${c.yiMa.branch}（${c.yiMa.palace}宫）`);
        }

        if (c.palaces?.length) {
            lines.push('');
            lines.push('### 九宫排盘');
            for (const p of c.palaces) {
                lines.push('');
                lines.push(formatPalace(p));
            }
        }

        if (c.globalFormations?.length) {
            lines.push('');
            lines.push(`### 全局格局`);
            lines.push(`- ${c.globalFormations.join('、')}`);
        }

        return lines.filter(Boolean).join('\n');
    },

    summarize(r: QimenRow): string {
        return r.question || '奇门遁甲排盘';
    },
};
