import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    executeAnnouncementCtaNavigation,
    isSafeAnnouncementHref,
    normalizeAnnouncementNavigationTarget,
} from '../lib/announcement';

test('isSafeAnnouncementHref should reject dangerous javascript and data schemes', () => {
    assert.equal(isSafeAnnouncementHref('javascript:alert(1)'), false);
    assert.equal(isSafeAnnouncementHref('data:text/html,<script>alert(1)</script>'), false);
});

test('isSafeAnnouncementHref should allow relative and http urls', () => {
    assert.equal(isSafeAnnouncementHref('/status'), true);
    assert.equal(isSafeAnnouncementHref('https://mingai.example/status'), true);
});

test('normalizeAnnouncementNavigationTarget should reject unsafe urls before navigation', () => {
    assert.equal(
        normalizeAnnouncementNavigationTarget('javascript:alert(1)', 'https://mingai.app'),
        null,
    );
    assert.equal(
        normalizeAnnouncementNavigationTarget('data:text/html,hello', 'https://mingai.app'),
        null,
    );
});

test('normalizeAnnouncementNavigationTarget should resolve same-origin and external urls safely', () => {
    assert.deepEqual(
        normalizeAnnouncementNavigationTarget('/status?tab=1', 'https://mingai.app'),
        { href: '/status?tab=1', external: false },
    );
    assert.deepEqual(
        normalizeAnnouncementNavigationTarget('https://docs.example.com/notice', 'https://mingai.app'),
        { href: 'https://docs.example.com/notice', external: true },
    );
});

test('executeAnnouncementCtaNavigation should dismiss before navigating to internal targets', () => {
    const calls: string[] = [];

    const result = executeAnnouncementCtaNavigation({
        href: '/status?tab=1',
        origin: 'https://mingai.app',
        dismiss: () => calls.push('dismiss'),
        navigateInternal: (href) => calls.push(`push:${href}`),
        navigateExternal: (href) => calls.push(`assign:${href}`),
    });

    assert.equal(result, 'internal');
    assert.deepEqual(calls, ['dismiss', 'push:/status?tab=1']);
});

test('executeAnnouncementCtaNavigation should dismiss before following external targets', () => {
    const calls: string[] = [];

    const result = executeAnnouncementCtaNavigation({
        href: 'https://docs.example.com/notice',
        origin: 'https://mingai.app',
        dismiss: () => calls.push('dismiss'),
        navigateInternal: (href) => calls.push(`push:${href}`),
        navigateExternal: (href) => calls.push(`assign:${href}`),
    });

    assert.equal(result, 'external');
    assert.deepEqual(calls, ['dismiss', 'assign:https://docs.example.com/notice']);
});

test('executeAnnouncementCtaNavigation should not dismiss when href is unsafe', () => {
    const calls: string[] = [];

    const result = executeAnnouncementCtaNavigation({
        href: 'javascript:alert(1)',
        origin: 'https://mingai.app',
        dismiss: () => calls.push('dismiss'),
        navigateInternal: (href) => calls.push(`push:${href}`),
        navigateExternal: (href) => calls.push(`assign:${href}`),
        onBlocked: (href) => calls.push(`blocked:${href}`),
    });

    assert.equal(result, 'blocked');
    assert.deepEqual(calls, ['blocked:javascript:alert(1)']);
});
