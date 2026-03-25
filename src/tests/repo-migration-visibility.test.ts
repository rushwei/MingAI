import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('schema dump should define announcements before announcement_user_states', () => {
    const snapshot = readFileSync(join(process.cwd(), 'supabase/tabel_export_from_supabase.sql'), 'utf8');
    const announcementsIndex = snapshot.indexOf('CREATE TABLE public.announcements');
    const statesIndex = snapshot.indexOf('CREATE TABLE public.announcement_user_states');

    assert.notEqual(announcementsIndex, -1);
    assert.notEqual(statesIndex, -1);
    assert.ok(announcementsIndex < statesIndex);
});

test('repo should include migration adding user_settings.visualization_settings', () => {
    const migration = readFileSync(
        join(process.cwd(), 'supabase/migrations/20260323_add_visualization_settings_to_user_settings.sql'),
        'utf8',
    );

    assert.match(migration, /ALTER TABLE public\.user_settings/u);
    assert.match(migration, /ADD COLUMN IF NOT EXISTS visualization_settings/u);
});
