import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(filePath: string): string {
    return fs.readFileSync(path.join(root, filePath), 'utf8');
}

test('chat page integrates with stream manager and query-based conversation selection', () => {
    const content = read('src/app/chat/page.tsx');

    assert.equal(content.includes('useSearchParams'), true);
    assert.equal(content.includes('chatStreamManager'), true);
    assert.equal(content.includes("searchParams.get('id')"), true);
});

test('chat page guards conversation switching and task events with refs to avoid stale flashes', () => {
    const content = read('src/app/chat/page.tsx');

    assert.equal(content.includes('activeConversationIdRef'), true);
    assert.equal(content.includes('hasLoadedConversationsRef'), true);
    assert.equal(content.includes('conversationSelectRequestRef'), true);
    assert.equal(content.includes('requestId !== conversationSelectRequestRef.current'), true);
    assert.equal(content.includes('currentActiveConversationId = activeConversationIdRef.current'), true);
});

test('chat page normalizes insufficient credits handling across send/edit/regenerate paths', () => {
    const content = read('src/app/chat/page.tsx');

    assert.equal(content.includes('markCreditsExhausted'), true);
    assert.equal(content.includes('INSUFFICIENT_CREDITS'), true);
    assert.equal(content.includes('markBootstrapCreditsExhausted'), true);
});

test('chat page scopes streaming state and local stream updates to active conversation', () => {
    const content = read('src/app/chat/page.tsx');

    assert.equal(content.includes('streamingConversationIds'), true);
    assert.equal(content.includes('activeConversationIdRef.current'), true);
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
    const content = read('src/app/chat/page.tsx');

    assert.equal(content.includes('baseMessages: updatedPreviousMessages'), true);
    assert.equal(content.includes('assistantMessage: initialAssistantMessage'), true);
    assert.equal(content.includes('requestBody: {'), true);
});

test('chat page handles auth-required stream failures with explicit login toast', () => {
    const content = read('src/app/chat/page.tsx');

    assert.equal(content.includes("event.errorMessage?.includes('请先登录')"), true);
    assert.equal(content.includes("showToast('info', event.errorMessage"), true);
});

test('conversation sidebar renders pending title inside chat group rather than standalone block', () => {
    const content = read('src/components/chat/ConversationSidebar.tsx');

    assert.equal(content.includes("showPendingInGroup = type === 'chat' && !!pendingTitle"), true);
    assert.equal(content.includes('{pendingTitle && ('), false);
});

test('conversation sidebar only renders title-loading spinner slot when the item is actually generating', () => {
    const content = read('src/components/chat/ConversationSidebar.tsx');

    assert.equal(content.includes('{isGeneratingTitle ? ('), true);
    assert.equal(content.includes('{isGeneratingTitle && <Loader2'), false);
});
