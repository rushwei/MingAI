import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Mention } from '../types';
import { buildMentionHighlightedParts } from '../components/chat/mentionHighlight';

test('buildMentionHighlightedParts tags mention tokens with the correct className', () => {
    const mentions: Mention[] = [
        { type: 'bazi_chart', id: 'b1', name: '张三', preview: 'p' }
    ];

    const parts = buildMentionHighlightedParts('看 @张三', mentions);
    const mentionPart = parts.find((p): p is Extract<typeof p, { kind: 'mention' }> => p.kind === 'mention' && p.value === '@张三');
    assert.ok(mentionPart && mentionPart.className.includes('text-orange-500'));
});

test('buildMentionHighlightedParts keeps raw text (React escapes on render)', () => {
    const mentions: Mention[] = [
        { type: 'bazi_chart', id: 'b1', name: '张三', preview: 'p' }
    ];

    const parts = buildMentionHighlightedParts('x <script>alert(1)</script> @张三', mentions);
    assert.ok(parts.some((p) => p.kind === 'text' && p.value.includes('<script>alert(1)</script>')));
    assert.ok(parts.some((p) => p.kind === 'mention' && p.value === '@张三'));
});
