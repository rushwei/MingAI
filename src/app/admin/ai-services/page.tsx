/**
 * AI 服务管理页面
 * 仅管理员可访问
 *
 * 功能:
 * - 模型管理（启用/禁用、参数配置）
 * - 来源管理（多来源切换）
 * - 使用统计
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bot, GitBranch, BarChart3 } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { AIModelPanel } from '@/components/admin/AIModelPanel';
import { AISourcePanel } from '@/components/admin/AISourcePanel';
import { AIStatsPanel } from '@/components/admin/AIStatsPanel';
import { loadAdminClientAccessState } from '@/lib/admin/client';

type AdminState = {
    loading: boolean;
    isAuthed: boolean;
    isAdmin: boolean;
};

type TabType = 'models' | 'sources' | 'stats';

const TABS = [
    { id: 'models' as const, label: '模型管理', icon: Bot },
    { id: 'sources' as const, label: '来源管理', icon: GitBranch },
    { id: 'stats' as const, label: '使用统计', icon: BarChart3 },
];

export default function AdminAIServicesPage() {
    const router = useRouter();
    const [state, setState] = useState<AdminState>({
        loading: true,
        isAuthed: false,
        isAdmin: false,
    });
    const [activeTab, setActiveTab] = useState<TabType>('models');

    useEffect(() => {
        const checkAdmin = async () => {
            setState(await loadAdminClientAccessState());
        };

        void checkAdmin();
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
                <p className="text-sm text-foreground-secondary">
                    登录后系统会自动识别管理员账号。
                </p>
            </div>
        );
    }

    if (!state.isAdmin) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-10">
                <h1 className="text-xl font-semibold mb-3">无权限访问</h1>
                <p className="text-sm text-foreground-secondary">
                    当前账号不在管理员名单中。
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:py-8 py-4 animate-fade-in">
            {/* 头部 */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => router.push('/user')}
                    className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">AI 服务管理</h1>
            </div>

            {/* 标签页 */}
            <div className="flex gap-2 mb-6 border-b border-border pb-4">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === id
                            ? 'bg-accent text-white shadow-sm'
                            : 'bg-background-secondary text-foreground-secondary hover:bg-background-secondary/80'
                            }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* 内容区 */}
            <div className="bg-background rounded-2xl border border-border p-6">
                {activeTab === 'models' && <AIModelPanel />}
                {activeTab === 'sources' && <AISourcePanel />}
                {activeTab === 'stats' && <AIStatsPanel />}
            </div>
        </div>
    );
}
