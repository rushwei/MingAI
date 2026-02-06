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

function createScheduledReminderMock(options: {
    reminder: Record<string, unknown>;
    claimResult?: { data: { id: string } | null; error: null | { message: string } };
}) {
    const updates: Array<{ id: string; sent: boolean }> = [];

    return {
        updates,
        table: {
            select: () => ({
                eq: () => ({
                    lte: () => ({
                        limit: async () => ({ data: [options.reminder], error: null }),
                    }),
                }),
            }),
            update: (payload: { sent?: boolean }) => ({
                eq: (_column: string, id: string) => ({
                    eq: () => {
                        if (typeof payload.sent === 'boolean') {
                            updates.push({ id, sent: payload.sent });
                        }

                        if (payload.sent === true) {
                            return {
                                select: () => ({
                                    maybeSingle: async () =>
                                        options.claimResult ?? { data: { id }, error: null },
                                }),
                            };
                        }

                        return Promise.resolve({ error: null });
                    },
                }),
            }),
        },
    };
}

test('processScheduledReminders claims reminder before skip when notify_site is false', async (t) => {
    const notificationModule = require('../lib/notification-server') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetServiceClient = supabaseServerModule.getServiceClient;
    const originalCreateNotification = notificationModule.createNotification;

    let notified = false;
    const reminder = {
        id: 'rem-1',
        user_id: 'user-1',
        reminder_type: 'solar_term',
        content: { term_name: 'Term', meaning: 'Meaning', tips: 'Tips' },
    };
    const scheduledMock = createScheduledReminderMock({ reminder });

    notificationModule.createNotification = async () => {
        notified = true;
        return true;
    };

    supabaseServerModule.getServiceClient = () => ({
        from: (table: string) => {
            if (table === 'scheduled_reminders') {
                return scheduledMock.table;
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
    assert.deepEqual(scheduledMock.updates, [{ id: 'rem-1', sent: true }]);
});

test('processScheduledReminders releases claimed reminder when notification fails', async (t) => {
    const notificationModule = require('../lib/notification-server') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetServiceClient = supabaseServerModule.getServiceClient;
    const originalCreateNotification = notificationModule.createNotification;

    const reminder = {
        id: 'rem-2',
        user_id: 'user-1',
        reminder_type: 'fortune',
        content: { summary: 'Summary' },
    };
    const scheduledMock = createScheduledReminderMock({ reminder });

    notificationModule.createNotification = async () => false;

    supabaseServerModule.getServiceClient = () => ({
        from: (table: string) => {
            if (table === 'scheduled_reminders') {
                return scheduledMock.table;
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
    assert.deepEqual(scheduledMock.updates, [
        { id: 'rem-2', sent: true },
        { id: 'rem-2', sent: false },
    ]);
});

test('processScheduledReminders skips sending when reminder claim was already taken', async (t) => {
    const notificationModule = require('../lib/notification-server') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetServiceClient = supabaseServerModule.getServiceClient;
    const originalCreateNotification = notificationModule.createNotification;

    let notified = false;
    const reminder = {
        id: 'rem-3',
        user_id: 'user-1',
        reminder_type: 'fortune',
        content: { summary: 'Summary' },
    };
    const scheduledMock = createScheduledReminderMock({
        reminder,
        claimResult: { data: null, error: null },
    });

    notificationModule.createNotification = async () => {
        notified = true;
        return true;
    };

    supabaseServerModule.getServiceClient = () => ({
        from: (table: string) => {
            if (table === 'scheduled_reminders') {
                return scheduledMock.table;
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
    assert.equal(notified, false);
    assert.deepEqual(scheduledMock.updates, [{ id: 'rem-3', sent: true }]);
});
