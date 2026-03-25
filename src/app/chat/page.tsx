/**
 * AI 对话页面 — 薄编排层
 *
 * 'use client' 标记说明：
 * - 页面包含实时对话交互，需要在客户端运行
 */
'use client';

import { useEffect } from 'react';
import { BookOpenText, MessageCircleHeart } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { usePaymentPause } from '@/lib/hooks/usePaymentPause';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { useHeaderMenu } from '@/components/layout/HeaderMenuContext';
import { useChatBootstrap } from '@/lib/chat/use-chat-bootstrap';
import { useChatState } from '@/lib/chat/use-chat-state';
import { useChatMessaging } from '@/lib/chat/use-chat-messaging';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import { CreditsModal } from '@/components/ui/CreditsModal';

export default function ChatPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const { setMenuItems, clearMenuItems } = useHeaderMenu();
    const { isPaused: isPaymentPaused } = usePaymentPause();
    const { isFeatureEnabled } = useFeatureToggles();
    const { user, loading: sessionLoading } = useSessionSafe();
    const knowledgeBaseEnabled = isFeatureEnabled('knowledge-base');
    const aiPersonalizationEnabled = isFeatureEnabled('ai-personalization');

    const {
        userId, credits, membership, promptKnowledgeBases,
        bootstrapLoading, refreshBootstrap, markCreditsExhausted: markBootstrapCreditsExhausted,
    } = useChatBootstrap({ user, sessionLoading, knowledgeBaseEnabled });

    const state = useChatState({ userId, sessionLoading, bootstrapLoading, router, searchParams });

    const messaging = useChatMessaging({
        state, userId, user, membership, credits,
        refreshBootstrap, markBootstrapCreditsExhausted,
        showToast, router, searchParams,
    });

    // Mobile header menu items
    useEffect(() => {
        const menuItems = [];
        if (aiPersonalizationEnabled) {
            menuItems.push({
                id: 'ai-settings', label: '个性化',
                icon: <MessageCircleHeart className="w-4 h-4" />,
                onClick: () => router.push('/user/settings/ai'),
            });
        }
        if (membership?.type !== 'free' && knowledgeBaseEnabled) {
            menuItems.push({
                id: 'knowledge-base', label: '知识库',
                icon: <BookOpenText className="w-4 h-4" />,
                onClick: () => router.push('/user/knowledge-base'),
            });
        }
        setMenuItems(menuItems);
        return () => clearMenuItems();
    }, [aiPersonalizationEnabled, clearMenuItems, knowledgeBaseEnabled, membership?.type, router, setMenuItems]);

    const isUnlimited = membership ? membership.type !== 'free' && membership.isActive : false;
    const isCreditLocked = !isUnlimited && credits === 0;

    return (
        <>
            <ChatLayout
                conversations={state.conversations}
                activeConversationId={state.activeConversationId}
                pendingSidebarTitle={state.pendingSidebarTitle}
                generatingTitleConversationIds={state.titleGeneratingConversationIds}
                onSelectConversation={state.handleSelectConversation}
                onNewChat={state.handleNewChat}
                onDeleteConversation={state.handleDeleteConversation}
                onRenameConversation={state.handleRenameConversation}
                sidebarOpen={state.sidebarOpen}
                onSidebarClose={() => state.setSidebarOpen(false)}
                onSidebarToggle={state.setSidebarOpen}
                sidebarCollapsed={state.sidebarCollapsed}
                onSidebarCollapse={state.setSidebarCollapsed}
                conversationsLoading={state.conversationsLoading}
                conversationLoading={state.conversationLoading}
                hasLoadedConversations={state.hasLoadedConversations}
                messages={state.messages}
                isLoading={state.isLoading}
                isSendingToList={state.isSendingToList}
                messagesEndRef={state.messagesEndRef}
                messageScrollContainerRef={state.messageScrollContainerRef}
                onMessageListScroll={messaging.handleMessageListScroll}
                onEditMessage={messaging.handleEditMessage}
                onRegenerateResponse={messaging.handleRegenerateResponse}
                onSwitchVersion={messaging.handleSwitchVersion}
                onArchiveMessage={state.activeConversationId && knowledgeBaseEnabled ? messaging.handleArchiveMessage : undefined}
                onSend={messaging.handleSend}
                onStop={messaging.handleStop}
                inputValue={state.inputValue}
                onInputChange={state.setInputValue}
                disabled={isCreditLocked}
                chatMode={state.chatMode}
                onChatModeChange={state.setChatMode}
                selectedModel={state.selectedModel}
                onModelChange={state.setSelectedModel}
                reasoningEnabled={state.reasoningEnabled}
                onReasoningChange={state.setReasoningEnabled}
                userId={userId}
                membershipType={membership?.type || 'free'}
                attachmentState={state.attachmentState}
                onAttachmentChange={state.setAttachmentState}
                mentions={state.mentions}
                onMentionsChange={state.setMentions}
                promptKnowledgeBases={promptKnowledgeBases}
                dreamContext={state.dreamContext}
                dreamContextLoading={state.dreamContextLoading}
                knowledgeBaseEnabled={knowledgeBaseEnabled}
                aiPersonalizationEnabled={aiPersonalizationEnabled}
                isPaymentPaused={isPaymentPaused}
                isCreditLocked={isCreditLocked}
            >
                {state.kbTargetMessage && state.activeConversationId && isFeatureEnabled('knowledge-base') && (
                    <AddToKnowledgeBaseModal
                        open={state.kbModalOpen}
                        onClose={messaging.closeKbModal}
                        sourceTitle={state.kbTargetMessage.content.slice(0, 40) || '对话回复'}
                        sourceType="chat_message"
                        sourceId={state.kbTargetMessage.id}
                        sourceMeta={{ conversationId: state.activeConversationId }}
                    />
                )}
            </ChatLayout>

            <CreditsModal
                isOpen={state.showCreditsModal}
                onClose={() => state.setShowCreditsModal(false)}
            />
        </>
    );
}
