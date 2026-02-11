import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const rootDockerfilePath = resolve(process.cwd(), 'Dockerfile');
const composePath = resolve(process.cwd(), 'docker-compose.yml');
const webComposePath = resolve(process.cwd(), 'docker-compose.web.yml');

test('web Dockerfile should not use SUPABASE_SERVICE_ROLE_KEY build arg', async () => {
  const source = await readFile(rootDockerfilePath, 'utf-8');

  assert.ok(
    !source.includes('ARG SUPABASE_SERVICE_ROLE_KEY'),
    'Dockerfile must not define SUPABASE_SERVICE_ROLE_KEY as build arg'
  );
  assert.ok(
    !source.includes('SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"'),
    'Dockerfile must not pass service role key during build'
  );
});

test('docker compose web build args should exclude service role key', async () => {
  const source = await readFile(composePath, 'utf-8');
  const webSource = await readFile(webComposePath, 'utf-8');
  const webBuildBlock = source.match(/web:\s*\n[\s\S]*?build:\s*\n[\s\S]*?image:/)?.[0] || '';
  const webOnlyBuildBlock = webSource.match(/web:\s*\n[\s\S]*?build:\s*\n[\s\S]*?image:/)?.[0] || '';

  assert.ok(
    !webBuildBlock.includes('SUPABASE_SERVICE_ROLE_KEY:'),
    'docker-compose.yml web build args should not include service role key'
  );
  assert.ok(
    !webOnlyBuildBlock.includes('SUPABASE_SERVICE_ROLE_KEY:'),
    'docker-compose.web.yml build args should not include service role key'
  );
});
