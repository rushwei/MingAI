import { User } from 'lucide-react';
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
    return (
        <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent rounded-2xl p-4 border border-accent/20 mb-4">
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
                            {isUnknownTime && <span className="text-amber-500 ml-1">(*时辰未知)</span>}
                        </span>
                        <span>•</span>
                        <span>日主 {dayMaster}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
