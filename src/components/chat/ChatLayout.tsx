/**
 * Chat 主布局：侧边栏 + 聊天区域
 *
 * 'use client' 标记说明：
 * - 使用 React hooks 和交互状态
 */
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Sparkles, Lock } from 'lucide-react';
import type { ChatMessage, Conversation, AttachmentState, Mention } from '@/types';
import type { SelectedCharts } from '@/components/chat/BaziChartSelector';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { VirtualizedChatMessageList } from '@/components/chat/VirtualizedChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import type { ChatBootstrapKnowledgeBase } from '@/lib/chat/bootstrap';
import type { MembershipType } from '@/lib/user/membership';

interface ChatLayoutProps {
    // Sidebar
    conversations: Conversation[];
    activeConversationId: string | null;
    pendingSidebarTitle: string | null;
    generatingTitleConversationIds: Set<string>;
    onSelectConversation: (id: string, options?: { updateUrl?: boolean }) => Promise<void>;
    onNewChat: () => Promise<void>;
    onDeleteConversation: (id: string) => Promise<void>;
    onRenameConversation: (id: string, title: string) => Promise<void>;
    sidebarOpen: boolean;
    onSidebarClose: () => void;
    onSidebarToggle: (open: boolean) => void;
    sidebarCollapsed: boolean;
    onSidebarCollapse: (collapsed: boolean) => void;
    conversationsLoading: boolean;
    conversationLoading: boolean;
    hasLoadedConversations: boolean;

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
    selectedCharts: SelectedCharts;
    onSelectChart: (type?: 'bazi' | 'ziwei') => void;
    onClearChart: (type: 'bazi' | 'ziwei') => void;
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
    dreamMode: boolean;
    onDreamModeChange: (mode: boolean) => void;
    dreamContext?: { baziChartName?: string; dailyFortune?: string };
    dreamContextLoading: boolean;
    knowledgeBaseEnabled: boolean;
    aiPersonalizationEnabled: boolean;

    // Credit lock
    isPaymentPaused: boolean;
    isCreditLocked: boolean;

    // Modals (rendered by parent)
    children?: ReactNode;
}

export function ChatLayout(props: ChatLayoutProps) {
    const {
        conversations, activeConversationId, pendingSidebarTitle, generatingTitleConversationIds,
        onSelectConversation, onNewChat, onDeleteConversation, onRenameConversation,
        sidebarOpen, onSidebarClose, onSidebarToggle, sidebarCollapsed, onSidebarCollapse,
        conversationsLoading, conversationLoading, hasLoadedConversations,
        messages, isLoading, isSendingToList,
        messagesEndRef, messageScrollContainerRef, onMessageListScroll,
        onEditMessage, onRegenerateResponse, onSwitchVersion, onArchiveMessage,
        onSend, onStop,
        inputValue, onInputChange, disabled,
        selectedCharts, onSelectChart, onClearChart,
        selectedModel, onModelChange, reasoningEnabled, onReasoningChange,
        userId, membershipType, attachmentState, onAttachmentChange,
        mentions, onMentionsChange, promptKnowledgeBases,
        dreamMode, onDreamModeChange, dreamContext, dreamContextLoading,
        knowledgeBaseEnabled, aiPersonalizationEnabled,
        isPaymentPaused, isCreditLocked,
        children,
    } = props;

    const composerProps = {
        inputValue, isLoading, isSendingToList,
        onInputChange, onSend, onStop, disabled,
        selectedCharts, onSelectChart, onClearChart,
        selectedModel, onModelChange, reasoningEnabled, onReasoningChange,
        userId, membershipType, attachmentState, onAttachmentChange,
        mentions, onMentionsChange, promptKnowledgeBases,
        contextMessages: messages,
        dreamMode, onDreamModeChange, dreamContext, dreamContextLoading,
        knowledgeBaseEnabled,
    };

    return (
        <div className="flex h-[calc(100vh-var(--mobile-header-height)-5rem)] lg:h-screen">
            <ConversationSidebar
                conversations={conversations}
                activeId={activeConversationId || undefined}
                pendingTitle={pendingSidebarTitle}
                generatingTitleConversationIds={generatingTitleConversationIds}
                onSelect={onSelectConversation}
                onNew={onNewChat}
                onDelete={onDeleteConversation}
                onRename={onRenameConversation}
                isOpen={sidebarOpen}
                onClose={onSidebarClose}
                onToggle={onSidebarToggle}
                isCollapsed={sidebarCollapsed}
                onCollapse={onSidebarCollapse}
                isLoading={conversationsLoading}
                hasLoaded={hasLoadedConversations}
            />

            <div className="flex-1 flex flex-col min-w-0 relative">
                <ChatHeader
                    sidebarCollapsed={sidebarCollapsed}
                    membershipType={membershipType}
                    knowledgeBaseEnabled={knowledgeBaseEnabled}
                    aiPersonalizationEnabled={aiPersonalizationEnabled}
                />

                {conversationLoading ? (
                    <SoundWaveLoader variant="block" text="加载中..." />
                ) : messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
                        <p className="text-xl text-foreground-secondary mb-8 animate-fade-in-up">今天运势如何？</p>
                        {isCreditLocked && (
                            <CreditLockBanner isPaymentPaused={isPaymentPaused} />
                        )}
                        <div className="w-full max-w-3xl">
                            <ChatComposer {...composerProps} hideDisclaimer />
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.length > 20 ? (
                            <div className="flex-1 px-4 py-4 relative">
                                <VirtualizedChatMessageList
                                    messages={messages} isLoading={isLoading || isSendingToList}
                                    onEditMessage={onEditMessage} onRegenerateResponse={onRegenerateResponse}
                                    onSwitchVersion={onSwitchVersion}
                                    onArchiveMessage={activeConversationId ? onArchiveMessage : undefined}
                                    disabled={isCreditLocked}
                                />
                            </div>
                        ) : (
                            <div ref={messageScrollContainerRef} onScroll={onMessageListScroll} className="flex-1 overflow-y-auto px-4 py-4 relative">
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
                            <CreditLockBanner isPaymentPaused={isPaymentPaused} inline />
                        )}
                        <ChatComposer {...composerProps} />
                    </>
                )}
            </div>

            {children}
        </div>
    );
}

function CreditLockBanner({ isPaymentPaused, inline }: { isPaymentPaused: boolean; inline?: boolean }) {
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
                {isPaymentPaused ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-lg text-sm cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5" />
                        支付暂停
                    </div>
                ) : (
                    <Link href="/user/upgrade" className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 transition-colors">
                        <Sparkles className="w-3.5 h-3.5" />
                        立即充值
                    </Link>
                )}
            </div>
        </div>
    );
}
