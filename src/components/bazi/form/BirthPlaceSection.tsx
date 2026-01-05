import { MapPin } from 'lucide-react';
import type { BaziFormData } from '@/types';

type UpdateField = <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => void;

export function BirthPlaceSection({
    formData,
    onUpdate,
}: {
    formData: BaziFormData;
    onUpdate: UpdateField;
}) {
    return (
        <div className="bg-background-secondary rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" />
                出生地点 <span className="text-sm font-normal text-foreground-secondary">(可选)</span>
            </h2>

            <input
                type="text"
                value={formData.birthPlace || ''}
                onChange={(e) => onUpdate('birthPlace', e.target.value)}
                placeholder="如：北京市、上海市、广州市"
                className="w-full px-4 py-3 rounded-lg bg-background border border-border
                     focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     transition-all duration-200"
            />
            <p className="mt-2 text-sm text-foreground-secondary">
                提供出生地点可进行真太阳时校正，使排盘更加精准
            </p>
        </div>
    );
}
