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
        <div className="bg-background-secondary rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-accent" />
                基本信息
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        姓名 <span className="text-foreground-secondary">(可选)</span>
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => onUpdate('name', e.target.value)}
                        placeholder="请输入姓名"
                        className="w-full px-4 py-3 rounded-lg bg-background border border-border
                         focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                         transition-all duration-200"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">性别</label>
                    <div className="flex gap-4">
                        {[
                            { value: 'male', label: '男', emoji: '👨' },
                            { value: 'female', label: '女', emoji: '👩' },
                        ].map(({ value, label, emoji }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => onUpdate('gender', value as Gender)}
                                className={`
                      flex-1 py-3 px-4 rounded-lg border transition-all duration-200
                      ${formData.gender === value
                                        ? 'bg-accent/10 border-accent text-accent'
                                        : 'bg-background border-border hover:border-accent/50'
                                    }
                    `}
                            >
                                <span className="mr-2">{emoji}</span>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
