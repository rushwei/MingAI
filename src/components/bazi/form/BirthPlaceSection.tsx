import { MapPinned } from 'lucide-react';
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
        <div className="bg-background rounded-xl p-6 shadow-sm border border-border/50">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <MapPinned className="w-5 h-5 text-accent" />
                出生地点 <span className="text-sm font-normal text-foreground-secondary ml-auto">(真太阳时校正需要)</span>
            </h2>

            <div className="space-y-4">
                <LocationAutocomplete
                    value={formData.birthPlace || ''}
                    onChange={(value) => onUpdate('birthPlace', value)}
                    placeholder="输入城市名，如：北京、上海、广州"
                />

                <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-foreground-secondary ml-1">热门城市快捷选择</span>
                    <div className="flex flex-wrap items-center gap-2">
                        {quickCities.map((city) => (
                            <button
                                key={city.value}
                                type="button"
                                onClick={() => onUpdate('birthPlace', city.value)}
                                className={`
                                    px-3 py-1.5 rounded-lg border text-xs transition-all duration-200
                                    ${formData.birthPlace === city.value
                                        ? 'bg-accent/10 border-accent text-accent font-medium'
                                        : 'bg-background border-border hover:border-accent/40 hover:bg-background-secondary text-foreground-secondary hover:text-foreground'
                                    }
                                `}
                            >
                                {city.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`
                    mt-2 text-xs p-3 rounded-lg border border-dashed transition-colors duration-300
                    ${formData.birthPlace
                        ? 'bg-green-50/50 border-green-200/50 text-green-600/80'
                        : 'bg-background-secondary/30 border-border/50 text-foreground-tertiary'
                    }
                `}>
                    {formData.birthPlace ? (
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            已设置出生地，系统将自动进行真太阳时校正
                        </div>
                    ) : (
                        "温馨提示：若未设置出生地，将采用平太阳时（即标准时间）排盘，可能会有细微偏差"
                    )}
                </div>
            </div>
        </div>
    );
}
