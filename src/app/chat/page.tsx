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
import { BaziChartSelector } from '@/components/chat/BaziChartSelector';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { CreditsModal } from '@/components/ui/CreditsModal';
import { FeatureGate } from '@/components/layout/FeatureGate';

export default function ChatPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const { setMenuItems, clearMenuItems } = useHeaderMenu();
    const { isPaused: isPaymentPaused } = usePaymentPause();
    const { isFeatureEnabled } = useFeatureToggles();
    const { user, loading: sessionLoading } = useSessionSafe();
    const knowledgeBaseEnabled = isFeatureEnabled('knowledge-base');

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
        if (isFeatureEnabled('ai-personalization')) {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [knowledgeBaseEnabled, membership?.type]);

    const isUnlimited = membership ? membership.type !== 'free' && membership.isActive : false;
    const isCreditLocked = !isUnlimited && credits === 0;

    return (
        <FeatureGate featureId="chat">
        <LoginOverlay message="登录后即可使用 AI 对话功能">
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
                onArchiveMessage={state.activeConversationId ? messaging.handleArchiveMessage : undefined}
                onSend={messaging.handleSend}
                onStop={messaging.handleStop}
                inputValue={state.inputValue}
                onInputChange={state.setInputValue}
                disabled={isCreditLocked}
                selectedCharts={state.selectedCharts}
                onSelectChart={(type) => { state.setChartFocusType(type); state.setChartSelectorOpen(true); }}
                onClearChart={(type) => { const next = { ...state.selectedCharts }; delete next[type]; state.setSelectedCharts(next); }}
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
                dreamMode={state.dreamMode}
                onDreamModeChange={state.setDreamMode}
                dreamContext={state.dreamContext}
                dreamContextLoading={state.dreamContextLoading}
                knowledgeBaseEnabled={knowledgeBaseEnabled}
                aiPersonalizationEnabled={isFeatureEnabled('ai-personalization')}
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

            {userId && state.chartSelectorOpen && (
                <BaziChartSelector
                    isOpen={state.chartSelectorOpen}
                    onClose={() => { state.setChartSelectorOpen(false); state.setChartFocusType(undefined); }}
                    onSelect={(charts) => state.setSelectedCharts(charts)}
                    userId={userId}
                    currentSelection={state.selectedCharts}
                    focusType={state.chartFocusType}
                />
            )}

            <CreditsModal
                isOpen={state.showCreditsModal}
                onClose={() => state.setShowCreditsModal(false)}
            />
        </LoginOverlay>
        </FeatureGate>
    );
}
