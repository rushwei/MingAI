import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';

test('createNotification uses service client for inserts', async (t) => {
    const notificationModule = require('../lib/notification-server') as any;
    const supabaseModule = require('../lib/auth') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalFrom = supabaseModule.supabase.from;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;

    let inserted: Record<string, unknown> | null = null;

    supabaseModule.supabase.from = () => {
        throw new Error('browser client should not be used');
    };

    supabaseServerModule.getSystemAdminClient = () => ({
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
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
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
    const updates: Array<{ id: string; action: 'claim' | 'sent' | 'release' }> = [];
    const state = {
        sent: Boolean(options.reminder.sent),
        sent_at: typeof options.reminder.sent_at === 'string' ? options.reminder.sent_at : null as string | null,
    };

    return {
        updates,
        table: {
            select: () => ({
                eq: () => ({
                    lte: () => ({
                        or: () => ({
                            limit: async () => ({
                                data: [{ ...options.reminder, sent: state.sent, sent_at: state.sent_at }],
                                error: null,
                            }),
                        }),
                    }),
                }),
            }),
            update: (payload: { sent?: boolean; sent_at?: string | null }) => ({
                eq: (_column: string, id: string) => ({
                    eq: () => {
                        if (typeof payload.sent_at === 'string' && payload.sent === undefined) {
                            return {
                                or: () => ({
                                    select: () => ({
                                        maybeSingle: async () => {
                                            updates.push({ id, action: 'claim' });
                                            const claimResult = options.claimResult ?? { data: { id }, error: null };
                                            if (claimResult.data) {
                                                state.sent_at = payload.sent_at as string;
                                            }
                                            return claimResult;
                                        },
                                    }),
                                }),
                            };
                        }

                        return {
                            eq: (_claimColumn: string, claimToken: unknown) => {
                                if (payload.sent === true && typeof payload.sent_at === 'string') {
                                    return {
                                        select: () => ({
                                            maybeSingle: async () => {
                                                updates.push({ id, action: 'sent' });
                                                if (state.sent || state.sent_at !== claimToken) {
                                                    return { data: null, error: null };
                                                }
                                                state.sent = true;
                                                state.sent_at = payload.sent_at as string;
                                                return { data: { id }, error: null };
                                            },
                                        }),
                                    };
                                }

                                if (payload.sent_at === null) {
                                    updates.push({ id, action: 'release' });
                                    if (!state.sent && state.sent_at === claimToken) {
                                        state.sent_at = null;
                                    }
                                }

                                return Promise.resolve({ error: null });
                            },
                        };
                    },
                }),
            }),
        },
    };
}

test('processScheduledReminders marks skipped reminder as sent only after successful claim', async (t) => {
    const notificationModule = require('../lib/notification-server') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;
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

    supabaseServerModule.getSystemAdminClient = () => ({
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
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
    });

    const { processScheduledReminders } = await import('../lib/reminders');
    const processed = await processScheduledReminders();

    assert.equal(processed, 0);
    assert.equal(notified, false);
    assert.deepEqual(scheduledMock.updates, [
        { id: 'rem-1', action: 'claim' },
        { id: 'rem-1', action: 'sent' },
    ]);
});

test('processScheduledReminders releases claimed reminder when notification fails', async (t) => {
    const notificationModule = require('../lib/notification-server') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;
    const originalCreateNotification = notificationModule.createNotification;

    const reminder = {
        id: 'rem-2',
        user_id: 'user-1',
        reminder_type: 'fortune',
        content: { summary: 'Summary' },
    };
    const scheduledMock = createScheduledReminderMock({ reminder });

    notificationModule.createNotification = async () => false;

    supabaseServerModule.getSystemAdminClient = () => ({
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
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
    });

    const { processScheduledReminders } = await import('../lib/reminders');
    const processed = await processScheduledReminders();

    assert.equal(processed, 0);
    assert.deepEqual(scheduledMock.updates, [
        { id: 'rem-2', action: 'claim' },
        { id: 'rem-2', action: 'release' },
    ]);
});

test('processScheduledReminders skips sending when reminder claim was already taken', async (t) => {
    const notificationModule = require('../lib/notification-server') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;
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

    supabaseServerModule.getSystemAdminClient = () => ({
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
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
    });

    const { processScheduledReminders } = await import('../lib/reminders');
    const processed = await processScheduledReminders();

    assert.equal(processed, 0);
    assert.equal(notified, false);
    assert.deepEqual(scheduledMock.updates, [{ id: 'rem-3', action: 'claim' }]);
});
