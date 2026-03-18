/**
 * 订单记录页面
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth';
import { CreditCard, Calendar, ShoppingBag } from 'lucide-react';
import { FeatureGate } from '@/components/layout/FeatureGate';

interface Order {
    id: string;
    product_type: string;
    amount: number;
    status: string;
    payment_method: string | null;
    created_at: string;
    paid_at: string | null;
    user_id: string;
}

// 产品类型显示名称
const PRODUCT_TYPE_LABELS: Record<string, string> = {
    plus: 'Plus 会员订阅',
    pro: 'Pro 会员订阅',
    pay_per_use: '单次付费服务',
};

export default function OrdersPage() {
    return (
        <FeatureGate featureId="orders">
            <OrdersPageContent />
        </FeatureGate>
    );
}

function OrdersPageContent() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            // 使用 getSession 从本地缓存读取，比 getUser 快得多
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                router.push('/user');
                return;
            }

            try {
                const response = await fetch('/api/orders', {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || '获取订单失败');
                }
                setOrders(result.data || []);
            } catch (err) {
                console.error('获取订单异常:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [router]);

    // 获取产品类型显示名称
    const getProductLabel = (productType: string) => {
        return PRODUCT_TYPE_LABELS[productType] || productType;
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100/80 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
            case 'pending':
                return 'bg-orange-100/80 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
            case 'refunded':
                return 'bg-slate-100/80 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700';
            case 'cancelled':
                return 'bg-red-100/80 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
            default:
                return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'paid': return '支付成功';
            case 'pending': return '待支付';
            case 'refunded': return '已退款';
            case 'cancelled': return '已取消';
            default: return status;
        }
    };

    const getPaymentIcon = (method: string | null) => {
        const label = method === 'WeChat'
            ? '微信支付'
            : method === 'Alipay'
            ? '支付宝'
            : method === 'activation_key'
            ? '激活码'
            : method === 'simulated'
            ? '模拟支付'
            : method
            ? '在线支付'
            : '未知';

        return (
            <div className="flex items-center gap-1 text-xs text-foreground-secondary/70 bg-foreground/5 px-2 py-0.5 rounded">
                <CreditCard className="w-3 h-3" />
                <span>{label}</span>
            </div>
        );
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-2xl mx-auto px-4 py-4 md:py-8 relative z-10 animate-fade-in">
                {/* 桌面端头部 */}
                <div className="hidden md:block mb-10">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">订单记录</h1>
                    <p className="text-sm text-foreground-secondary mt-1">查看您的消费历史</p>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-background-secondary/50 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : orders.length > 0 ? (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="group relative bg-background hover:bg-background-secondary/50 rounded-3xl border border-border/50 shadow-sm hover:shadow-md hover:border-accent/30 transition-all duration-300 overflow-hidden"
                            >
                                {/* Ticket Decoration */}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-background-secondary/10 rounded-r-full border-r border-y border-border/30" />
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-background-secondary/10 rounded-l-full border-l border-y border-border/30" />

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-foreground text-lg">{getProductLabel(order.product_type)}</h3>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusStyle(order.status)}`}>
                                                    {getStatusText(order.status)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-foreground-secondary font-mono tracking-wide opacity-70">
                                                ID: {order.id.slice(0, 8)}...
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-foreground block">¥{Number(order.amount).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-dashed border-border/50">
                                        <div className="flex items-center gap-4 text-sm text-foreground-secondary">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4 text-accent/70" />
                                                <span>{formatDate(order.created_at)}</span>
                                            </div>
                                        </div>
                                        {getPaymentIcon(order.payment_method)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-background-secondary/50 rounded-3xl border border-border/50 backdrop-blur-sm">
                        <div className="w-20 h-20 bg-accent/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShoppingBag className="w-10 h-10 text-accent/30" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">暂无订单</h3>
                        <p className="text-foreground-secondary max-w-xs mx-auto mb-8">
                            您还没有购买过任何服务，快去体验一下 MingAI 的神奇功能吧
                        </p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-8 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 hover:scale-105 transition-all shadow-lg shadow-accent/20"
                        >
                            去逛逛
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
