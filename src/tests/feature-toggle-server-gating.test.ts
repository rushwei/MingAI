import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const promptContextPath = resolve(process.cwd(), 'src/lib/server/chat/prompt-context.ts');
const dataSourceDetailRoutePath = resolve(process.cwd(), 'src/app/api/data-sources/[type]/[id]/route.ts');
const kbRoutePaths = [
  resolve(process.cwd(), 'src/app/api/knowledge-base/route.ts'),
  resolve(process.cwd(), 'src/app/api/knowledge-base/[id]/route.ts'),
  resolve(process.cwd(), 'src/app/api/knowledge-base/archive/route.ts'),
  resolve(process.cwd(), 'src/app/api/knowledge-base/search/route.ts'),
  resolve(process.cwd(), 'src/app/api/knowledge-base/ingest/route.ts'),
  resolve(process.cwd(), 'src/app/api/knowledge-base/upload/route.ts'),
];

test('knowledge-base API routes should gate on the knowledge-base feature toggle before doing work', async () => {
  const sources = await Promise.all(kbRoutePaths.map((filePath) => readFile(filePath, 'utf-8')));

  for (const source of sources) {
    assert.match(source, /ensureFeatureRouteEnabled|assertFeatureEnabled|ensureFeatureEnabled|isFeatureModuleEnabled/u);
    assert.match(source, /knowledge-base/u);
  }
});

test('data-source detail route should enforce feature-toggle gating for direct disabled type access', async () => {
  const source = await readFile(dataSourceDetailRoutePath, 'utf-8');

  assert.match(source, /getDataSourceFeatureId/u);
  assert.match(source, /ensureFeatureRouteEnabled|assertFeatureEnabled|ensureFeatureEnabled|isFeatureModuleEnabled/u);
});

test('chat prompt context should drop knowledge-base mentions before resolution when the feature is disabled', async () => {
  const source = await readFile(promptContextPath, 'utf-8');

  assert.match(source, /knowledgeBaseFeatureEnabled/u);
  assert.match(source, /filter\(.*knowledge_base/u);
});
