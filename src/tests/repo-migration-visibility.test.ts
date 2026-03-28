import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test('schema dump should keep only the simplified announcements table', () => {
    const snapshot = readFileSync(join(process.cwd(), 'supabase/tabel_export_from_supabase.sql'), 'utf8');

    assert.notEqual(snapshot.indexOf('CREATE TABLE public.announcements'), -1);
    assert.equal(snapshot.includes('CREATE TABLE public.announcement_user_states'), false);
    assert.match(snapshot, /CREATE TABLE public\.announcements \(\s+id uuid NOT NULL DEFAULT gen_random_uuid\(\),\s+content text NOT NULL,\s+published_at timestamp with time zone NOT NULL DEFAULT now\(\)/u);
});

test('repo should include migration simplifying announcements for the unified center', () => {
    const migrationPath = join(
        process.cwd(),
        'supabase/migrations/20260328_simplify_announcements_for_unified_center.sql',
    );

    assert.equal(existsSync(migrationPath), true);
    const migration = readFileSync(migrationPath, 'utf8');

    assert.match(migration, /DROP TABLE IF EXISTS public\.announcement_user_states/u);
    assert.match(migration, /CREATE TABLE public\.announcements/u);
    assert.match(migration, /content text NOT NULL/u);
    assert.match(migration, /published_at timestamp with time zone NOT NULL DEFAULT now\(\)/u);
});

test('repo should include migration fixing announcements admin RLS policies', () => {
    const migrationPath = join(
        process.cwd(),
        'supabase/migrations/20260328_fix_announcements_admin_rls.sql',
    );

    assert.equal(existsSync(migrationPath), true);
    const migration = readFileSync(migrationPath, 'utf8');

    assert.match(migration, /CREATE POLICY announcements_admin_select/u);
    assert.match(migration, /CREATE POLICY announcements_admin_insert/u);
    assert.match(migration, /CREATE POLICY announcements_admin_update/u);
    assert.match(migration, /CREATE POLICY announcements_admin_delete/u);
});
