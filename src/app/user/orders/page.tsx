/**
 * 订单记录页面
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    CreditCard,
    CheckCircle,
    Clock,
    XCircle,
    Loader2,
    Package
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getOrderHistory, pricingPlans } from '@/lib/membership';

interface Order {
    id: string;
    product_type: string;
    amount: number;
    status: string;
    payment_method: string | null;
    created_at: string;
    paid_at: string | null;
}

const PAY_PER_USE_PRICE = 9.9;
const payPerUsePackages = [
    { count: 1, price: 9.9 },
    { count: 5, price: 45 },
    { count: 10, price: 89 },
    { count: 20, price: 168 },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    paid: { label: '已支付', color: 'text-green-500', icon: CheckCircle },
    pending: { label: '待支付', color: 'text-yellow-500', icon: Clock },
    cancelled: { label: '已取消', color: 'text-gray-500', icon: XCircle },
    refunded: { label: '已退款', color: 'text-blue-500', icon: CreditCard },
};

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

            const orderList = await getOrderHistory(session.user.id);
            setOrders(orderList as Order[]);
            setLoading(false);
        };

        fetchOrders();
    }, [router]);

    const getPayPerUseCount = (amount: number) => {
        if (!Number.isFinite(amount)) return null;

        const preset = payPerUsePackages.find(pkg => Math.abs(pkg.price - amount) < 0.01);
        if (preset) return preset.count;

        const estimated = Math.round(amount / PAY_PER_USE_PRICE);
        if (estimated < 1) return null;

        const estimatedAmount = Math.round(estimated * PAY_PER_USE_PRICE * 10) / 10;
        return Math.abs(estimatedAmount - amount) <= 0.05 ? estimated : null;
    };

    const getPlanName = (productType: string, amount: number) => {
        if (productType === 'pay_per_use') {
            const count = getPayPerUseCount(amount);
            return count ? `按量付费 · ${count}积分` : '按量付费';
        }

        const plan = pricingPlans.find(p => p.id === productType);
        return plan?.name || productType;
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
            {/* 头部 */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => router.push('/user')}
                    className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">订单记录</h1>
            </div>

            {/* 订单列表 */}
            {orders.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-foreground-secondary" />
                    </div>
                    <p className="text-foreground-secondary">暂无订单记录</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => {
                        const status = statusConfig[order.status] || statusConfig.pending;
                        const StatusIcon = status.icon;

                        return (
                            <div
                                key={order.id}
                                className="bg-background-secondary rounded-xl p-4 border border-border"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-medium">{getPlanName(order.product_type, Number(order.amount))}</h3>
                                        <p className="text-sm text-foreground-secondary">
                                            {formatDate(order.created_at)}
                                        </p>
                                    </div>
                                    <div className={`flex items-center gap-1 ${status.color}`}>
                                        <StatusIcon className="w-4 h-4" />
                                        <span className="text-sm">{status.label}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-border">
                                    <span className="text-sm text-foreground-secondary">
                                        订单号: {order.id.slice(0, 8)}...
                                    </span>
                                    <span className="text-lg font-bold text-accent">
                                        ¥{order.amount}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
