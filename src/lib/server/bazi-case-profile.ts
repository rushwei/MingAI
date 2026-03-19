import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
    createEmptyBaziCaseProfile,
    parseBaziCaseEvents,
    parseBaziCaseMasterReview,
    parseBaziCaseOwnerFeedback,
    type BaziCaseEvent,
    type BaziCaseProfile,
    type BaziCaseMasterReview,
    type BaziCaseOwnerFeedback,
} from '@/lib/bazi-case-profile';

type ProfileRow = {
    id: string;
    user_id: string;
    bazi_chart_id: string;
    master_review: unknown;
    owner_feedback: unknown;
    created_at: string;
    updated_at: string;
};

type EventRow = {
    id: string;
    profile_id: string;
    user_id: string;
    bazi_chart_id: string;
    event_date: string;
    category: string;
    title: string;
    detail: string | null;
    created_at: string;
    updated_at: string;
};

export async function ensureUserOwnsBaziChart(
    supabase: SupabaseClient,
    chartId: string,
    userId: string,
): Promise<boolean> {
    const { data, error } = await supabase
        .from('bazi_charts')
        .select('id')
        .eq('id', chartId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) {
        throw new Error(error.message);
    }
    return !!data?.id;
}

function mapProfileRow(row: ProfileRow, events: EventRow[]): BaziCaseProfile {
    const parsedEvents = parseBaziCaseEvents(events.map((event) => ({
        id: event.id,
        eventDate: event.event_date,
        category: event.category,
        title: event.title,
        detail: event.detail || '',
    })));

    return {
        id: row.id,
        userId: row.user_id,
        chartId: row.bazi_chart_id,
        masterReview: parseBaziCaseMasterReview(row.master_review),
        ownerFeedback: parseBaziCaseOwnerFeedback(row.owner_feedback),
        events: parsedEvents.map((event, index) => ({
            ...event,
            createdAt: events[index]?.created_at,
            updatedAt: events[index]?.updated_at,
        })),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function getBaziCaseProfileByChartId(
    supabase: SupabaseClient,
    chartId: string,
    userId: string,
): Promise<BaziCaseProfile | null> {
    const { data, error } = await supabase
        .from('bazi_case_profiles')
        .select('id, user_id, bazi_chart_id, master_review, owner_feedback, created_at, updated_at')
        .eq('bazi_chart_id', chartId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }
    if (!data) {
        return null;
    }

    const { data: eventRows, error: eventsError } = await supabase
        .from('bazi_case_events')
        .select('id, profile_id, user_id, bazi_chart_id, event_date, category, title, detail, created_at, updated_at')
        .eq('profile_id', data.id)
        .order('event_date', { ascending: false });

    if (eventsError) {
        throw new Error(eventsError.message);
    }

    return mapProfileRow(data as ProfileRow, (eventRows || []) as EventRow[]);
}

export async function saveBaziCaseProfile(args: {
    supabase: SupabaseClient;
    userId: string;
    chartId: string;
    masterReview: BaziCaseMasterReview;
    ownerFeedback: BaziCaseOwnerFeedback;
    events: BaziCaseEvent[];
}): Promise<BaziCaseProfile> {
    const { supabase, userId, chartId, masterReview, ownerFeedback, events } = args;
    const now = new Date().toISOString();

    const { data: profileRow, error: profileError } = await supabase
        .from('bazi_case_profiles')
        .upsert({
            user_id: userId,
            bazi_chart_id: chartId,
            master_review: masterReview,
            owner_feedback: ownerFeedback,
            updated_at: now,
        }, { onConflict: 'bazi_chart_id' })
        .select('id, user_id, bazi_chart_id, master_review, owner_feedback, created_at, updated_at')
        .single();

    if (profileError || !profileRow) {
        throw new Error(profileError?.message || '保存断事笔记失败');
    }

    const profileId = profileRow.id;
    const deleteResult = await supabase
        .from('bazi_case_events')
        .delete()
        .eq('profile_id', profileId)
        .eq('user_id', userId);
    if (deleteResult.error) {
        throw new Error(deleteResult.error.message);
    }

    if (events.length > 0) {
        const { error: insertError } = await supabase
            .from('bazi_case_events')
            .insert(events.map((event) => ({
                profile_id: profileId,
                user_id: userId,
                bazi_chart_id: chartId,
                event_date: event.eventDate,
                category: event.category,
                title: event.title,
                detail: event.detail || null,
            })));
        if (insertError) {
            throw new Error(insertError.message);
        }
    }

    return (await getBaziCaseProfileByChartId(supabase, chartId, userId))
        || {
            ...createEmptyBaziCaseProfile(),
            id: profileId,
            userId,
            chartId,
            masterReview,
            ownerFeedback,
            events,
        };
}
