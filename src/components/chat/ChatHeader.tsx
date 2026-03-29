/**
 * Chat 页面头部：桌面端右上角个性化与知识库入口
 *
 * 'use client' 标记说明：
 * - 渲染条件依赖 props
 */
'use client';

import { MessageCircleHeart, BookOpenText } from 'lucide-react';
import { SettingsCenterLink } from '@/components/settings/SettingsCenterLink';

interface ChatHeaderProps {
    membershipType: string;
    knowledgeBaseEnabled: boolean;
    aiPersonalizationEnabled: boolean;
}

export function ChatHeader({
    membershipType,
    knowledgeBaseEnabled,
    aiPersonalizationEnabled,
}: ChatHeaderProps) {
    return (
        <div className="hidden lg:flex absolute top-4 right-4 z-10 flex-wrap justify-end gap-2">
            {aiPersonalizationEnabled && (
                <SettingsCenterLink
                    tab="personalization"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background/80 backdrop-blur-md border border-border shadow-sm hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all duration-300 group"
                    title="个性化"
                >
                    <MessageCircleHeart className="w-5 h-5 text-foreground-secondary group-hover:text-accent transition-colors" />
                    <span className="text-sm font-medium text-foreground-secondary group-hover:text-accent transition-colors">
                        个性化
                    </span>
                </SettingsCenterLink>
            )}

            {membershipType !== 'free' && knowledgeBaseEnabled && (
                <SettingsCenterLink
                    tab="knowledge-base"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background/80 backdrop-blur-md border border-border shadow-sm hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all duration-300 group"
                    title="知识库"
                >
                    <BookOpenText className="w-5 h-5 text-foreground-secondary group-hover:text-accent transition-colors" />
                    <span className="text-sm font-medium text-foreground-secondary group-hover:text-accent transition-colors">
                        知识库
                    </span>
                </SettingsCenterLink>
            )}
        </div>
    );
}
