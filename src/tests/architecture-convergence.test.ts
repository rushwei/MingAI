import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = process.cwd();

async function read(path: string) {
    return readFile(resolve(projectRoot, path), 'utf-8');
}

test('architecture convergence should remove old supabase proxy and consolidate browser auth access', async () => {
    assert.equal(
        existsSync(resolve(projectRoot, 'src/app/api/supabase/proxy/route.ts')),
        false,
        'feature-owned APIs should replace /api/supabase/proxy'
    );
    assert.equal(
        existsSync(resolve(projectRoot, 'src/lib/auth-client.ts')),
        false,
        'browser auth access should converge into a single auth module instead of auth/auth-client dual entrypoints'
    );
    assert.equal(
        existsSync(resolve(projectRoot, 'src/lib/auth.ts')),
        true,
        'unified auth module should exist after browser auth convergence'
    );
});

test('architecture convergence should eliminate stale service-role naming and data-source side-effect init', async () => {
    const [apiUtilsSource, dataSourcesSource] = await Promise.all([
        read('src/lib/api-utils.ts'),
        read('src/lib/data-sources/index.ts'),
    ]);

    assert.equal(
        apiUtilsSource.includes('getServiceRoleClient'),
        false,
        'service-role naming should be removed after the system-admin rename'
    );
    assert.equal(
        dataSourcesSource.includes('registerDataSource('),
        false,
        'data-source registry should be manifest-driven instead of side-effect registration'
    );
    assert.equal(
        existsSync(resolve(projectRoot, 'src/lib/data-sources/init.ts')),
        false,
        'data-sources init side-effect module should be removed'
    );
});

test('conversation client should no longer talk to supabase directly from the browser layer', async () => {
    const source = await read('src/lib/chat/conversation.ts');

    assert.equal(
        source.includes("from '@/lib/auth'"),
        false,
        'conversation client should use conversations HTTP API instead of importing the browser auth module'
    );
    assert.match(
        source,
        /\/api\/conversations/u,
        'conversation client should target the dedicated conversations API'
    );
});
