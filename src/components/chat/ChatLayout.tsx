/**
 * Chat 主布局：消息区域 + 输入组件
 *
 * 对话侧边栏已合并到全局 Sidebar，此组件仅渲染聊天内容。
 *
 * 'use client' 标记说明：
 * - 使用 React hooks 和交互状态
 */
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Sparkles, Lock } from 'lucide-react';
import type { ChatMessage, AttachmentState, Mention } from '@/types';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { VirtualizedChatMessageList } from '@/components/chat/VirtualizedChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MobileChatDrawer } from '@/components/chat/MobileChatDrawer';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import type { ChatBootstrapKnowledgeBase } from '@/lib/chat/bootstrap';
import type { MembershipType } from '@/lib/user/membership';
import type { ChatMode } from '@/lib/chat/use-chat-state';

interface ChatLayoutProps {
    // Active conversation
    activeConversationId: string | null;
    conversationLoading: boolean;

    // Messages
    messages: ChatMessage[];
    isLoading: boolean;
    isSendingToList: boolean;
    messagesEndRef: React.MutableRefObject<HTMLDivElement | null>;
    messageScrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
    onMessageListScroll: () => void;
    // Handlers
    onEditMessage: (messageId: string, newContent: string, nextMentions?: Mention[]) => Promise<void>;
    onRegenerateResponse: (messageId: string) => Promise<void>;
    onSwitchVersion: (messageId: string, versionIndex: number) => void;
    onArchiveMessage?: (message: ChatMessage) => void;
    onSend: () => Promise<void>;
    onStop: () => void;

    // Composer props
    inputValue: string;
    onInputChange: (value: string) => void;
    disabled: boolean;
    chatMode: ChatMode;
    onChatModeChange: (mode: ChatMode) => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
    reasoningEnabled: boolean;
    onReasoningChange: (enabled: boolean) => void;
    userId: string | null;
    membershipType: MembershipType;
    attachmentState: AttachmentState;
    onAttachmentChange: (state: AttachmentState) => void;
    mentions: Mention[];
    onMentionsChange: (mentions: Mention[]) => void;
    promptKnowledgeBases: ChatBootstrapKnowledgeBase[];
    dreamContext?: { baziChartName?: string; dailyFortune?: string };
    dreamContextLoading: boolean;
    knowledgeBaseEnabled: boolean;
    aiPersonalizationEnabled: boolean;

    // Credit lock
    isCreditLocked: boolean;
    onAuthRequired?: () => void;

    // Modals (rendered by parent)
    children?: ReactNode;
}

export function ChatLayout(props: ChatLayoutProps) {
    const {
        activeConversationId, conversationLoading,
        messages, isLoading, isSendingToList,
        messagesEndRef, messageScrollContainerRef, onMessageListScroll,
        onEditMessage, onRegenerateResponse, onSwitchVersion, onArchiveMessage,
        onSend, onStop,
        inputValue, onInputChange, disabled,
        chatMode, onChatModeChange,
        selectedModel, onModelChange, reasoningEnabled, onReasoningChange,
        userId, membershipType, attachmentState, onAttachmentChange,
        mentions, onMentionsChange, promptKnowledgeBases,
        dreamContext, dreamContextLoading,
        knowledgeBaseEnabled, aiPersonalizationEnabled,
        isCreditLocked,
        onAuthRequired,
        children,
    } = props;

    const composerProps = {
        inputValue, isLoading, isSendingToList,
        onInputChange, onSend, onStop, onAuthRequired, disabled,
        chatMode, onChatModeChange,
        selectedModel, onModelChange, reasoningEnabled, onReasoningChange,
        userId, membershipType, attachmentState, onAttachmentChange,
        mentions, onMentionsChange, promptKnowledgeBases,
        contextMessages: messages,
        dreamContext, dreamContextLoading,
        knowledgeBaseEnabled,
    };

    return (
        <div className="flex h-[calc(100vh-var(--mobile-header-height)-5rem)] lg:h-screen bg-background">
            {/* 移动端对话抽屉 */}
            <MobileChatDrawer />

            <div className="flex-1 flex flex-col min-w-0 relative bg-background">
                <ChatHeader
                    membershipType={membershipType}
                    knowledgeBaseEnabled={knowledgeBaseEnabled}
                    aiPersonalizationEnabled={aiPersonalizationEnabled}
                />

                {conversationLoading ? (
                    <SoundWaveLoader variant="block" text="" />
                ) : messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 bg-background">
                        <p className="text-xl text-foreground-secondary mb-8 animate-fade-in-up">今天运势如何？</p>
                        {isCreditLocked && (
                            <CreditLockBanner />
                        )}
                        <div className="w-full max-w-3xl">
                            <ChatComposer {...composerProps} hideDisclaimer />
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.length > 20 ? (
                            <div className="flex-1 px-4 py-4 relative bg-background">
                                <VirtualizedChatMessageList
                                    messages={messages} isLoading={isLoading || isSendingToList}
                                    onEditMessage={onEditMessage} onRegenerateResponse={onRegenerateResponse}
                                    onSwitchVersion={onSwitchVersion}
                                    onArchiveMessage={activeConversationId ? onArchiveMessage : undefined}
                                    disabled={isCreditLocked}
                                />
                            </div>
                        ) : (
                            <div ref={messageScrollContainerRef} onScroll={onMessageListScroll} className="flex-1 overflow-y-auto px-4 py-4 relative bg-background">
                                <ChatMessageList
                                    messages={messages} isLoading={isLoading || isSendingToList} messagesEndRef={messagesEndRef}
                                    onEditMessage={onEditMessage} onRegenerateResponse={onRegenerateResponse}
                                    onSwitchVersion={onSwitchVersion}
                                    onArchiveMessage={activeConversationId ? onArchiveMessage : undefined}
                                    disabled={isCreditLocked}
                                />
                            </div>
                        )}
                        {isCreditLocked && (
                            <CreditLockBanner inline />
                        )}
                        <ChatComposer {...composerProps} />
                    </>
                )}
            </div>

            {children}
        </div>
    );
}

function CreditLockBanner({ inline }: { inline?: boolean }) {
    const wrapperClass = inline
        ? 'px-4 py-3 bg-amber-500/10 border-t border-amber-500/20'
        : 'w-full max-w-3xl mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl';
    return (
        <div className={wrapperClass}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-600">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm">积分已用完</span>
                </div>
                <Link href="/user/upgrade" className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 transition-colors">
                    <Sparkles className="w-3.5 h-3.5" />
                    获取积分
                </Link>
            </div>
        </div>
    );
}
