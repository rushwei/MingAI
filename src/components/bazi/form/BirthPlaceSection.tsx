import { MapPin } from 'lucide-react';
import type { BaziFormData } from '@/types';
import { LocationAutocomplete } from './LocationAutocomplete';

type UpdateField = <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => void;

export function BirthPlaceSection({
    formData,
    onUpdate,
}: {
    formData: BaziFormData;
    onUpdate: UpdateField;
}) {
    const quickCities = [
        { label: '北京', value: '北京市' },
        { label: '上海', value: '上海市' },
        { label: '广州', value: '广东省广州市' },
        { label: '深圳', value: '广东省深圳市' },
        { label: '杭州', value: '浙江省杭州市' },
        { label: '成都', value: '四川省成都市' },
    ];

    return (
        <div className="bg-background-secondary rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" />
                出生地点 <span className="text-sm font-normal text-foreground-secondary">(可选)</span>
            </h2>

            <LocationAutocomplete
                value={formData.birthPlace || ''}
                onChange={(value) => onUpdate('birthPlace', value)}
                placeholder="输入城市名，如：北京、上海、广州"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-foreground-secondary">
                <span>常用城市:</span>
                {quickCities.map((city) => (
                    <button
                        key={city.value}
                        type="button"
                        onClick={() => onUpdate('birthPlace', city.value)}
                        className="px-2.5 py-1 rounded-full border border-border hover:border-accent/60 hover:text-foreground transition-colors"
                    >
                        {city.label}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-sm text-foreground-secondary">
                提供出生地点可进行真太阳时校正，使排盘更加精准
            </p>
        </div>
    );
}
