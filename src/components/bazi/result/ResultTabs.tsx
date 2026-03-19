import { BookOpenText, Calendar, Sparkles } from 'lucide-react';

export type ResultTab = 'basic' | 'professional' | 'notes';

export function ResultTabs({
    activeTab,
    onChange,
}: {
    activeTab: ResultTab;
    onChange: (tab: ResultTab) => void;
}) {
    return (
        <div className="flex gap-1 p-1 bg-background-secondary rounded-xl sm:mb-4 mb-2">
            {[
                { id: 'basic', label: '基本信息', icon: Sparkles },
                { id: 'professional', label: '专业排盘', icon: Calendar },
                { id: 'notes', label: '断事笔记', icon: BookOpenText },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id as ResultTab)}
                    className={`
                            flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                            ${activeTab === tab.id
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-foreground-secondary hover:text-foreground'
                        }
                        `}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
