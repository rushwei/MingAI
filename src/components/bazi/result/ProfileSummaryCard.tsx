import { MapPinned } from 'lucide-react';
import type { BaziCanonicalJSON } from '@mingai/core/json';
import type { BaziFormData } from '@/types';

export function ProfileSummaryCard({
    formData,
    isUnknownTime,
    canonicalChart,
}: {
    formData: BaziFormData;
    isUnknownTime: boolean;
    canonicalChart: BaziCanonicalJSON;
}) {
    const timeText = isUnknownTime
        ? '时辰未知'
        : `${String(formData.birthHour).padStart(2, '0')}:${String(formData.birthMinute || 0).padStart(2, '0')}`;

    const summaryItems = [
        {
            label: '日主',
            value: canonicalChart.basicInfo.dayMaster,
        },
        {
            label: '出生时间',
            value: `${formData.birthYear}年${formData.birthMonth}月${formData.birthDay}日 ${timeText}`,
        },
        canonicalChart.basicInfo.birthPlace ? {
            label: '出生地点',
            value: canonicalChart.basicInfo.birthPlace,
        } : null,
    ].filter((item): item is { label: string; value: string } => Boolean(item));

    return (
        <div className="bg-background border border-gray-200 rounded-md px-5 py-4 mb-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <h1 className="text-xl font-semibold tracking-tight truncate text-foreground">
                        {formData.name}
                    </h1>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-[0.18em] ${formData.gender === 'male' ? 'text-blue-500/70 bg-blue-50' : 'text-pink-500/70 bg-pink-50'}`}>
                        {formData.gender === 'male' ? '男' : '女'}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground/60 lg:justify-end lg:min-w-0 lg:pl-6 lg:border-l lg:border-gray-100">
                    {summaryItems.map((item) => (
                        <div key={item.label} className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/30 shrink-0">
                                {item.label}
                            </span>
                            {item.label === '出生地点' ? <MapPinned className="w-3.5 h-3.5 text-foreground/35 shrink-0" /> : null}
                            <span className="font-medium text-foreground/80 truncate">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
