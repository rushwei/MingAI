import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getBackNavigationState,
    getInitialMentionNavigationState,
} from '../components/chat/mention/mention-navigation';

test('mention popover defaults to data subcategory when knowledge base is unavailable', () => {
    assert.deepEqual(
        getInitialMentionNavigationState({ knowledgeBaseLocked: true }),
        { level: 'subcategory', selectedCategory: 'data', activeIndex: 0 }
    );
});

test('mention popover falls back to data when a locked knowledge-base default is requested', () => {
    assert.deepEqual(
        getInitialMentionNavigationState({ defaultCategory: 'knowledge', knowledgeBaseLocked: true }),
        { level: 'subcategory', selectedCategory: 'data', activeIndex: 0 }
    );
});

test('mention popover closes instead of returning to category when leaving data root and knowledge base is unavailable', () => {
    assert.equal(
        getBackNavigationState(
            { level: 'subcategory', selectedCategory: 'data', activeIndex: 2 },
            { knowledgeBaseLocked: true }
        ),
        null
    );
});

test('mention popover still returns to category when knowledge base is available', () => {
    assert.deepEqual(
        getBackNavigationState(
            { level: 'subcategory', selectedCategory: 'data', activeIndex: 1 },
            { knowledgeBaseLocked: false }
        ),
        { level: 'category', activeIndex: 0 }
    );
});
