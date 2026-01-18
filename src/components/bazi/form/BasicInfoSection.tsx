import { User } from 'lucide-react';
import type { BaziFormData, Gender } from '@/types';

type UpdateField = <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => void;

export function BasicInfoSection({
    formData,
    onUpdate,
}: {
    formData: BaziFormData;
    onUpdate: UpdateField;
}) {
    return (
        <div className="bg-background rounded-xl p-6 shadow-sm border border-border/50">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-accent" />
                基本信息
            </h2>

            <div className="space-y-6">
                {/* 姓名输入 */}
                <div>
                    <label className="block text-sm font-medium mb-2 text-foreground-secondary">
                        姓名 <span className="text-foreground-tertiary text-xs ml-1">(可选)</span>
                    </label>
                    <div className="relative group">
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => onUpdate('name', e.target.value)}
                            placeholder="请输入姓名"
                            className="w-full px-4 py-3 rounded-lg bg-background border border-border
                                focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                                group-hover:border-accent/50
                                transition-all duration-200 placeholder:text-foreground-tertiary"
                        />
                    </div>
                </div>

                {/* 性别选择 */}
                <div>
                    <label className="block text-sm font-medium mb-2 text-foreground-secondary">性别</label>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { value: 'male', label: '男', emoji: '👨' },
                            { value: 'female', label: '女', emoji: '👩' },
                        ].map(({ value, label, emoji }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => onUpdate('gender', value as Gender)}
                                className={`
                                    relative overflow-hidden
                                    py-3 px-4 rounded-xl border transition-all duration-200
                                    flex items-center justify-center gap-3
                                    ${formData.gender === value
                                        ? 'bg-accent text-white border-accent shadow-md shadow-accent/20'
                                        : 'bg-background border-border hover:border-accent/50 hover:bg-background-secondary'
                                    }
                                `}
                            >
                                <span className="text-xl">{emoji}</span>
                                <span className={`font-medium ${formData.gender === value ? 'text-white' : 'text-foreground'}`}>
                                    {label}
                                </span>
                                {formData.gender === value && (
                                    <div className="absolute inset-0 bg-white/10 animate-pulse-slow" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
