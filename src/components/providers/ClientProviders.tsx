/**
 * 客户端 Providers 包装组件
 * 
 * 将需要客户端状态的 Provider 集中在一起
 */
'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { ToastProvider } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

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
            <SessionContext.Provider value={state}>
                {children}
            </SessionContext.Provider>
        </ToastProvider>
    );
}
