import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';

test('requireAdminUser returns 403 when user is not admin', async (t) => {
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;

    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    supabaseServerModule.getServiceClient = () => ({
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({ data: { is_admin: false }, error: null }),
                }),
            }),
        }),
    });

    t.after(() => {
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getServiceClient = originalGetServiceClient;
    });

    const { requireAdminUser } = await import('../lib/api-utils');
    const request = new NextRequest('http://localhost/api/admin', {
        headers: { Authorization: 'Bearer test-token' },
    });

    const result = await requireAdminUser(request);
    assert.equal('error' in result, true);
    if (!('error' in result)) return;
    assert.equal(result.error.status, 403);
});

test('requireAdminUser returns user for admin', async (t) => {
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;

    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'admin-1' } },
        error: null,
    });
    supabaseServerModule.getServiceClient = () => ({
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({ data: { is_admin: true }, error: null }),
                }),
            }),
        }),
    });

    t.after(() => {
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getServiceClient = originalGetServiceClient;
    });

    const { requireAdminUser } = await import('../lib/api-utils');
    const request = new NextRequest('http://localhost/api/admin', {
        headers: { Authorization: 'Bearer test-token' },
    });

    const result = await requireAdminUser(request);
    assert.equal('error' in result, false);
    if ('error' in result) return;
    assert.equal(result.user.id, 'admin-1');
});
