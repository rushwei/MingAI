import { Plus } from 'lucide-react';
import type { AIPersonality, AIPersonalityConfig } from '@/types';

export function ChatToolbar({
    personalities,
    activePersonality,
    onSelectPersonality,
    onNewChat,
}: {
    personalities: AIPersonalityConfig[];
    activePersonality: AIPersonality;
    onSelectPersonality: (personality: AIPersonality) => void;
    onNewChat: () => void;
}) {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
                {personalities.map((personality) => (
                    <button
                        key={personality.id}
                        onClick={() => onSelectPersonality(personality.id)}
                        className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                transition-all duration-200
                ${activePersonality === personality.id
                                ? 'bg-accent/10 text-accent border border-accent'
                                : 'bg-background-secondary border border-border hover:border-accent/50'
                            }
              `}
                        title={personality.description}
                    >
                        <span>{personality.emoji}</span>
                        <span className="hidden sm:inline">{personality.name}</span>
                    </button>
                ))}
            </div>

            <button
                onClick={onNewChat}
                className="p-2 rounded-lg text-foreground-secondary hover:bg-background-secondary hover:text-foreground transition-colors"
                title="新对话"
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>
    );
}
