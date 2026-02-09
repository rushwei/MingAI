import type { BaziFormData } from '@/types';
import { BasicInfoSection } from '@/components/bazi/form/BasicInfoSection';
import { BirthDateSection } from '@/components/bazi/form/BirthDateSection';
import { BirthTimeSection } from '@/components/bazi/form/BirthTimeSection';
import { BirthPlaceSection } from '@/components/bazi/form/BirthPlaceSection';
import { SubmitSection } from '@/components/bazi/form/SubmitSection';
import { HOUR_OPTIONS, MONTH_OPTIONS, YEAR_OPTIONS } from '@/components/bazi/form/options';

type UpdateField = <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => void;

export function BaziForm({
    formData,
    onUpdate,
    unknownTime,
    onToggleUnknownTime,
    onSubmit,
    onSetToday,
    isSubmitting,
    autoFillTime,
}: {
    formData: BaziFormData;
    onUpdate: UpdateField;
    unknownTime: boolean;
    onToggleUnknownTime: () => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onSetToday: () => void;
    isSubmitting: boolean;
    autoFillTime: boolean;
}) {
    return (
        <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BasicInfoSection formData={formData} onUpdate={onUpdate} />
            <BirthDateSection
                formData={formData}
                onUpdate={onUpdate}
                years={YEAR_OPTIONS}
                months={MONTH_OPTIONS}
                onSetToday={onSetToday}
            />
            <BirthTimeSection
                formData={formData}
                unknownTime={unknownTime}
                onToggleUnknownTime={onToggleUnknownTime}
                onUpdate={onUpdate}
                hours={HOUR_OPTIONS}
                autoFillTime={autoFillTime}
            />
            <BirthPlaceSection formData={formData} onUpdate={onUpdate} />
            <SubmitSection isSubmitting={isSubmitting} />
        </form>
    );
}
