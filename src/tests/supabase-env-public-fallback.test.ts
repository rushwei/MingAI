import test from 'node:test';
import assert from 'node:assert/strict';
import { getSupabaseAnonKey, getSupabaseUrl } from '../lib/supabase-env';

test('supabase env helpers should fall back to NEXT_PUBLIC values when server env is absent', () => {
    const previousUrl = process.env.SUPABASE_URL;
    const previousAnonKey = process.env.SUPABASE_ANON_KEY;
    const previousPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const previousPublicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';

    try {
        assert.equal(getSupabaseUrl(), 'https://example.supabase.co');
        assert.equal(getSupabaseAnonKey(), 'public-anon-key');
    } finally {
        if (previousUrl === undefined) delete process.env.SUPABASE_URL;
        else process.env.SUPABASE_URL = previousUrl;

        if (previousAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
        else process.env.SUPABASE_ANON_KEY = previousAnonKey;

        if (previousPublicUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        else process.env.NEXT_PUBLIC_SUPABASE_URL = previousPublicUrl;

        if (previousPublicAnonKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousPublicAnonKey;
    }
});
