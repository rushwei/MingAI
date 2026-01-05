import type { BaziFormData } from '@/types';
import { BasicInfoSection } from './BasicInfoSection';
import { BirthDateSection } from './BirthDateSection';
import { BirthTimeSection } from './BirthTimeSection';
import { BirthPlaceSection } from './BirthPlaceSection';
import { SubmitSection } from './SubmitSection';
import { DAY_OPTIONS, HOUR_OPTIONS, MONTH_OPTIONS, YEAR_OPTIONS } from './options';

type UpdateField = <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => void;

export function BaziForm({
    formData,
    onUpdate,
    unknownTime,
    onToggleUnknownTime,
    onSubmit,
    isSubmitting,
}: {
    formData: BaziFormData;
    onUpdate: UpdateField;
    unknownTime: boolean;
    onToggleUnknownTime: () => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    isSubmitting: boolean;
}) {
    return (
        <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BasicInfoSection formData={formData} onUpdate={onUpdate} />
            <BirthDateSection
                formData={formData}
                onUpdate={onUpdate}
                years={YEAR_OPTIONS}
                months={MONTH_OPTIONS}
                days={DAY_OPTIONS}
            />
            <BirthTimeSection
                formData={formData}
                unknownTime={unknownTime}
                onToggleUnknownTime={onToggleUnknownTime}
                onUpdate={onUpdate}
                hours={HOUR_OPTIONS}
            />
            <BirthPlaceSection formData={formData} onUpdate={onUpdate} />
            <SubmitSection isSubmitting={isSubmitting} />
        </form>
    );
}
