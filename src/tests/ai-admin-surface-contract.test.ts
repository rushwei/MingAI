import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const adminPagePath = resolve(process.cwd(), 'src/app/admin/ai-services/page.tsx');
const modelPanelPath = resolve(process.cwd(), 'src/components/admin/AIModelPanel.tsx');
const sourcePanelPath = resolve(process.cwd(), 'src/components/admin/AISourcePanel.tsx');
const gatewayPanelPath = resolve(process.cwd(), 'src/components/admin/AIGatewayPanel.tsx');
const statsPanelPath = resolve(process.cwd(), 'src/components/admin/AIStatsPanel.tsx');
const statsRoutePath = resolve(process.cwd(), 'src/app/api/admin/ai-models/stats/route.ts');
const gatewayMigrationPath = resolve(process.cwd(), 'supabase/migrations/20260318_unify_ai_gateway_sources.sql');

test('admin ai page should remove stats tab and stats panel import', async () => {
  const source = await readFile(adminPagePath, 'utf-8');

  assert.equal(
    source.includes('AIStatsPanel'),
    false,
    'admin ai page should no longer import stats panel'
  );
  assert.equal(
    source.includes("label: '使用统计'"),
    false,
    'admin ai page should no longer render stats tab'
  );
  assert.equal(
    source.includes('AIGatewayPanel'),
    true,
    'admin ai page should expose dedicated gateway management panel'
  );
  assert.equal(
    source.includes('AISourcePanel'),
    false,
    'admin ai page should no longer import dedicated source panel'
  );
  assert.equal(
    source.includes("label: '来源管理'"),
    false,
    'admin ai page should merge source management into model management'
  );
});

test('admin model panel should provide create-model flow through admin ai models POST api', async () => {
  const source = await readFile(modelPanelPath, 'utf-8');

  assert.equal(
    source.includes("fetch('/api/admin/ai-models'"),
    true,
    'model panel should support creating models via admin models POST api'
  );
  assert.equal(
    source.includes('新增模型') || source.includes('创建模型'),
    true,
    'model panel should expose a visible create-model entry'
  );
  assert.equal(
    source.includes('添加供应商') || source.includes('自定义供应商'),
    true,
    'model panel should support preset vendors plus custom vendor entry'
  );
  assert.equal(
    source.includes('高级设置'),
    true,
    'model panel should group advanced parameters explicitly'
  );
  assert.equal(
    source.includes('自定义参数'),
    true,
    'model panel should expose custom parameter editing in advanced settings'
  );
  assert.equal(
    source.includes("method: 'PATCH'"),
    true,
    'model panel should support editing existing managed sources via PATCH'
  );
  assert.equal(
    source.includes('/api/admin/ai-models/${modelId}/sources')
      || source.includes('/api/admin/ai-models/${modelId}/sources/${sourceId}'),
    true,
    'model panel should manage bindings through source APIs'
  );
  assert.equal(
    source.includes('来源与故障转移') && (source.includes('添加备用来源') || source.includes('添加来源')),
    true,
    'model panel should expose merged source and failover management'
  );
  assert.equal(
    (source.includes('保存基础信息') || source.includes('保存模型设置')) && source.includes('删除模型'),
    true,
    'model panel should expose editable model base fields and model deletion action'
  );
});

test('admin model panel edit draft should cover full model settings instead of only base fields', async () => {
  const source = await readFile(modelPanelPath, 'utf-8');

  for (const field of [
    'usageType: model.usageType',
    'requiredTier: model.requiredTier',
    'routingMode: model.routingMode',
    'sortOrder: model.sortOrder',
    'supportsReasoning: model.supportsReasoning',
    'reasoningRequiredTier: model.reasoningRequiredTier',
    'isReasoningDefault: model.isReasoningDefault',
    'supportsVision: model.supportsVision',
    'defaultTemperature: model.defaultTemperature',
    'defaultTopP: model.defaultTopP',
    'defaultPresencePenalty: model.defaultPresencePenalty',
    'defaultFrequencyPenalty: model.defaultFrequencyPenalty',
    'defaultMaxTokens: model.defaultMaxTokens',
    'defaultReasoningEffort: model.defaultReasoningEffort',
    'reasoningEffortFormat: model.reasoningEffortFormat',
  ]) {
    assert.equal(
      source.includes(field),
      true,
      `edit draft should retain ${field} so existing models can fully edit supported settings`
    );
  }

  for (const field of [
    'usageType: draft.usageType',
    'requiredTier: draft.requiredTier',
    'routingMode: draft.routingMode',
    'sortOrder: draft.sortOrder',
    'supportsReasoning: draft.supportsReasoning',
    'reasoningRequiredTier: draft.reasoningRequiredTier',
    'draft.isReasoningDefault',
    'supportsVision: draft.supportsVision',
    'defaultTemperature: draft.defaultTemperature',
    'defaultTopP: draft.defaultTopP',
    'defaultPresencePenalty: draft.defaultPresencePenalty',
    'defaultFrequencyPenalty: draft.defaultFrequencyPenalty',
    'defaultMaxTokens: draft.defaultMaxTokens',
    'draft.defaultReasoningEffort',
    'draft.reasoningEffortFormat',
  ]) {
    assert.equal(
      source.includes(field),
      true,
      `saving edited models should submit ${field} instead of leaving it create-only`
    );
  }

  assert.equal(
    source.includes('Presence Penalty'),
    true,
    'edit panel should expose presence penalty controls'
  );
  assert.equal(
    source.includes('Frequency Penalty'),
    true,
    'edit panel should expose frequency penalty controls'
  );
  assert.equal(
    source.includes('保存模型设置'),
    true,
    'edit panel should provide a single save entry for the full model draft'
  );
});

test('admin gateway panel should provide managed gateway edit flow through gateway PATCH api', async () => {
  const source = await readFile(gatewayPanelPath, 'utf-8');

  assert.equal(
    source.includes('/api/admin/ai-gateways'),
    true,
    'gateway panel should load managed gateways through dedicated api'
  );
  assert.equal(
    source.includes("method: 'PATCH'"),
    true,
    'gateway panel should update managed gateways through PATCH'
  );
});

test('stats panel and stats route files should be removed', async () => {
  await assert.rejects(
    readFile(sourcePanelPath, 'utf-8'),
    /ENOENT/,
    'source panel file should be deleted after merging into model panel'
  );
  await assert.rejects(
    readFile(statsPanelPath, 'utf-8'),
    /ENOENT/,
    'stats panel file should be deleted'
  );
  await assert.rejects(
    readFile(statsRoutePath, 'utf-8'),
    /ENOENT/,
    'stats route file should be deleted'
  );
});

test('gateway redesign migration should reset legacy ai config artifacts', async () => {
  const source = await readFile(gatewayMigrationPath, 'utf-8');

  assert.equal(
    source.includes('DROP TABLE IF EXISTS public.ai_model_sources'),
    true,
    'migration should drop legacy ai_model_sources table'
  );
  assert.equal(
    source.includes('DROP FUNCTION IF EXISTS public.record_ai_model_call'),
    true,
    'migration should drop ai stats rpc'
  );
  assert.equal(
    source.includes('DROP TABLE IF EXISTS public.ai_model_stats'),
    true,
    'migration should drop ai stats table'
  );
});
