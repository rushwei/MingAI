/**
 * 积分流水页面
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth';
import { ArrowDownLeft, ArrowUpRight, Coins, RefreshCcw, Calendar } from 'lucide-react';
import { FeatureGate } from '@/components/layout/FeatureGate';

interface CreditTransaction {
    id: string;
    amount: number;
    type: 'earn' | 'spend' | 'refund';
    source: string;
    description: string | null;
    balance_after: number | null;
    created_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
    activation_key: '激活码',
    checkin: '每日签到',
    ai_usage: 'AI 消费',
    ai_refund: 'AI 退款',
};

export default function CreditsPage() {
    return (
        <FeatureGate featureId="credits">
            <CreditsPageContent />
        </FeatureGate>
    );
}

function CreditsPageContent() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                router.push('/user');
                return;
            }

            try {
                const response = await fetch('/api/credits/transactions', {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || '获取积分流水失败');
                }
                setTransactions(result.data || []);
            } catch (error) {
                console.error('获取积分流水异常:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchTransactions();
    }, [router]);

    const totalEarned = useMemo(
        () => transactions.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0),
        [transactions],
    );
    const totalSpent = useMemo(
        () => Math.abs(transactions.filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0)),
        [transactions],
    );

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTransactionIcon = (item: CreditTransaction) => {
        if (item.type === 'refund') {
            return <RefreshCcw className="w-4 h-4 text-emerald-500" />;
        }
        if (item.amount < 0) {
            return <ArrowUpRight className="w-4 h-4 text-rose-500" />;
        }
        return <ArrowDownLeft className="w-4 h-4 text-amber-500" />;
    };

    const getTransactionColor = (item: CreditTransaction) => {
        if (item.type === 'refund') {
            return 'text-emerald-500';
        }
        return item.amount < 0 ? 'text-rose-500' : 'text-amber-500';
    };

    const getAmountText = (item: CreditTransaction) => {
        return item.amount > 0 ? `+${item.amount}` : String(item.amount);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-4 md:py-8 relative z-10 animate-fade-in">
                <div className="hidden md:flex items-end justify-between mb-10">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            积分流水
                        </h1>
                        <p className="text-sm text-foreground-secondary mt-1">查看积分获取、消费与退款记录</p>
                    </div>
                    <div className="flex gap-3 text-sm">
                        <div className="rounded-xl border border-border bg-background px-4 py-2">
                            累计获得 <span className="font-semibold text-amber-500">{totalEarned}</span>
                        </div>
                        <div className="rounded-xl border border-border bg-background px-4 py-2">
                            累计消耗 <span className="font-semibold text-rose-500">{totalSpent}</span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-28 bg-background-secondary/50 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : transactions.length > 0 ? (
                    <div className="space-y-4">
                        {transactions.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-3xl border border-border/50 bg-background p-5 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-background-secondary flex items-center justify-center">
                                            {getTransactionIcon(item)}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-foreground">
                                                {item.description || SOURCE_LABELS[item.source] || item.source}
                                            </div>
                                            <div className="text-xs text-foreground-secondary mt-1">
                                                来源：{SOURCE_LABELS[item.source] || item.source}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xl font-bold ${getTransactionColor(item)}`}>
                                            {getAmountText(item)}
                                        </div>
                                        <div className="text-xs text-foreground-secondary">积分</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 pt-4 border-t border-dashed border-border/50 text-sm text-foreground-secondary">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-accent/70" />
                                        <span>{formatDate(item.created_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-lg bg-foreground/5 px-3 py-1">
                                        <Coins className="w-4 h-4" />
                                        <span>余额 {item.balance_after ?? '--'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-background-secondary/50 rounded-3xl border border-border/50 backdrop-blur-sm">
                        <div className="w-20 h-20 bg-accent/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Coins className="w-10 h-10 text-accent/30" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">暂无积分流水</h3>
                        <p className="text-foreground-secondary max-w-xs mx-auto mb-8">
                            还没有积分变动记录。去签到、激活码或使用会员权益后，这里会显示完整历史。
                        </p>
                        <button
                            onClick={() => router.push('/user/upgrade')}
                            className="px-8 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 hover:scale-105 transition-all shadow-lg shadow-accent/20"
                        >
                            前往会员中心
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
