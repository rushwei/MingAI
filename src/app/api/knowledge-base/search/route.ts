import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { searchKnowledge } from '@/lib/knowledge-base/search';
import type { RankedResult, SearchCandidate } from '@/lib/knowledge-base/types';

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

export async function POST(request: NextRequest) {
    const supabase = await createSupabaseClient();
    const bearer = request.headers.get('authorization');
    const token = bearer?.replace('Bearer ', '');
    const { data: { user } } = token
        ? await supabase.auth.getUser(token)
        : await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const body = await request.json() as { query?: string; kbIds?: string[]; topK?: number };
    if (!body.query?.trim()) return NextResponse.json({ error: 'query 不能为空' }, { status: 400 });

    const results = await searchKnowledge(body.query, {
        kbIds: body.kbIds,
        topK: body.topK,
        accessToken: token || undefined
    });
    const first = (results as Array<SearchCandidate | RankedResult>)[0];

    if (first && 'rank' in first) {
        return NextResponse.json({ candidates: [], ranked: results });
    }

    return NextResponse.json({ candidates: results, ranked: null });
}
