/**
 * 订单记录页面
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, CreditCard, Calendar, ShoppingBag } from 'lucide-react';

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

export default function OrdersPage() {
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

            // 模拟订单数据用于展示 UI 效果
            setOrders([
                {
                    id: 'ORD-20240118-001',
                    product_type: 'AI 深度塔罗牌解读',
                    amount: 68.00,
                    status: 'completed',
                    created_at: '2024-01-18T14:30:00Z',
                    payment_method: 'WeChat',
                    paid_at: '2024-01-18T14:30:00Z',
                    user_id: session.user.id
                },
                {
                    id: 'ORD-20240115-003',
                    product_type: '2024年流年运势分析',
                    amount: 88.00,
                    status: 'completed',
                    created_at: '2024-01-15T09:12:00Z',
                    payment_method: 'Alipay',
                    paid_at: '2024-01-15T09:12:00Z',
                    user_id: session.user.id
                },
                {
                    id: 'ORD-20240110-002',
                    product_type: '周易六爻问事',
                    amount: 45.00,
                    status: 'refunded',
                    created_at: '2024-01-10T18:45:00Z',
                    payment_method: 'WeChat',
                    paid_at: '2024-01-10T18:45:00Z',
                    user_id: session.user.id
                },
            ]);
            setLoading(false);
        };

        fetchOrders();
    }, [router]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100/80 text-green-700 border-green-200';
            case 'pending':
                return 'bg-orange-100/80 text-orange-700 border-orange-200';
            case 'refunded':
                return 'bg-slate-100/80 text-slate-600 border-slate-200';
            default:
                return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed': return '支付成功';
            case 'pending': return '待支付';
            case 'refunded': return '已退款';
            default: return status;
        }
    };

    const getPaymentIcon = (method: string | null) => {
        // Simplified for this example
        return (
            <div className="flex items-center gap-1 text-xs text-foreground-secondary/70 bg-foreground/5 px-2 py-0.5 rounded">
                <CreditCard className="w-3 h-3" />
                <span>{method === 'WeChat' ? '微信支付' : method === 'Alipay' ? '支付宝' : '在线支付'}</span>
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
        <div className="min-h-screen bg-white pb-20">
            <div className="max-w-2xl mx-auto px-4 py-8 relative z-10 animate-fade-in">
                {/* 头部 */}
                <div className="flex items-center gap-4 mb-10">
                    <button
                        onClick={() => router.push('/user')}
                        className="p-2.5 rounded-xl bg-white/50 border border-border/50 hover:bg-white hover:shadow-md transition-all text-foreground-secondary hover:text-foreground backdrop-blur-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">订单记录</h1>
                        <p className="text-sm text-foreground-secondary mt-1">查看您的消费历史</p>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-white/50 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : orders.length > 0 ? (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="group relative bg-white hover:bg-white/80 rounded-3xl border border-border/50 shadow-sm hover:shadow-md hover:border-accent/30 transition-all duration-300 overflow-hidden"
                            >
                                {/* Ticket Decoration */}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-background rounded-r-full border-r border-y border-border/30" />
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-background rounded-l-full border-l border-y border-border/30" />

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-foreground text-lg">{order.product_type}</h3>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusStyle(order.status)}`}>
                                                    {getStatusText(order.status)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-foreground-secondary font-mono tracking-wide opacity-70">
                                                ID: {order.id}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-foreground block">¥{order.amount.toFixed(2)}</span>
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
                    <div className="text-center py-20 bg-white/50 rounded-3xl border border-border/50 backdrop-blur-sm">
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
