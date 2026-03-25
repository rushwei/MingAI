import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    filterNotifications,
    groupNotificationsByDay,
    reconcileSelectedNotificationIds,
    type NotificationFilterState,
} from '../lib/notification-view';
import type { Notification } from '../lib/notification';

const sampleNotifications: Notification[] = [
    {
        id: 'n1',
        user_id: 'user-1',
        type: 'system',
        title: '系统公告',
        content: '内容 1',
        is_read: false,
        link: null,
        created_at: '2026-03-23T06:00:00.000Z',
    },
    {
        id: 'n2',
        user_id: 'user-1',
        type: 'promotion',
        title: '活动提醒',
        content: '内容 2',
        is_read: true,
        link: null,
        created_at: '2026-03-20T06:00:00.000Z',
    },
    {
        id: 'n3',
        user_id: 'user-1',
        type: 'feature_launch',
        title: '功能上线',
        content: '内容 3',
        is_read: false,
        link: null,
        created_at: '2026-03-10T06:00:00.000Z',
    },
];

test('filterNotifications should support unread and type filters together', () => {
    const filters: NotificationFilterState = {
        read: 'unread',
        type: 'system',
    };

    const result = filterNotifications(sampleNotifications, filters);
    assert.deepEqual(result.map((item) => item.id), ['n1']);
});

test('groupNotificationsByDay should split notifications into today recent and older buckets', () => {
    const groups = groupNotificationsByDay(sampleNotifications, '2026-03-23T10:00:00.000Z');

    assert.deepEqual(
        groups.map((group) => ({
            label: group.label,
            ids: group.items.map((item) => item.id),
        })),
        [
            { label: '今天', ids: ['n1'] },
            { label: '近 7 天', ids: ['n2'] },
            { label: '更早', ids: ['n3'] },
        ],
    );
});

test('groupNotificationsByDay should use calendar boundaries instead of rolling 24 hours', () => {
    const groups = groupNotificationsByDay([
        {
            id: 'midnight-edge',
            user_id: 'user-1',
            type: 'system',
            title: '昨晚消息',
            content: null,
            is_read: false,
            link: null,
            created_at: '2026-03-22T23:50:00.000+08:00',
        },
    ], '2026-03-23T00:10:00.000+08:00');

    assert.deepEqual(
        groups.map((group) => group.label),
        ['近 7 天'],
    );
});

test('reconcileSelectedNotificationIds should drop selections hidden by the active filter', () => {
    const visibleNotifications = sampleNotifications.filter((item) => item.id === 'n1');
    const selectedIds = new Set(['n1', 'n2']);

    const next = reconcileSelectedNotificationIds(selectedIds, visibleNotifications);

    assert.deepEqual(Array.from(next), ['n1']);
});
