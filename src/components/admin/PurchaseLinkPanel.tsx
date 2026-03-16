/**
 * 购买链接配置面板
 * 
 * 管理员配置不同订阅类型的购买链接
 */
'use client';

import { useState, useEffect } from 'react';
import { Link2, Check, Crown, Sparkles, Coins } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { supabase } from '@/lib/supabase';

type ColorKey = 'amber' | 'purple' | 'blue';

const COLOR_CLASSES: Record<ColorKey, string> = {
    amber: 'bg-amber-500/10 text-amber-500',
    purple: 'bg-purple-500/10 text-purple-500',
    blue: 'bg-blue-500/10 text-blue-500',
};

const LINK_TYPES = [
    { type: 'plus' as const, label: 'Plus 会员', icon: Crown, color: 'amber' as ColorKey },
    { type: 'pro' as const, label: 'Pro 会员', icon: Sparkles, color: 'purple' as ColorKey },
    { type: 'credits' as const, label: '积分充值', icon: Coins, color: 'blue' as ColorKey },
];

export function PurchaseLinkPanel() {
    const [links, setLinks] = useState<Record<string, string>>({
        plus: '',
        pro: '',
        credits: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);

    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            // 直接从数据库读取
            const { data, error } = await supabase
                .from('purchase_links')
                .select('link_type, url');

            if (!error && data) {
                const linkMap: Record<string, string> = { plus: '', pro: '', credits: '' };
                data.forEach((link: { link_type: string; url: string }) => {
                    linkMap[link.link_type] = link.url;
                });
                setLinks(linkMap);
            }
        } catch (error) {
            console.error('Failed to fetch purchase links:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (type: 'plus' | 'pro' | 'credits') => {
        setSaving(type);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token || !session.user) return;

            // 直接使用 supabase 保存
            const { error } = await supabase
                .from('purchase_links')
                .upsert({
                    link_type: type,
                    url: links[type],
                    updated_by: session.user.id,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'link_type' });

            if (!error) {
                setSaved(type);
                setTimeout(() => setSaved(null), 2000);
            }
        } catch (error) {
            console.error('Failed to save purchase link:', error);
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return <SoundWaveLoader variant="block" />;
    }

    return (
        <div className="space-y-6">
            {/* 头部 */}
            <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-accent" />
                <h2 className="font-bold">购买链接配置</h2>
            </div>

            <p className="text-sm text-foreground-secondary">
                配置不同订阅类型的购买链接，用户点击后将跳转到对应页面获取激活码。
            </p>

            {/* 链接配置 */}
            <div className="space-y-4">
                {LINK_TYPES.map(({ type, label, icon: Icon, color }) => (
                    <div
                        key={type}
                        className="bg-background-secondary rounded-xl p-4 border border-border"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${COLOR_CLASSES[color]}`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <span className="font-medium">{label}</span>
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={links[type]}
                                onChange={(e) => setLinks({ ...links, [type]: e.target.value })}
                                placeholder="https://example.com/purchase"
                                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:border-accent outline-none text-sm"
                            />
                            <button
                                onClick={() => handleSave(type)}
                                disabled={saving === type}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                            >
                                {saving === type ? (
                                    <SoundWaveLoader variant="inline" />
                                ) : saved === type ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    '保存'
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
