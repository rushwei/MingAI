import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { DataSourceType } from '@/lib/data-sources/types';

type ArchiveStatusSourceType = 'conversation' | 'record' | 'chat_message' | DataSourceType;

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

export async function isSourceArchived(
    sourceType: ArchiveStatusSourceType,
    sourceId: string
): Promise<boolean> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { count } = await supabase
        .from('archived_sources')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId);

    return (count ?? 0) > 0;
}

export async function getArchivedKbIds(
    sourceType: ArchiveStatusSourceType,
    sourceId: string
): Promise<string[]> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from('archived_sources')
        .select('kb_id')
        .eq('user_id', user.id)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId);

    return data?.map(d => d.kb_id) ?? [];
}
