import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260318_unify_ai_gateway_sources.sql'
);

test('ai gateway redesign migration should create gateway tables and clear legacy ai config data', async () => {
  const source = await readFile(migrationPath, 'utf-8');

  assert.ok(
    source.includes('CREATE TABLE IF NOT EXISTS public.ai_gateways'),
    'migration should create ai_gateways table'
  );
  assert.ok(
    source.includes('CREATE TABLE IF NOT EXISTS public.ai_model_gateway_bindings'),
    'migration should create ai_model_gateway_bindings table'
  );
  assert.ok(
    source.includes("CHECK (gateway_key IN ('newapi', 'octopus'))"),
    'migration should constrain supported gateway keys'
  );
  assert.ok(
    source.includes("CHECK (routing_mode IN ('auto', 'newapi', 'octopus'))"),
    'migration should constrain routing_mode values'
  );
  assert.ok(
    source.includes('ADD COLUMN IF NOT EXISTS default_top_p'),
    'migration should add top_p default config column'
  );
  assert.ok(
    source.includes('ADD COLUMN IF NOT EXISTS default_presence_penalty'),
    'migration should add presence_penalty default config column'
  );
  assert.ok(
    source.includes('ADD COLUMN IF NOT EXISTS default_frequency_penalty'),
    'migration should add frequency_penalty default config column'
  );
  assert.ok(
    source.includes('ADD COLUMN IF NOT EXISTS default_reasoning_effort'),
    'migration should add reasoning effort default config column'
  );
  assert.ok(
    source.includes('ADD COLUMN IF NOT EXISTS custom_parameters'),
    'migration should add custom parameter config column'
  );
  assert.ok(
    source.includes('DELETE FROM public.ai_models'),
    'migration should clear old ai models for redesign reset'
  );
  assert.ok(
    source.includes('DROP TABLE IF EXISTS public.ai_model_sources'),
    'migration should drop legacy ai_model_sources table'
  );
  assert.ok(
    source.includes('INSERT INTO public.ai_gateways'),
    'migration should seed managed gateways'
  );
});
