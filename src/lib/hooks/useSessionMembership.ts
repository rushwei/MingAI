'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { getMembershipInfoResult, type MembershipInfo, type MembershipLookupResult } from '@/lib/user/membership';

const membershipCache = new Map<string, MembershipInfo | null>();
const membershipInFlight = new Map<string, Promise<MembershipLookupResult>>();

async function loadMembership(userId: string): Promise<MembershipLookupResult> {
    if (membershipCache.has(userId)) {
        return {
            ok: true,
            info: membershipCache.get(userId) ?? null,
        };
    }

    const inFlight = membershipInFlight.get(userId);
    if (inFlight) {
        return await inFlight;
    }

    const request = getMembershipInfoResult(userId)
        .then((result) => {
            if (result.ok) {
                membershipCache.set(userId, result.info);
            }
            return result;
        })
        .finally(() => {
            membershipInFlight.delete(userId);
        });

    membershipInFlight.set(userId, request);
    return await request;
}

export function invalidateSessionMembershipCache(userId?: string | null) {
    if (userId) {
        membershipCache.delete(userId);
        membershipInFlight.delete(userId);
        return;
    }

    membershipCache.clear();
    membershipInFlight.clear();
}

export function useSessionMembership() {
    const { session, user, loading: sessionLoading } = useSessionSafe();
    const [membershipInfo, setMembershipInfo] = useState<MembershipInfo | null>(null);
    const [membershipLoading, setMembershipLoading] = useState(false);

    const refreshMembership = useCallback(async () => {
        if (!user?.id) {
            setMembershipInfo(null);
            setMembershipLoading(false);
            return null;
        }

        invalidateSessionMembershipCache(user.id);
        setMembershipLoading(true);
        try {
            const result = await loadMembership(user.id);
            if (result.ok) {
                setMembershipInfo(result.info);
            }
            return result.info;
        } finally {
            setMembershipLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        let active = true;

        if (sessionLoading) {
            return () => {
                active = false;
            };
        }

        if (!user?.id) {
            setMembershipInfo(null);
            setMembershipLoading(false);
            return () => {
                active = false;
            };
        }

        setMembershipLoading(true);
        void loadMembership(user.id)
            .then((result) => {
                if (active && result.ok) {
                    setMembershipInfo(result.info);
                }
            })
            .finally(() => {
                if (active) {
                    setMembershipLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [sessionLoading, user?.id]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handleUserDataInvalidate = () => {
            void refreshMembership();
        };

        window.addEventListener('mingai:user-data:invalidate', handleUserDataInvalidate);
        return () => {
            window.removeEventListener('mingai:user-data:invalidate', handleUserDataInvalidate);
        };
    }, [refreshMembership]);

    return {
        session,
        user,
        userId: user?.id ?? null,
        sessionLoading,
        membershipInfo,
        membershipLoading,
        refreshMembership,
    };
}
