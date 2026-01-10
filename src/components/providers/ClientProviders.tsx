/**
 * 客户端 Providers 包装组件
 * 
 * 将需要客户端状态的 Provider 集中在一起
 */
'use client';

import { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';

interface ClientProvidersProps {
    children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
    return (
        <ToastProvider>
            {children}
        </ToastProvider>
    );
}
