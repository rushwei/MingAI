import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';

const featureGatePath = resolve(process.cwd(), 'src/components/layout/FeatureGate.tsx');
const loginOverlayPath = resolve(process.cwd(), 'src/components/auth/LoginOverlay.tsx');
const notificationPanelPath = resolve(process.cwd(), 'src/components/admin/NotificationLaunchPanel.tsx');
const recordDetailPath = resolve(process.cwd(), 'src/components/records/RecordDetail.tsx');
const historyTemplatePath = resolve(process.cwd(), 'src/components/history/HistoryPageTemplate.tsx');
const adminPageShellPath = resolve(process.cwd(), 'src/components/admin/AdminPageShell.tsx');
const featureTogglePanelPath = resolve(process.cwd(), 'src/components/admin/FeatureTogglePanel.tsx');
const notificationHookPath = resolve(process.cwd(), 'src/lib/hooks/useNotificationUnreadCount.ts');
const userMenuPath = resolve(process.cwd(), 'src/components/layout/UserMenu.tsx');
const notificationBellPath = resolve(process.cwd(), 'src/components/notification/NotificationBell.tsx');
const userPagePath = resolve(process.cwd(), 'src/app/user/page.tsx');
const mobileNavCustomizerPath = resolve(process.cwd(), 'src/components/settings/MobileNavCustomizer.tsx');
const baziLayoutPath = resolve(process.cwd(), 'src/app/bazi/layout.tsx');
const baziPagePath = resolve(process.cwd(), 'src/app/bazi/page.tsx');
const chatPagePath = resolve(process.cwd(), 'src/app/chat/page.tsx');
const faceLayoutPath = resolve(process.cwd(), 'src/app/face/layout.tsx');
const facePagePath = resolve(process.cwd(), 'src/app/face/page.tsx');
const faceResultPagePath = resolve(process.cwd(), 'src/app/face/result/page.tsx');
const palmLayoutPath = resolve(process.cwd(), 'src/app/palm/layout.tsx');
const palmPagePath = resolve(process.cwd(), 'src/app/palm/page.tsx');
const palmResultPagePath = resolve(process.cwd(), 'src/app/palm/result/page.tsx');
const communityPostDetailPath = resolve(process.cwd(), 'src/app/community/[postId]/page.tsx');
const keyManagementPanelPath = resolve(process.cwd(), 'src/components/admin/KeyManagementPanel.tsx');
const recordsPagePath = resolve(process.cwd(), 'src/app/records/page.tsx');
const userChartsPagePath = resolve(process.cwd(), 'src/app/user/charts/page.tsx');
const userKnowledgeBasePagePath = resolve(process.cwd(), 'src/app/user/knowledge-base/page.tsx');

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('FeatureGate should require auth before feature-toggle resolution when anonymous mode is disabled', async () => {
  const source = await readFile(featureGatePath, 'utf-8');

  assert.match(source, /useSessionSafe/u);
  assert.match(source, /enabled:\s*hydrated\s*&&\s*isAuthed/u);
  assert.match(source, /if\s*\(\s*!isAuthed\s*\)/u);
  assert.match(source, /请先登录/u);
});

test('LoginOverlay should no longer render blurred anonymous previews', async () => {
  const source = await readFile(loginOverlayPath, 'utf-8');

  assert.doesNotMatch(source, /blur-sm pointer-events-none select-none/u);
  assert.doesNotMatch(source, /未登录，显示模糊覆盖层/u);
  assert.match(source, /需要登录/u);
});

test('notification launch panel should submit the selected template payload instead of only feature metadata', async () => {
  const source = await readFile(notificationPanelPath, 'utf-8');

  assert.match(source, /templateId:\s*selectedTemplate\?\.id\s*\?\?\s*null/u);
  assert.match(source, /templateVars/u);
});

test('notifications launch route should honor selected template content for site notifications', async (t) => {
  const apiUtils = require('../lib/api-utils') as any;

  const originalRequireAdminContext = apiUtils.requireAdminContext;
  const originalGetSystemAdminClient = apiUtils.getSystemAdminClient;

  const insertedNotifications: Array<{ title?: string; content?: string }> = [];

  apiUtils.requireAdminContext = async () => ({
    user: { id: 'admin-1' },
    supabase: {},
  });
  apiUtils.getSystemAdminClient = () => ({
    from: (table: string) => {
      if (table === 'feature_subscriptions') {
        return {
          select: () => ({
            eq: async () => ({
              data: [{ user_id: 'user-1', notify_site: true }],
              error: null,
            }),
          }),
        };
      }

      if (table === 'user_settings') {
        return {
          select: () => ({
            in: async () => ({
              data: [{ user_id: 'user-1', notifications_enabled: true, notify_site: true }],
              error: null,
            }),
          }),
        };
      }

      if (table === 'notifications') {
        return {
          insert: async (payload: Record<string, unknown>) => {
            insertedNotifications.push(payload);
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  });

  t.after(() => {
    apiUtils.requireAdminContext = originalRequireAdminContext;
    apiUtils.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { POST } = await import('../app/api/notifications/launch/route');
  const request = new NextRequest('http://localhost/api/notifications/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      featureKey: 'liuyao',
      featureUrl: '/liuyao',
      templateId: 'promo_discount',
      templateVars: {
        discount: '限时五折',
        description: '六爻高级分析开放',
        end_date: '本周日',
      },
    }),
  });

  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.equal(insertedNotifications.length, 1);
  assert.equal(insertedNotifications[0]?.title, '🔥 限时优惠：限时五折');
  assert.equal(insertedNotifications[0]?.content, '限时特惠！六爻高级分析开放，活动截止至 本周日，抓紧时间！');
});

test('record detail flows should guard failed responses and use shared confirm dialog instead of browser confirm', async () => {
  const source = await readFile(recordDetailPath, 'utf-8');

  assert.match(source, /const response = await fetch/u);
  assert.match(source, /if\s*\(\s*!response\.ok\s*\)/u);
  assert.match(source, /ConfirmDialog/u);
  assert.doesNotMatch(source, /\bconfirm\(/u);
});

test('history restore payload should use a fresh timestamp query instead of the static history id', async () => {
  const originalNow = Date.now;
  Date.now = () => 1700000000000;

  try {
    const historyClient = await import('../lib/history/client');
    const target = historyClient.applyHistoryRestorePayload({
      sessionKey: 'tarot_result',
      detailPath: '/tarot/result',
      useTimestamp: true,
      sessionData: {},
    });

    assert.equal(target, '/tarot/result?from=history&t=1700000000000');
  } finally {
    Date.now = originalNow;
  }
});

test('history page template should avoid dynamic Tailwind interpolation and stop blocking first paint on full-history fetches', async () => {
  const source = await readFile(historyTemplatePath, 'utf-8');

  assert.match(source, /loadHistorySummariesPage/u);
  assert.doesNotMatch(source, /loadHistorySummaries\(/u);
  assert.doesNotMatch(source, /bg-\$\{themeColor\}/u);
  assert.doesNotMatch(source, /hover:border-\$\{themeColor\}/u);
});

test('admin shell should recover from client access lookup failures instead of hanging forever', async () => {
  const source = await readFile(adminPageShellPath, 'utf-8');

  assert.match(source, /catch/u);
  assert.match(source, /loading:\s*false/u);
});

test('feature toggle panel should expose the actual enabled state to assistive tech', async () => {
  const source = await readFile(featureTogglePanelPath, 'utf-8');

  assert.match(source, /aria-pressed=\{enabled\}/u);
});

test('notification unread count should be centralized in a shared hook/store', async () => {
  const [hookSource, userMenuSource, bellSource, userPageSource] = await Promise.all([
    readFile(notificationHookPath, 'utf-8'),
    readFile(userMenuPath, 'utf-8'),
    readFile(notificationBellPath, 'utf-8'),
    readFile(userPagePath, 'utf-8'),
  ]);

  assert.match(hookSource, /getUnreadCount/u);
  assert.match(userMenuSource, /useNotificationUnreadCount/u);
  assert.match(bellSource, /useNotificationUnreadCount/u);
  assert.match(userPageSource, /useNotificationUnreadCount/u);
  assert.doesNotMatch(userMenuSource, /setInterval\(/u);
  assert.doesNotMatch(bellSource, /setInterval\(/u);
});

test('notification unread shared store should support both explicit counts and delta updates', async () => {
  const [hookSource, bellSource, notificationsPageSource] = await Promise.all([
    readFile(notificationHookPath, 'utf-8'),
    readFile(notificationBellPath, 'utf-8'),
    readFile(resolve(process.cwd(), 'src/app/user/notifications/page.tsx'), 'utf-8'),
  ]);

  assert.match(hookSource, /detail\?\.count/u);
  assert.match(hookSource, /detail\?\.delta/u);
  assert.match(bellSource, /detail:\s*\{\s*delta:\s*change\s*\}/u);
  assert.match(notificationsPageSource, /detail:\s*\{\s*count:\s*unreadCount\s*\}/u);
  assert.doesNotMatch(bellSource, /const next = Math\.max\(0, unreadCount \+ change\)/u);
});

test('mobile nav customizer should use shared confirm dialog instead of browser confirm', async () => {
  const source = await readFile(mobileNavCustomizerPath, 'utf-8');

  assert.match(source, /ConfirmDialog/u);
  assert.doesNotMatch(source, /\bconfirm\(/u);
});

test('remaining destructive web actions should use shared confirm dialogs instead of browser confirm', async () => {
  const sources = await Promise.all([
    readFile(communityPostDetailPath, 'utf-8'),
    readFile(keyManagementPanelPath, 'utf-8'),
    readFile(recordsPagePath, 'utf-8'),
    readFile(userChartsPagePath, 'utf-8'),
    readFile(userKnowledgeBasePagePath, 'utf-8'),
  ]);

  for (const source of sources) {
    assert.match(source, /ConfirmDialog/u);
    assert.doesNotMatch(source, /\bconfirm\(/u);
  }
});

test('feature-gated segments should not wrap the same page in both layout and page components', async () => {
  const [layoutSource, pageSource] = await Promise.all([
    readFile(baziLayoutPath, 'utf-8'),
    readFile(baziPagePath, 'utf-8'),
  ]);

  assert.match(layoutSource, /FeatureGate/u);
  assert.doesNotMatch(pageSource, /FeatureGate/u);
});

test('feature-gated tool pages should gate at the segment boundary and drop dead LoginOverlay wrappers', async () => {
  const [
    chatLayoutSource,
    chatPageSource,
    recordsLayoutSource,
    recordsPageSource,
    faceLayoutSource,
    facePageSource,
    faceResultSource,
    palmLayoutSource,
    palmPageSource,
    palmResultSource,
  ] = await Promise.all([
    readFile(resolve(process.cwd(), 'src/app/chat/layout.tsx'), 'utf-8'),
    readFile(chatPagePath, 'utf-8'),
    readFile(resolve(process.cwd(), 'src/app/records/layout.tsx'), 'utf-8'),
    readFile(recordsPagePath, 'utf-8'),
    readFile(faceLayoutPath, 'utf-8'),
    readFile(facePagePath, 'utf-8'),
    readFile(faceResultPagePath, 'utf-8'),
    readFile(palmLayoutPath, 'utf-8'),
    readFile(palmPagePath, 'utf-8'),
    readFile(palmResultPagePath, 'utf-8'),
  ]);

  assert.match(chatLayoutSource, /FeatureGate/u);
  assert.doesNotMatch(chatPageSource, /FeatureGate/u);
  assert.doesNotMatch(chatPageSource, /LoginOverlay/u);

  assert.match(recordsLayoutSource, /FeatureGate/u);
  assert.doesNotMatch(recordsPageSource, /FeatureGate/u);
  assert.doesNotMatch(recordsPageSource, /LoginOverlay/u);

  assert.match(faceLayoutSource, /FeatureGate/u);
  assert.doesNotMatch(facePageSource, /LoginOverlay/u);
  assert.doesNotMatch(faceResultSource, /LoginOverlay/u);

  assert.match(palmLayoutSource, /FeatureGate/u);
  assert.doesNotMatch(palmPageSource, /LoginOverlay/u);
  assert.doesNotMatch(palmResultSource, /LoginOverlay/u);
});
