import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldRequestChatPreview } from '../lib/chat-preview';

test('shouldRequestChatPreview blocks preview when user is missing', () => {
    assert.equal(
        shouldRequestChatPreview({ userId: null, isLoading: false, isSendingToList: false }),
        false
    );
});

test('shouldRequestChatPreview blocks preview during streaming', () => {
    assert.equal(
        shouldRequestChatPreview({ userId: 'u1', isLoading: true, isSendingToList: false }),
        false
    );
});

test('shouldRequestChatPreview blocks preview before message enters list', () => {
    assert.equal(
        shouldRequestChatPreview({ userId: 'u1', isLoading: false, isSendingToList: true }),
        false
    );
});

test('shouldRequestChatPreview allows preview when state is stable', () => {
    assert.equal(
        shouldRequestChatPreview({ userId: 'u1', isLoading: false, isSendingToList: false }),
        true
    );
});
