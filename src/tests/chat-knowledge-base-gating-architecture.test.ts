import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const chatComposerPath = resolve(process.cwd(), 'src/components/chat/ChatComposer.tsx');
const chatRoutePath = resolve(process.cwd(), 'src/app/api/chat/route.ts');
const previewRoutePath = resolve(process.cwd(), 'src/app/api/chat/preview/route.ts');
const promptContextPath = resolve(process.cwd(), 'src/lib/server/chat/prompt-context.ts');
const aiSettingsPagePath = resolve(process.cwd(), 'src/app/user/ai-settings/page.tsx');
const bootstrapPath = resolve(process.cwd(), 'src/lib/server/chat/bootstrap.ts');

test('chat knowledge-base UI and metadata should stay gated behind paid membership', async () => {
  const [chatComposerSource, chatRouteSource, previewRouteSource, promptContextSource, aiSettingsPageSource, bootstrapSource] = await Promise.all([
    readFile(chatComposerPath, 'utf-8'),
    readFile(chatRoutePath, 'utf-8'),
    readFile(previewRoutePath, 'utf-8'),
    readFile(promptContextPath, 'utf-8'),
    readFile(aiSettingsPagePath, 'utf-8'),
    readFile(bootstrapPath, 'utf-8'),
  ]);

  assert.match(
    chatComposerSource,
    /\(\(canUseKnowledgeBase && promptKnowledgeBases\.length > 0\) \|\| dreamMode\)/u,
    'chat composer should only render prompt knowledge-base chips when membership allows it',
  );
  assert.match(
    chatRouteSource,
    /prepareChatRequest\(/u,
    'chat route should delegate knowledge-base metadata assembly to shared server helpers instead of inlining it',
  );
  assert.match(
    previewRouteSource,
    /const canUsePromptKnowledgeBase = knowledgeBaseFeatureEnabled && membershipType !== 'free';[\s\S]*promptKnowledgeBases:\s*canUsePromptKnowledgeBase[\s\S]*\?/u,
    'preview route should not expose prompt knowledge bases when the feature is disabled or membership is free',
  );
  assert.match(
    promptContextSource,
    /knowledgeBaseFeatureEnabled[\s\S]*kbSearchEnabled:\s*knowledgeBaseFeatureEnabled && membershipType !== 'free' && (?:effectiveUserSettings|userSettings)\.promptKbIds\.length > 0/u,
    'server prompt context should keep feature toggle and paid-only knowledge-base metadata aligned with the route contract even after settings overrides are applied',
  );
  assert.match(
    bootstrapSource,
    /knowledgeBaseFeatureEnabled[\s\S]*membership\?\.type === 'free' \|\| !knowledgeBaseFeatureEnabled \|\| promptKbIds\.length === 0/u,
    'chat bootstrap should not expose prompt knowledge bases when the feature is disabled',
  );
  assert.match(
    aiSettingsPageSource,
    /useFeatureToggles/u,
    'ai settings page should read feature toggles before rendering knowledge-base UI',
  );
  assert.match(
    aiSettingsPageSource,
    /knowledgeBaseFeatureEnabled[\s\S]*\{knowledgeBaseFeatureEnabled && \(/u,
    'ai settings page should hide knowledge-base card and preview block when the feature is disabled',
  );
});
