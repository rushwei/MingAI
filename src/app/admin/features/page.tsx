/**
 * 功能与支付管理页面
 * 仅管理员可访问
 *
 * 功能:
 * - 功能模块开关控制
 * - 支付开关控制
 * - 激活Key管理
 * - 购买链接配置
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ToggleLeft, Key, Link2, Settings2 } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { supabase } from '@/lib/supabase';
import { FeatureTogglePanel } from '@/components/admin/FeatureTogglePanel';
import { PaymentPausePanel } from '@/components/admin/PaymentPausePanel';
import { KeyManagementPanel } from '@/components/admin/KeyManagementPanel';
import { PurchaseLinkPanel } from '@/components/admin/PurchaseLinkPanel';

type AdminState = {
    loading: boolean;
    isAuthed: boolean;
    isAdmin: boolean;
};

type TabType = 'toggles' | 'pause' | 'keys' | 'links';

const TABS = [
    { id: 'toggles' as const, label: '功能开关', icon: Settings2 },
    { id: 'pause' as const, label: '支付管理', icon: ToggleLeft },
    { id: 'keys' as const, label: '激活码', icon: Key },
    { id: 'links' as const, label: '购买链接', icon: Link2 },
];

export default function AdminFeaturesPage() {
    const router = useRouter();
    const [state, setState] = useState<AdminState>({
        loading: true,
        isAuthed: false,
        isAdmin: false,
    });
    const [activeTab, setActiveTab] = useState<TabType>('toggles');

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setState({ loading: false, isAuthed: false, isAdmin: false });
                return;
            }

            const { data, error } = await supabase
                .from('users')
                .select('is_admin')
                .eq('id', session.user.id)
                .maybeSingle();

            if (error) {
                console.error('管理员校验失败:', error);
            }

            setState({
                loading: false,
                isAuthed: true,
                isAdmin: !!data?.is_admin,
            });
        };

        checkAdmin();
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
        <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => router.push('/user')}
                    className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">功能与支付管理</h1>
            </div>

            <div className="flex gap-2 mb-6 border-b border-border pb-4 overflow-x-auto">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                            activeTab === id
                                ? 'bg-accent text-white shadow-sm'
                                : 'bg-background-secondary text-foreground-secondary hover:bg-background-secondary/80'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            <div className="bg-background rounded-2xl border border-border p-6">
                {activeTab === 'toggles' && <FeatureTogglePanel />}
                {activeTab === 'pause' && <PaymentPausePanel />}
                {activeTab === 'keys' && <KeyManagementPanel />}
                {activeTab === 'links' && <PurchaseLinkPanel />}
            </div>
        </div>
    );
}
