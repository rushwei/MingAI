/**
 * Chat 页面头部：桌面端右上角个性化与知识库入口
 *
 * 'use client' 标记说明：
 * - 使用 useFeatureToggles hook
 */
'use client';

import Link from 'next/link';
import { MessageCircleHeart, BookOpenText } from 'lucide-react';

interface ChatHeaderProps {
    sidebarCollapsed: boolean;
    membershipType: string;
    knowledgeBaseEnabled: boolean;
    aiPersonalizationEnabled: boolean;
}

export function ChatHeader({
    sidebarCollapsed,
    membershipType,
    knowledgeBaseEnabled,
    aiPersonalizationEnabled,
}: ChatHeaderProps) {
    return (
        <div className="hidden lg:flex absolute top-4 right-4 z-10 flex-col gap-2 items-end">
            {aiPersonalizationEnabled && (
                <Link
                    href="/user/settings/ai"
                    className={`flex items-center gap-2 p-2 rounded-lg bg-background/80 backdrop-blur-md border border-border shadow-sm hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all duration-300 group ${sidebarCollapsed ? 'pl-3 pr-4' : ''}`}
                    title="个性化"
                >
                    <MessageCircleHeart className="w-5 h-5 text-foreground-secondary group-hover:text-accent transition-colors" />
                    {sidebarCollapsed && <span className="text-sm font-medium">个性化</span>}
                </Link>
            )}

            {membershipType !== 'free' && knowledgeBaseEnabled && (
                <Link
                    href="/user/knowledge-base"
                    className={`flex items-center gap-2 p-2 rounded-lg bg-background/80 backdrop-blur-md border border-border shadow-sm hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all duration-300 group ${sidebarCollapsed ? 'pl-3 pr-4' : ''}`}
                    title="知识库"
                >
                    <BookOpenText className="w-5 h-5 text-foreground-secondary group-hover:text-accent transition-colors" />
                    {sidebarCollapsed && <span className="text-sm font-medium">知识库</span>}
                </Link>
            )}
        </div>
    );
}
