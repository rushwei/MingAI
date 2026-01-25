import { getServiceRoleClient } from '@/lib/api-utils';
import type { DataSourceQueryContext, DataSourceSummary } from '@/lib/data-sources/types';
import { getProvider } from '@/lib/data-sources';
import type { Mention, MentionTarget, MentionType } from '@/types/mentions';

export function parseMentions(content: string): Mention[] {
    const results: Mention[] = [];
    const jsonObjectToken = /@\{(\{[\s\S]*?\})\}/g;
    for (const match of content.matchAll(jsonObjectToken)) {
        const raw = match[1];
        try {
            const parsed = JSON.parse(raw) as Mention;
            if (parsed && parsed.type && parsed.name) results.push(parsed);
        } catch {
        }
    }

    const kvToken = /@\{([^{}]+)\}/g;
    for (const match of content.matchAll(kvToken)) {
        const raw = match[1];
        try {
            const parsed = JSON.parse(raw) as Mention;
            if (parsed && parsed.type && parsed.name) {
                results.push(parsed);
                continue;
            }
        } catch {
        }
        try {
            const parsed = JSON.parse(`{${raw}}`) as Mention;
            if (parsed && parsed.type && parsed.name) results.push(parsed);
        } catch {
        }
    }
    return results;
}

export function stripMentionTokens(content: string): string {
    return content
        .replace(/@\{(\{[\s\S]*?\}|[^{}]+)\}/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export async function searchMentionTargets(
    userId: string,
    type: MentionType,
    query: string,
    ctx?: DataSourceQueryContext
): Promise<MentionTarget[]> {
    if (type === 'knowledge_base') {
        return await searchKnowledgeBases(userId, query, ctx);
    }

    const provider = await getProvider(type);
    const list = await provider.list(userId, ctx);
    return list
        .filter(item => {
            const q = query.trim().toLowerCase();
            if (!q) return true;
            return item.name.toLowerCase().includes(q) || item.preview.toLowerCase().includes(q);
        })
        .slice(0, 20)
        .map(item => ({
            id: item.id,
            type,
            name: item.name,
            preview: item.preview
        }));
}

async function searchKnowledgeBases(userId: string, query: string, ctx?: DataSourceQueryContext): Promise<MentionTarget[]> {
    const supabase = ctx?.client ?? getServiceRoleClient();
    let q = supabase
        .from('knowledge_bases')
        .select('id, name, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    const keyword = query.trim();
    if (keyword) {
        q = q.ilike('name', `%${keyword}%`);
    }

    const { data } = await q;
    return (data || []).map((kb: { id: string; name: string; description: string | null }) => ({
        id: kb.id,
        type: 'knowledge_base',
        name: kb.name,
        preview: kb.description || '知识库'
    }));
}

export async function resolveMention(mention: Mention, userId: string, ctx?: DataSourceQueryContext): Promise<string> {
    if (!mention.id) return '';
    if (mention.type === 'knowledge_base') {
        return await resolveKnowledgeBase(mention.id, userId, ctx);
    }

    try {
        const provider = await getProvider(mention.type);
        const data = await provider.get(mention.id, userId, ctx);
        return data ? provider.formatForAI(data) : '';
    } catch {
        return '';
    }
}

async function resolveKnowledgeBase(kbId: string, userId: string, ctx?: DataSourceQueryContext): Promise<string> {
    const supabase = ctx?.client ?? getServiceRoleClient();
    const { data: kb } = await supabase
        .from('knowledge_bases')
        .select('id, name, description, weight')
        .eq('id', kbId)
        .eq('user_id', userId)
        .maybeSingle();

    if (!kb) return '';

    const { data: entries } = await supabase
        .from('knowledge_entries')
        .select('content, created_at')
        .eq('kb_id', kbId)
        .order('created_at', { ascending: false })
        .limit(10);

    const body = (entries || []).map((e: { content: string | null }) => e.content).filter((v): v is string => Boolean(v)).join('\n\n');
    const header = [
        `## 知识库：${kb.name}`,
        kb.description ? `- 描述：${kb.description}` : '',
        kb.weight ? `- 权重：${kb.weight}` : ''
    ].filter(Boolean).join('\n');

    return body ? `${header}\n\n${body}` : header;
}

export async function mentionFromSummary(summary: DataSourceSummary): Promise<Mention> {
    return {
        type: summary.type,
        id: summary.id,
        name: summary.name,
        preview: summary.preview
    };
}
