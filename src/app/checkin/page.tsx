'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { CheckinModal } from '@/components/checkin/CheckinModal';

export default function CheckinPage() {
    return (
        <FeatureGate featureId="checkin">
            <LoginOverlay message="登录后即可每日签到领取积分">
                <CheckinPageContent />
            </LoginOverlay>
        </FeatureGate>
    );
}

function CheckinPageContent() {
    const router = useRouter();
    const [open, setOpen] = useState(true);

    const handleClose = () => {
        setOpen(false);
        if (window.history.length > 1) {
            router.back();
            return;
        }
        router.replace('/user/credits');
    };

    return (
        <div className="min-h-screen bg-background">
            <CheckinModal isOpen={open} onClose={handleClose} />
        </div>
    );
}
