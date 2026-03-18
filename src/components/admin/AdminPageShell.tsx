/**
 * Admin 页面通用 Shell
 *
 * 封装: loadAdminClientAccessState, loading/未登录/无权限渲染, 头部+标签页
 * 各 admin 页面只需提供 title + tabs + children 即可。
 *
 * 'use client' - 需要 useState/useEffect/useRouter
 */
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { loadAdminClientAccessState, type AdminClientAccessState } from '@/lib/admin/client';

export interface AdminTab {
    id: string;
    label: string;
    icon: LucideIcon;
}

interface AdminPageShellProps {
    title: string;
    tabs: AdminTab[];
    activeTab: string;
    onTabChange: (id: string) => void;
    children: ReactNode;
}

export function AdminPageShell({ title, tabs, activeTab, onTabChange, children }: AdminPageShellProps) {
    const router = useRouter();
    const [state, setState] = useState<AdminClientAccessState>({
        loading: true,
        isAuthed: false,
        isAdmin: false,
    });

    useEffect(() => {
        void loadAdminClientAccessState().then(setState);
    }, []);

    if (state.loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <SoundWaveLoader variant="block" text="加载中" />
            </div>
        );
    }

    if (!state.isAuthed) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-10">
                <h1 className="text-xl font-semibold mb-3">请先登录</h1>
                <p className="text-sm text-foreground-secondary">登录后系统会自动识别管理员账号。</p>
            </div>
        );
    }

    if (!state.isAdmin) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-10">
                <h1 className="text-xl font-semibold mb-3">无权限访问</h1>
                <p className="text-sm text-foreground-secondary">当前账号不在管理员名单中。</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:py-8 py-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => router.push('/user')} className="p-2 rounded-lg hover:bg-background-secondary transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">{title}</h1>
            </div>

            {tabs.length > 1 && (
                <div className="flex gap-2 mb-6 border-b border-border pb-4 overflow-x-auto">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => onTabChange(id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === id
                                    ? 'bg-accent text-white shadow-sm'
                                    : 'bg-background-secondary text-foreground-secondary hover:bg-background-secondary/80'
                            }`}>
                            <Icon className="w-4 h-4" />{label}
                        </button>
                    ))}
                </div>
            )}

            <div className="bg-background rounded-2xl border border-border p-6">
                {children}
            </div>
        </div>
    );
}
