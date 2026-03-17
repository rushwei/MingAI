import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(filePath: string): string {
    return fs.readFileSync(path.join(root, filePath), 'utf8');
}

/**
 * chat/page.tsx 的核心逻辑已拆分到以下 hooks：
 * - src/lib/chat/use-chat-state.ts — 对话管理状态
 * - src/lib/chat/use-chat-messaging.ts — 消息发送与流式响应
 * - src/lib/chat/use-chat-bootstrap.ts — 启动数据加载
 *
 * 以下测试按拆分后的实际位置验证关键契约。
 */

test('chat page integrates with stream manager and query-based conversation selection', () => {
    const pageContent = read('src/app/chat/page.tsx');
    const stateContent = read('src/lib/chat/use-chat-state.ts');

    assert.equal(pageContent.includes('useSearchParams'), true);
    assert.equal(stateContent.includes('chatStreamManager'), true);
    assert.equal(stateContent.includes("searchParams.get('id')") || read('src/lib/chat/use-chat-messaging.ts').includes("searchParams.get('id')"), true);
});

test('chat page guards conversation switching and task events with refs to avoid stale flashes', () => {
    const stateContent = read('src/lib/chat/use-chat-state.ts');

    assert.equal(stateContent.includes('activeConversationIdRef'), true);
    assert.equal(stateContent.includes('hasLoadedConversationsRef'), true);
    assert.equal(stateContent.includes('conversationSelectRequestRef'), true);
    assert.equal(stateContent.includes('requestId !== conversationSelectRequestRef.current'), true);
    assert.equal(
        stateContent.includes('currentActiveConversationId = activeConversationIdRef.current') ||
        read('src/lib/chat/use-chat-messaging.ts').includes('currentActiveConversationId = activeConversationIdRef.current'),
        true,
    );
});

test('chat page normalizes insufficient credits handling across send/edit/regenerate paths', () => {
    const messagingContent = read('src/lib/chat/use-chat-messaging.ts');
    const pageContent = read('src/app/chat/page.tsx');

    assert.equal(
        messagingContent.includes('markCreditsExhausted') || pageContent.includes('markCreditsExhausted'),
        true,
    );
    assert.equal(messagingContent.includes('INSUFFICIENT_CREDITS'), true);
    assert.equal(
        messagingContent.includes('markBootstrapCreditsExhausted') || pageContent.includes('markBootstrapCreditsExhausted'),
        true,
    );
});

test('chat page scopes streaming state and local stream updates to active conversation', () => {
    const stateContent = read('src/lib/chat/use-chat-state.ts');
    const messagingContent = read('src/lib/chat/use-chat-messaging.ts');

    assert.equal(
        stateContent.includes('streamingConversationIds') || messagingContent.includes('streamingConversationIds'),
        true,
    );
    assert.equal(
        stateContent.includes('activeConversationIdRef.current') || messagingContent.includes('activeConversationIdRef.current'),
        true,
    );
});

test('chat task toast bridge is mounted in ClientProviders', () => {
    const providerContent = read('src/components/providers/ClientProviders.tsx');
    assert.equal(providerContent.includes('ChatTaskToastBridge'), true);

    const bridgePath = path.join(root, 'src/components/providers/ChatTaskToastBridge.tsx');
    assert.equal(fs.existsSync(bridgePath), true);

    const bridgeContent = fs.readFileSync(bridgePath, 'utf8');
    assert.equal(bridgeContent.includes('/chat?id='), true);
    assert.equal(bridgeContent.includes('showToast'), true);
});

test('chat task toast bridge keeps stable subscription and reads route state from refs', () => {
    const bridgeContent = read('src/components/providers/ChatTaskToastBridge.tsx');

    assert.equal(bridgeContent.includes('window.location.pathname'), true);
    assert.equal(bridgeContent.includes('window.location.search'), true);
    assert.equal(bridgeContent.includes('new URLSearchParams(currentSearch).get(\'id\')'), true);
    assert.equal(bridgeContent.includes('chatStreamManager.subscribe'), true);
    assert.equal(bridgeContent.includes('task_failed') && bridgeContent.includes('task_stopped'), true);
    assert.equal(bridgeContent.includes('showToastRef.current(\'chat\', completionMessage);'), true);
});

test('chat page uses stream manager for regenerate flow so completion can be observed globally', () => {
    const messagingContent = read('src/lib/chat/use-chat-messaging.ts');

    assert.equal(messagingContent.includes('baseMessages: updatedPreviousMessages'), true);
    assert.equal(messagingContent.includes('assistantMessage: initialAssistantMessage'), true);
    assert.equal(messagingContent.includes('requestBody: {'), true);
});

test('chat page handles auth-required stream failures with explicit login toast', () => {
    const messagingContent = read('src/lib/chat/use-chat-messaging.ts');

    assert.equal(messagingContent.includes("event.errorMessage?.includes('请先登录')"), true);
    assert.equal(messagingContent.includes("showToast('info', event.errorMessage"), true);
});

test('conversation sidebar renders pending title inside chat group rather than standalone block', () => {
    const content = read('src/components/chat/ConversationSidebar.tsx');

    assert.equal(content.includes("showPendingInGroup = type === 'chat' && !!pendingTitle"), true);
    assert.equal(content.includes('{pendingTitle && ('), false);
});

test('conversation sidebar only renders title-loading spinner slot when the item is actually generating', () => {
    const itemContent = read('src/components/chat/sidebar/ConversationItem.tsx');

    assert.equal(itemContent.includes('{isGeneratingTitle ? ('), true);
    assert.equal(itemContent.includes('{isGeneratingTitle && <Loader2'), false);
});
