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
import { supabase } from '@/lib/auth';
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
