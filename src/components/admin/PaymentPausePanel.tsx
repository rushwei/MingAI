/**
 * 支付暂停控制面板组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState)
 * - 有开关切换交互功能
 */
'use client';

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePaymentPause } from "@/lib/usePaymentPause";

export function PaymentPausePanel() {
    const { isPaused, isLoading, refresh } = usePaymentPause();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    const handleToggle = async () => {
        if (isSaving || isLoading) return;

        setIsSaving(true);
        setError("");

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                setError("请先登录");
                setIsSaving(false);
                return;
            }

            const response = await fetch("/api/payment-status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ paused: !isPaused }),
            });

            const result = await response.json();
            if (!response.ok) {
                setError(result.error || "更新失败");
                setIsSaving(false);
                return;
            }

            await refresh();
        } catch (err) {
            console.error("[payment-status] Update failed:", err);
            setError("网络错误，请重试");
        } finally {
            setIsSaving(false);
        }
    };

    const statusLabel = isPaused ? "已暂停" : "正常";

    return (
        <div className="rounded-xl border border-border bg-background p-5 space-y-3">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h2 className="text-base font-semibold">支付功能开关</h2>
                    </div>
                    <p className="text-sm text-foreground-secondary">
                        开启后所有订阅/充值入口将被锁定，仅支持管理员手动调整会员等级。
                    </p>
                </div>
                <button
                    onClick={handleToggle}
                    disabled={isSaving || isLoading}
                    className={`relative w-12 h-6 rounded-full transition-colors ${isPaused ? "bg-rose-500" : "bg-border"} ${isSaving || isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                    aria-pressed={isPaused}
                    aria-label="暂停支付功能"
                >
                    <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isPaused ? "translate-x-6" : "translate-x-0"}`}
                    />
                </button>
            </div>

            <div className="flex items-center gap-2 text-sm">
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin text-foreground-secondary" />
                        <span className="text-foreground-secondary">读取状态中...</span>
                    </>
                ) : (
                    <span className={`font-medium ${isPaused ? "text-rose-500" : "text-emerald-500"}`}>
                        {statusLabel}
                    </span>
                )}
                {isSaving && (
                    <span className="text-foreground-secondary">更新中...</span>
                )}
            </div>

            {error && (
                <div className="text-sm text-rose-500">{error}</div>
            )}
        </div>
    );
}
