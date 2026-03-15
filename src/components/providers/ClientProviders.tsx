/**
 * 客户端 Providers 包装组件
 * 
 * 将需要客户端状态的 Provider 集中在一起
 */
'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { ChatTaskToastBridge } from '@/components/providers/ChatTaskToastBridge';
import { supabase } from '@/lib/supabase';
import { invalidateLocalCaches, type LocalCacheScope } from '@/lib/cache';
import { getLinuxDoAuthErrorMessage } from '@/lib/auth-feedback';

interface ClientProvidersProps {
    children: ReactNode;
}

type SessionState = {
    session: Session | null;
    user: User | null;
    loading: boolean;
};

const SessionContext = createContext<SessionState | undefined>(undefined);

export function useSessionSafe() {
    return useContext(SessionContext) ?? { session: null, user: null, loading: false };
}

function AuthCallbackFeedback() {
    const { showToast } = useToast();

    useEffect(() => {
        const url = new URL(window.location.href);
        const errorCode = url.searchParams.get('error');
        const message = getLinuxDoAuthErrorMessage(errorCode);

        if (!message) {
            return;
        }

        showToast('error', message, 5000);
        url.searchParams.delete('error');

        const nextUrl = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState(window.history.state, '', nextUrl || '/');
    }, [showToast]);

    return null;
}

export function ClientProviders({ children }: ClientProvidersProps) {
    const [state, setState] = useState<SessionState>({
        session: null,
        user: null,
        loading: true,
    });

    useEffect(() => {
        let isMounted = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!isMounted) return;
            setState({
                session,
                user: session?.user ?? null,
                loading: false,
            });
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!isMounted) return;
            setState({
                session,
                user: session?.user ?? null,
                loading: false,
            });
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const rawFetch = window.fetch.bind(window);

        const shouldHandleApiWrite = (pathname: string, method: string) => {
            if (!pathname.startsWith('/api/')) return false;
            if (pathname.startsWith('/api/supabase/')) return false;
            if (pathname.startsWith('/api/chat')) return false;
            if (pathname.startsWith('/api/dify/')) return false;
            return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
        };

        const resolveCacheScopesByPath = (pathname: string): LocalCacheScope[] => {
            if (pathname.startsWith('/api/admin/ai-models')) {
                return ['models'];
            }
            if (pathname.startsWith('/api/knowledge-base')) {
                return ['knowledge_bases', 'data_sources'];
            }
            if (pathname.startsWith('/api/data-sources')) {
                return ['data_sources', 'knowledge_bases'];
            }
            if (pathname.startsWith('/api/records')) {
                return ['data_sources'];
            }
            if (pathname.startsWith('/api/bazi')) {
                return ['data_sources', 'default_bazi_chart'];
            }
            if (pathname.startsWith('/api/hepan')
                || pathname.startsWith('/api/liuyao')
                || pathname.startsWith('/api/tarot')
                || pathname.startsWith('/api/face')
                || pathname.startsWith('/api/palm')
                || pathname.startsWith('/api/mbti')
                || pathname.startsWith('/api/ziwei')) {
                return ['data_sources'];
            }
            if (pathname.startsWith('/api/membership')) {
                return ['profile', 'membership', 'level'];
            }
            if (pathname.startsWith('/api/credits')) {
                return ['membership', 'level'];
            }
            if (pathname.startsWith('/api/checkin')) {
                return ['level'];
            }
            if (pathname.startsWith('/api/activation-keys')) {
                return ['profile', 'membership', 'level'];
            }
            if (pathname.startsWith('/api/auth')) {
                return ['profile', 'membership', 'level', 'sidebar_config'];
            }
            if (pathname.startsWith('/api/user/settings')) {
                return ['profile', 'sidebar_config', 'default_bazi_chart'];
            }
            return [];
        };

        const emitApiWriteEvents = (pathname: string, method: string) => {
            const cacheScopes = resolveCacheScopesByPath(pathname);
            if (cacheScopes.length > 0) {
                invalidateLocalCaches(cacheScopes);
            }
            window.dispatchEvent(
                new CustomEvent('mingai:api-write', {
                    detail: { pathname, method, at: Date.now() },
                })
            );

            if (pathname.startsWith('/api/knowledge-base')
                || pathname.startsWith('/api/data-sources')
                || pathname.startsWith('/api/records')
                || pathname.startsWith('/api/community')
                || pathname.startsWith('/api/bazi')
                || pathname.startsWith('/api/hepan')
                || pathname.startsWith('/api/liuyao')
                || pathname.startsWith('/api/tarot')
                || pathname.startsWith('/api/face')
                || pathname.startsWith('/api/palm')
                || pathname.startsWith('/api/mbti')
                || pathname.startsWith('/api/ziwei')) {
                window.dispatchEvent(new CustomEvent('mingai:data-index:invalidate'));
            }

            if (pathname.startsWith('/api/membership')
                || pathname.startsWith('/api/credits')
                || pathname.startsWith('/api/checkin')
                || pathname.startsWith('/api/activation-keys')
                || pathname.startsWith('/api/payment-status')
                || pathname.startsWith('/api/auth')
                || pathname.startsWith('/api/user/mcp-key')
                || pathname.startsWith('/api/user/settings')) {
                window.dispatchEvent(new CustomEvent('mingai:user-data:invalidate', { detail: { pathname } }));
            }

            if (pathname.startsWith('/api/admin/ai-models')) {
                window.dispatchEvent(new CustomEvent('mingai:models:invalidate', { detail: { pathname } }));
            }

            if (pathname.startsWith('/api/notifications')) {
                window.dispatchEvent(new CustomEvent('mingai:notifications:invalidate', { detail: { pathname } }));
            }
        };

        const patchedFetch: typeof window.fetch = async (input, init) => {
            const response = await rawFetch(input, init);

            try {
                const method = (
                    init?.method
                    || (input instanceof Request ? input.method : 'GET')
                    || 'GET'
                ).toUpperCase();
                const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
                const url = new URL(rawUrl, window.location.origin);
                if (response.ok && shouldHandleApiWrite(url.pathname, method)) {
                    emitApiWriteEvents(url.pathname, method);
                }
            } catch {
                // ignore event dispatch failures to avoid breaking fetch
            }

            return response;
        };

        window.fetch = patchedFetch;
        return () => {
            window.fetch = rawFetch;
        };
    }, []);

    return (
        <ToastProvider>
            <AuthCallbackFeedback />
            <ChatTaskToastBridge />
            <SessionContext.Provider value={state}>
                {children}
            </SessionContext.Provider>
        </ToastProvider>
    );
}
