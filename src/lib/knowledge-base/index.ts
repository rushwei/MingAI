import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ArchivedSource, ArchivedSourceType, KnowledgeBase, KnowledgeBaseInput } from './types';

async function createSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
            },
        }
    );
}

export async function createKnowledgeBase(userId: string, data: KnowledgeBaseInput): Promise<KnowledgeBase> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
        throw new Error('Not authenticated');
    }

    const { data: row, error } = await supabase
        .from('knowledge_bases')
        .insert({
            user_id: userId,
            name: data.name,
            description: data.description ?? null,
            weight: data.weight ?? 'normal'
        })
        .select('*')
        .single();

    if (error || !row) throw error || new Error('Failed to create knowledge base');
    return row as KnowledgeBase;
}

export async function deleteKnowledgeBase(kbId: string): Promise<void> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('knowledge_bases')
        .delete()
        .eq('id', kbId)
        .eq('user_id', user.id);

    if (error) throw error;
}

export async function updateKnowledgeBase(kbId: string, data: Partial<KnowledgeBaseInput>): Promise<KnowledgeBase> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.weight !== undefined) updateData.weight = data.weight;

    const { data: row, error } = await supabase
        .from('knowledge_bases')
        .update(updateData)
        .eq('id', kbId)
        .eq('user_id', user.id)
        .select('*')
        .single();

    if (error || !row) throw error || new Error('Failed to update knowledge base');
    return row as KnowledgeBase;
}

export async function getKnowledgeBases(userId: string): Promise<KnowledgeBase[]> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return [];

    const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as KnowledgeBase[];
}

export async function getKnowledgeBase(kbId: string): Promise<KnowledgeBase | null> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('id', kbId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) throw error;
    return (data as KnowledgeBase) || null;
}

export async function archiveSource(params: {
    userId: string;
    sourceType: ArchivedSourceType;
    sourceId: string;
    kbId: string;
}): Promise<ArchivedSource> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== params.userId) {
        throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
        .from('archived_sources')
        .upsert({
            user_id: params.userId,
            source_type: params.sourceType,
            source_id: params.sourceId,
            kb_id: params.kbId
        }, {
            onConflict: 'source_type,source_id,kb_id'
        })
        .select('*')
        .single();

    if (error || !data) throw error || new Error('Failed to archive source');
    return data as ArchivedSource;
}

export async function unarchiveSource(archivedSourceId: string): Promise<void> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('archived_sources')
        .delete()
        .eq('id', archivedSourceId)
        .eq('user_id', user.id);

    if (error) throw error;
}

export async function getArchivedSources(userId: string, kbId?: string): Promise<ArchivedSource[]> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return [];

    let query = supabase
        .from('archived_sources')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (kbId) query = query.eq('kb_id', kbId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ArchivedSource[];
}

export async function isSourceArchived(
    sourceType: ArchivedSourceType,
    sourceId: string,
    kbId?: string
): Promise<boolean> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    let query = supabase
        .from('archived_sources')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId);

    if (kbId) query = query.eq('kb_id', kbId);

    const { count, error } = await query;
    if (error) throw error;
    return (count ?? 0) > 0;
}
