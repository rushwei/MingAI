import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';

test('createNotification uses service client for inserts', async (t) => {
    const notificationModule = require('../lib/notification-server') as any;
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalFrom = supabaseModule.supabase.from;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;

    let inserted: Record<string, unknown> | null = null;

    supabaseModule.supabase.from = () => {
        throw new Error('browser client should not be used');
    };

    supabaseServerModule.getServiceClient = () => ({
        from: (table: string) => ({
            insert: (payload: Record<string, unknown>) => {
                if (table === 'notifications') {
                    inserted = payload;
                    return { error: null };
                }
                return { error: null };
            },
        }),
    });

    t.after(() => {
        supabaseModule.supabase.from = originalFrom;
        supabaseServerModule.getServiceClient = originalGetServiceClient;
    });

    const ok = await notificationModule.createNotification(
        'user-1',
        'system',
        'Test title',
        'Test body',
        '/link'
    );

    assert.equal(ok, true);
    assert.ok(inserted);
    assert.equal((inserted as { user_id?: string } | null)?.user_id, 'user-1');
});

test('processScheduledReminders skips site notifications when notify_site is false', async (t) => {
    const notificationModule = require('../lib/notification-server') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetServiceClient = supabaseServerModule.getServiceClient;
    const originalCreateNotification = notificationModule.createNotification;

    let notified = false;
    const updates: string[] = [];
    const reminder = {
        id: 'rem-1',
        user_id: 'user-1',
        reminder_type: 'solar_term',
        content: { term_name: 'Term', meaning: 'Meaning', tips: 'Tips' },
    };

    notificationModule.createNotification = async () => {
        notified = true;
        return true;
    };

    supabaseServerModule.getServiceClient = () => ({
        from: (table: string) => {
            if (table === 'scheduled_reminders') {
                return {
                    select: () => ({
                        eq: () => ({
                            lte: () => ({
                                limit: async () => ({ data: [reminder], error: null }),
                            }),
                        }),
                    }),
                    update: () => ({
                        eq: async (_column: string, id: string) => {
                            updates.push(id);
                            return { error: null };
                        },
                    }),
                };
            }
            if (table === 'reminder_subscriptions') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: { enabled: true, notify_site: false },
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                };
            }
            return {};
        },
    });

    t.after(() => {
        notificationModule.createNotification = originalCreateNotification;
        supabaseServerModule.getServiceClient = originalGetServiceClient;
    });

    const { processScheduledReminders } = await import('../lib/reminders');
    const processed = await processScheduledReminders();

    assert.equal(processed, 0);
    assert.equal(notified, false);
    assert.deepEqual(updates, ['rem-1']);
});

test('processScheduledReminders does not mark sent when notification fails', async (t) => {
    const notificationModule = require('../lib/notification-server') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetServiceClient = supabaseServerModule.getServiceClient;
    const originalCreateNotification = notificationModule.createNotification;

    const updates: string[] = [];
    const reminder = {
        id: 'rem-2',
        user_id: 'user-1',
        reminder_type: 'fortune',
        content: { summary: 'Summary' },
    };

    notificationModule.createNotification = async () => false;

    supabaseServerModule.getServiceClient = () => ({
        from: (table: string) => {
            if (table === 'scheduled_reminders') {
                return {
                    select: () => ({
                        eq: () => ({
                            lte: () => ({
                                limit: async () => ({ data: [reminder], error: null }),
                            }),
                        }),
                    }),
                    update: () => ({
                        eq: async (_column: string, id: string) => {
                            updates.push(id);
                            return { error: null };
                        },
                    }),
                };
            }
            if (table === 'reminder_subscriptions') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: { enabled: true, notify_site: true },
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                };
            }
            if (table === 'user_settings') {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({
                                data: { notifications_enabled: true, notify_site: true },
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            return {};
        },
    });

    t.after(() => {
        notificationModule.createNotification = originalCreateNotification;
        supabaseServerModule.getServiceClient = originalGetServiceClient;
    });

    const { processScheduledReminders } = await import('../lib/reminders');
    const processed = await processScheduledReminders();

    assert.equal(processed, 0);
    assert.deepEqual(updates, []);
});
