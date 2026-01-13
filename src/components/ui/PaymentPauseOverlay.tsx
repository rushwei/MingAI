"use client";

import { Lock } from "lucide-react";

interface PaymentPauseOverlayProps {
    children: React.ReactNode;
    isPaused: boolean;
    title?: string;
    description?: string;
}

export function PaymentPauseOverlay({
    children,
    isPaused,
    title = "支付服务已暂停",
    description = "当前仅支持管理员手动调整会员等级，请稍后再试。",
}: PaymentPauseOverlayProps) {
    if (!isPaused) return <>{children}</>;

    return (
        <div className="relative">
            <div className="blur-sm pointer-events-none select-none">
                {children}
            </div>
            <div className="absolute inset-0 z-50 flex items-start justify-center pt-24 bg-background/60 backdrop-blur-sm">
                <div className="text-center p-6 max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">{title}</h2>
                    <p className="text-foreground-secondary text-sm">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}
