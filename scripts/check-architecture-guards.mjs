import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function walk(relativeDir, files = []) {
  for (const entry of readdirSync(resolve(root, relativeDir), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const nextPath = join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      walk(nextPath, files);
      continue;
    }

    files.push(nextPath);
  }

  return files;
}

function mustExist(relativePath, reason) {
  if (!existsSync(resolve(root, relativePath))) {
    failures.push(`${relativePath}: ${reason}`);
  }
}

function mustNotExist(relativePath, reason) {
  if (existsSync(resolve(root, relativePath))) {
    failures.push(`${relativePath}: ${reason}`);
  }
}

function mustMatch(relativePath, pattern, reason) {
  const source = read(relativePath);
  if (!pattern.test(source)) {
    failures.push(`${relativePath}: ${reason}`);
  }
}

function mustNotMatch(relativePath, pattern, reason) {
  const source = read(relativePath);
  if (pattern.test(source)) {
    failures.push(`${relativePath}: ${reason}`);
  }
}

function mustNotMatchInTree(relativeDir, pattern, reason, predicate = () => true) {
  for (const file of walk(relativeDir)) {
    if (!predicate(file)) {
      continue;
    }

    const source = read(file);
    if (pattern.test(source)) {
      failures.push(`${file}: ${reason}`);
    }
  }
}

mustExist('src/lib/auth.ts', 'browser auth should converge on the unified auth entrypoint');
mustNotExist('src/lib/auth-client.ts', 'legacy browser auth client entrypoint should stay removed');
mustNotExist('src/app/api/supabase/proxy/route.ts', 'legacy supabase proxy route should stay removed');
mustNotExist('src/lib/data-sources/init.ts', 'data source side-effect init should stay removed');

mustMatch(
  'src/app/api/auth/route.ts',
  /from ['"]@\/lib\/api-utils['"]/u,
  'auth route should rely on api-utils clients instead of creating its own Supabase client',
);
mustMatch(
  'src/app/api/auth/route.ts',
  /createAnonClient/u,
  'auth route should use createAnonClient from api-utils',
);
mustNotMatch(
  'src/app/api/auth/route.ts',
  /createClient\(/u,
  'auth route should not call createClient directly',
);

mustMatch(
  'src/lib/api-utils.ts',
  /const authResult = await requireUserContext\(request\);/u,
  'requireAdminUser should be based on requireUserContext',
);
mustNotMatch(
  'src/lib/api-utils.ts',
  /getServiceRoleClient/u,
  'stale service-role naming should stay removed',
);
mustNotMatch(
  'src/lib/api-utils.ts',
  /const serviceClient = getSystemAdminClient\(\);/u,
  'requireAdminUser should not create a service-role client directly',
);

mustMatch(
  'src/lib/server/ai-config.ts',
  /import 'server-only';/u,
  'server ai-config should stay marked as server-only',
);
mustMatch(
  'src/lib/server/ai-config.ts',
  /getSystemAdminClient/u,
  'server ai-config should use the shared privileged server client',
);
mustNotMatch(
  'src/lib/server/ai-config.ts',
  /SUPABASE_SERVICE_ROLE_KEY/u,
  'server ai-config should not reference service-role env vars directly',
);

mustNotMatch(
  'src/lib/ai/ai-config.ts',
  /SUPABASE_SERVICE_ROLE_KEY/u,
  'shared ai-config should not reference service-role env vars directly',
);
mustNotMatch(
  'src/lib/ai/ai-config.ts',
  /await import\('@supabase\/supabase-js'\)/u,
  'shared ai-config should not dynamically import supabase-js for privileged access',
);

mustMatch(
  'src/app/api/models/route.ts',
  /from ['"]@\/lib\/server\/ai-config['"]/u,
  'models route should use the server ai-config module',
);

mustMatch(
  'src/app/api/chat/route.ts',
  /from ['"]@\/lib\/server\/chat\/request['"]/u,
  'chat route should delegate request preparation to the shared server helper',
);
mustMatch(
  'src/app/api/chat/route.ts',
  /prepareChatRequest\(/u,
  'chat route should call prepareChatRequest',
);
mustMatch(
  'src/app/api/chat/route.ts',
  /callAIUIMessageResult\(/u,
  'chat route should call callAIUIMessageResult for streaming',
);
mustMatch(
  'src/lib/server/chat/request.ts',
  /import 'server-only';/u,
  'chat request helper should stay server-only',
);
mustMatch(
  'src/lib/server/chat/prompt-context.ts',
  /import 'server-only';/u,
  'chat prompt context helper should stay server-only',
);
mustMatch(
  'src/app/chat/page.tsx',
  /useChatBootstrap/u,
  'chat page should load bootstrap state through the shared hook',
);
mustNotMatch(
  'src/app/chat/page.tsx',
  /getMembershipInfo\(/u,
  'chat page should not fetch membership directly',
);
mustNotMatch(
  'src/app/chat/page.tsx',
  /getCurrentUserProfileBundle\(/u,
  'chat page should not fetch the profile bundle directly',
);
mustNotMatch(
  'src/app/chat/page.tsx',
  /fetch\((['"])\/api\/knowledge-base\1/u,
  'chat page should not fetch knowledge bases directly',
);

mustMatch(
  'src/lib/divination/tarot.ts',
  /from ['"]@mingai\/core\/tarot['"]/u,
  'tarot wrapper should import the dedicated tarot subpath',
);
mustMatch(
  'src/app/api/daliuren/route.ts',
  /from ['"]@mingai\/core\/daliuren['"]/u,
  'daliuren route should import the dedicated daliuren subpath',
);
mustNotMatch(
  'src/app/api/daliuren/route.ts',
  /handleDaliurenCalculate[\s\S]*from ['"]@mingai\/core['"]/u,
  'daliuren route should not import handleDaliurenCalculate from the root core entry',
);
mustMatch(
  'src/lib/divination/qimen.ts',
  /from ['"]@mingai\/core\/qimen['"]/u,
  'qimen wrapper should import the dedicated qimen subpath',
);
mustNotMatch(
  'src/lib/divination/qimen.ts',
  /from ['"]@mingai\/core['"]/u,
  'qimen wrapper should not import from the root core entry',
);
mustMatch(
  'src/app/api/daliuren/route.ts',
  /const\s+\{[^}]*timezone[^}]*\}\s*=\s*body/u,
  'daliuren calculate action should extract timezone from the request body',
);
mustMatch(
  'src/app/api/daliuren/route.ts',
  /handleDaliurenCalculate\(\{[\s\S]*timezone[\s\S]*\}\)/u,
  'daliuren route should forward timezone into the core handler',
);
mustMatch(
  'src/lib/divination/liuyao.ts',
  /@mingai\/core\/liuyao-core/u,
  'liuyao compatibility layer should import the shared liuyao core module',
);
mustMatch(
  'src/lib/divination/liuyao.ts',
  /@mingai\/core\/data\/hexagram-data/u,
  'liuyao compatibility layer should import shared hexagram data from core',
);
mustMatch(
  'src/lib/divination/liuyao.ts',
  /@mingai\/core\/data\/shensha-data/u,
  'liuyao compatibility layer should import shared shensha data from core',
);
mustNotMatch(
  'src/lib/divination/liuyao.ts',
  /packages\/core\/dist\//u,
  'liuyao compatibility layer should not import package dist files directly',
);

mustMatch(
  'src/app/qimen/result/page.tsx',
  /from ['"]@\/lib\/divination\/qimen-shared['"]/u,
  'qimen result page should import browser-safe qimen helpers from qimen-shared',
);
mustNotMatch(
  'src/app/qimen/result/page.tsx',
  /import\s*\{\s*generateQimenResultText[^}]*\}\s*from ['"]@\/lib\/divination\/qimen['"]/u,
  'qimen result page should not import runtime copy helpers from the server-only qimen module',
);

mustNotMatch(
  'src/lib/chat/conversation.ts',
  /from ['"]@\/lib\/auth['"]/u,
  'conversation client should use HTTP APIs instead of browser auth DB access',
);
mustMatch(
  'src/lib/chat/conversation.ts',
  /\/api\/conversations/u,
  'conversation client should target the dedicated conversations API',
);

mustNotMatchInTree(
  'src/app',
  /supabase\s*\.\s*(from|rpc)\s*\(/m,
  'page layer should not query Supabase directly from app routes or pages',
  (file) => !file.includes('/api/') && /\.(ts|tsx)$/u.test(file),
);
mustNotMatchInTree(
  'src/components',
  /supabase\s*\.\s*(from|rpc)\s*\(/m,
  'component layer should not query Supabase directly',
  (file) => /\.(ts|tsx)$/u.test(file),
);

mustNotMatch(
  'src/app/user/profile/page.tsx',
  /\.from\('users'\)|supabase\.storage/u,
  'profile page should use APIs instead of direct users/storage access',
);
mustNotMatch(
  'src/app/community/[postId]/page.tsx',
  /\.from\('user_settings'\)/u,
  'community page should not write user_settings directly from the browser',
);
mustNotMatch(
  'src/lib/user/membership.ts',
  /supabase\s*\.\s*from\s*\(/m,
  'browser membership helpers should not write tables directly',
);
mustNotMatch(
  'src/lib/auth.ts',
  /createBrowserClient|createClient|NEXT_PUBLIC_SUPABASE_ANON_KEY/u,
  'browser auth adapter should stay decoupled from browser Supabase clients',
);
mustNotMatch(
  'src/app/layout.tsx',
  /__MINGAI_PUBLIC_SUPABASE__|getSupabaseUrl|getSupabaseAnonKey/u,
  'root layout should not inject Supabase config into window state',
);
mustNotMatch(
  'Dockerfile',
  /ARG SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY="\$SUPABASE_SERVICE_ROLE_KEY"/u,
  'Dockerfile should not accept or forward the Supabase service role key at build time',
);
mustNotMatch(
  'docker-compose.yml',
  /SUPABASE_SERVICE_ROLE_KEY:/u,
  'docker-compose.yml should not pass the Supabase service role key into the web build args',
);
mustNotMatch(
  'docker-compose.web.yml',
  /SUPABASE_SERVICE_ROLE_KEY:/u,
  'docker-compose.web.yml should not pass the Supabase service role key into the web build args',
);
mustMatch(
  'src/app/page.tsx',
  /redirect\('\/user'\)/u,
  'home page should redirect visitors to /user after anonymous mode removal',
);
mustNotMatch(
  'src/app/page.tsx',
  /ACCESS_COOKIE|REFRESH_COOKIE|resolveSessionFromTokens|createAnonClient|createRequestSupabaseClient|cookies\(\)/u,
  'home page should not resolve auth cookies or server sessions directly',
);
mustMatch(
  'src/lib/supabase-server.ts',
  /NODE_ENV[\s\S]*production/u,
  'supabase-server should branch on production environment for admin session policy',
);
mustMatch(
  'src/lib/supabase-server.ts',
  /Missing SUPABASE_SYSTEM_ADMIN_EMAIL or SUPABASE_SYSTEM_ADMIN_PASSWORD/u,
  'supabase-server should keep a clear missing-credentials error',
);
mustNotMatch(
  'Dockerfile',
  /ARG SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY="\$SUPABASE_SERVICE_ROLE_KEY"/u,
  'Dockerfile should not pass SUPABASE_SERVICE_ROLE_KEY as a build argument',
);
mustNotMatch(
  'docker-compose.yml',
  /SUPABASE_SERVICE_ROLE_KEY:/u,
  'docker-compose.yml should not include service role key in web build args',
);
mustNotMatch(
  'docker-compose.web.yml',
  /SUPABASE_SERVICE_ROLE_KEY:/u,
  'docker-compose.web.yml should not include service role key in web build args',
);
for (const file of [
  'src/app/api/liuyao/route.ts',
  'src/app/liuyao/result/page.tsx',
  'src/lib/data-sources/liuyao.ts',
]) {
  mustNotMatch(
    file,
    /rank=|rankScore|排序分/u,
    'liuyao surfaces should not expose rank score wording',
  );
}

mustMatch(
  'supabase/migrations/20260318_drop_community_posts_anonymous_name.sql',
  /ALTER TABLE public\.community_posts[\s\S]*DROP COLUMN IF EXISTS anonymous_name/u,
  'community anonymity cleanup migration should drop the obsolete anonymous_name column',
);
mustMatch(
  'supabase/migrations/20260315_fix_user_oauth_providers_admin_rls.sql',
  /DROP POLICY IF EXISTS "Service role full access on oauth providers"/u,
  'oauth provider RLS migration should remove the service_role-only policy',
);
mustMatch(
  'supabase/migrations/20260315_fix_user_oauth_providers_admin_rls.sql',
  /CREATE POLICY "Admins full access" ON public\.user_oauth_providers/u,
  'oauth provider RLS migration should add an admin access policy',
);
mustMatch(
  'supabase/migrations/20260315_fix_user_oauth_providers_admin_rls.sql',
  /public\.is_admin_user\(\)/u,
  'oauth provider RLS migration should use the shared admin predicate',
);
mustMatch(
  'supabase/migrations/20260212_mcp_guard_internal_updates.sql',
  /current_setting\('mingai\.mcp_internal_update', true\)/u,
  'mcp guard migration should support the scoped internal-update bypass flag',
);
mustMatch(
  'supabase/migrations/20260212_mcp_guard_internal_updates.sql',
  /set_config\('mingai\.mcp_internal_update', '1', true\)/u,
  'mcp guard migration should set the scoped bypass flag inside trusted RPCs',
);
mustMatch(
  'supabase/migrations/20260212_mcp_guard_internal_updates.sql',
  /CREATE OR REPLACE FUNCTION public\.mcp_reset_key/u,
  'mcp guard migration should patch mcp_reset_key',
);
mustMatch(
  'supabase/migrations/20260212_mcp_guard_internal_updates.sql',
  /CREATE OR REPLACE FUNCTION public\.admin_revoke_mcp_key/u,
  'mcp guard migration should patch admin_revoke_mcp_key',
);
mustMatch(
  'supabase/migrations/20260212_mcp_guard_internal_updates.sql',
  /CREATE OR REPLACE FUNCTION public\.admin_unban_mcp_key/u,
  'mcp guard migration should define admin_unban_mcp_key',
);
mustMatch(
  'supabase/migrations/20260212_mcp_guard_internal_updates.sql',
  /SET key_code = p_new_key_code,[\s\S]*is_active = true/u,
  'mcp reset RPC should reactivate a key when rotating its code',
);
mustMatch(
  'supabase/migrations/20260212_mcp_unban_reactivate_keys.sql',
  /UPDATE public\.mcp_api_keys[\s\S]*WHERE is_banned = false[\s\S]*is_active = false/u,
  'mcp unban reactivation migration should backfill legacy inactive keys',
);
mustMatch(
  'supabase/migrations/20260212_mcp_unban_reactivate_keys.sql',
  /CREATE OR REPLACE FUNCTION public\.admin_unban_mcp_key/u,
  'mcp unban reactivation migration should redefine admin_unban_mcp_key',
);
mustMatch(
  'supabase/migrations/20260212_mcp_unban_reactivate_keys.sql',
  /SET is_banned = false,[\s\S]*is_active = true/u,
  'admin_unban_mcp_key should restore active state',
);

mustNotMatch(
  'src/lib/data-sources/index.ts',
  /registerDataSource\(/u,
  'data source registry should remain manifest-driven',
);

if (failures.length > 0) {
  console.error('Architecture guard failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Architecture guards passed.');
