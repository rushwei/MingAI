import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Mention } from '../types';
import { buildMentionToken, extractMentionTokens, mapMentionsToTokens, filterMentionsByTokens, removeMentionsByTokens } from '../lib/mention-tokens';

const baziMention: Mention = {
    type: 'bazi_chart',
    id: 'b1',
    name: '张三',
    preview: 'p'
};

const ziweiMention: Mention = {
    type: 'ziwei_chart',
    id: 'z1',
    name: '张三',
    preview: 'p'
};

test('mapMentionsToTokens assigns same-name mentions by order', () => {
    const input = `测试 ${buildMentionToken(baziMention)} 和 ${buildMentionToken(ziweiMention)}`;
    const tokens = extractMentionTokens(input, [baziMention, ziweiMention]);
    const matches = mapMentionsToTokens(tokens, [baziMention, ziweiMention]);
    assert.equal(matches.length, 2);
    assert.equal(matches[0].mention?.type, 'bazi_chart');
    assert.equal(matches[1].mention?.type, 'ziwei_chart');
});

test('filterMentionsByTokens keeps only the number of mentions in text', () => {
    const input = '看看 @张三';
    const tokens = extractMentionTokens(input, [baziMention, ziweiMention]);
    const filtered = filterMentionsByTokens([baziMention, ziweiMention], tokens);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].type, 'bazi_chart');
});

test('removeMentionsByTokens removes the correct duplicate mention', () => {
    const input = `测试 ${buildMentionToken(baziMention)} 和 ${buildMentionToken(ziweiMention)}`;
    const tokens = extractMentionTokens(input, [baziMention, ziweiMention]);
    const nextMentions = removeMentionsByTokens([baziMention, ziweiMention], tokens, [tokens[0]]);
    assert.equal(nextMentions.length, 1);
    assert.equal(nextMentions[0].type, 'ziwei_chart');
});
