import { User, MapPinned } from 'lucide-react';
import type { BaziFormData } from '@/types';

export function ProfileSummaryCard({
    formData,
    isUnknownTime,
    dayMaster,
}: {
    formData: BaziFormData;
    isUnknownTime: boolean;
    dayMaster: string;
}) {
    const timeText = isUnknownTime
        ? '时辰未知'
        : `${String(formData.birthHour).padStart(2, '0')}:${String(formData.birthMinute || 0).padStart(2, '0')}`;

    return (
        <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent rounded-2xl p-4 border border-accent/20 sm:mb-4 mb-2">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-bold truncate">{formData.name}</h1>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm text-foreground-secondary">
                        <span>{formData.gender === 'male' ? '男' : '女'}</span>
                        <span>•</span>
                        <span>
                            {formData.birthYear}年{formData.birthMonth}月{formData.birthDay}日
                            <span className="ml-2">{timeText}</span>
                        </span>
                        <span>•</span>
                        <span>日主 {dayMaster}</span>
                    </div>
                    {formData.birthPlace && (
                        <div className="text-sm text-foreground-secondary mt-0.5">
                            <span className="inline-flex items-center gap-1">
                                <MapPinned className="w-4 h-4 text-foreground-secondary" />
                                {formData.birthPlace}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
