import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectPath = (relativePath: string) => resolve(process.cwd(), relativePath);

const sharedFiles = [
    'src/components/knowledge-base/AddToKnowledgeBaseModal.tsx',
    'src/components/history/HistoryPageTemplate.tsx',
    'src/components/records/RecordDetail.tsx',
    'src/components/records/RecordsList.tsx',
    'src/components/chat/ChatMessageItem.tsx',
    'src/components/chat/ConversationSidebar.tsx',
];

const requestFiles = [
    'src/components/knowledge-base/AddToKnowledgeBaseModal.tsx',
    'src/components/chat/composer/useComposerState.ts',
    'src/components/chat/SourceBadge.tsx',
];

const pageFiles = [
    'src/app/tarot/history/page.tsx',
    'src/app/liuyao/history/page.tsx',
    'src/app/hepan/history/page.tsx',
    'src/app/mbti/history/page.tsx',
    'src/app/tarot/result/page.tsx',
    'src/app/liuyao/result/page.tsx',
    'src/app/hepan/result/page.tsx',
    'src/app/face/result/page.tsx',
    'src/app/palm/result/page.tsx',
    'src/app/mbti/result/page.tsx',
    'src/app/qimen/result/page.tsx',
];

test('shared knowledge-base UI surfaces should use the shared feature hook', async () => {
    for (const file of sharedFiles) {
        const source = await readFile(projectPath(file), 'utf-8');
        assert.match(
            source,
            /useKnowledgeBaseFeatureEnabled/u,
            `${file} should consult the shared knowledge-base feature hook`
        );
    }
});

test('knowledge-base result/history surfaces should gate archive actions with the shared feature hook', async () => {
    for (const file of pageFiles) {
        const source = await readFile(projectPath(file), 'utf-8');
        assert.match(
            source,
            /useKnowledgeBaseFeatureEnabled|knowledgeBaseEnabled|canAddToKnowledgeBase/u,
            `${file} should gate knowledge-base actions behind the feature toggle`
        );
    }
});

test('knowledge-base request entrypoints should fail closed when the feature is disabled', async () => {
    for (const file of requestFiles) {
        const source = await readFile(projectPath(file), 'utf-8');
        assert.match(
            source,
            /knowledgeBaseEnabled|canUseKnowledgeBase|useKnowledgeBaseFeatureEnabled/u,
            `${file} should gate knowledge-base requests behind the feature toggle`
        );
    }
});
