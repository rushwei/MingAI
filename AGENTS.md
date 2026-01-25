# Repository Guidelines

## Project Background
MingAI is an AI-driven Chinese astrology platform spanning 八字, 紫微斗数, 关系合盘, MBTI, 塔罗, 六爻, 运势中心, 命理社区, 面相/手相 with AI chat, daily/monthly fortunes, gamification, reminders, subscription tiers, annual reports, and site/email notifications. The product emphasizes a calm, modern UI and privacy-first data handling. Feature status and scope live in `docs/plans/PRD-MingAI-v2.0.md` (v2.1, last updated 2026-01-20) and delivery reports under `docs/deliverables/`.

## Architecture & Stack
Next.js 16 App Router + React 19 + TypeScript; Capacitor wraps the web app for iOS/Android. UI uses Tailwind CSS and Lucide icons. Supabase provides Auth + Postgres + Storage; Resend is used for email notifications. AI inference uses DeepSeek/GLM/Gemini/Qwen/DeepAI (plus Qwen-VL/Gemini-VL for vision). Deployments go to Vercel + Zeabur. Cron-like tasks run via GitHub Actions (credits restore daily/hourly, reminders, annual reports, notifications) calling `/api` routes.

## Project Structure & Module Organization
- `src/app`: App Router routes and API handlers (`src/app/api`), including `admin`, `bazi`, `chat`, `community`, `daily`, `monthly`, `fortune-hub`, `records`, `dream`, `face`, `palm`, `help`, `hepan`, `mbti`, `tarot`, `liuyao`, `ziwei`, `user`.
- `src/components`: feature components (`admin`, `auth`, `bazi`, `chat`, `daily`, `fortune`, `hepan`, `knowledge-base`, `liuyao`, `mbti`, `tarot`, `membership`, `notification`, `profile`, `settings`) and shared UI/layout (`layout`, `ui`, `common`, `providers`).
- `src/lib`: domain logic (AI/providers, data-sources, knowledge-base, mentions, astrology systems, community, records, gamification, reminders, membership, notifications, credits).
- `src/tests`: Node test runner suites; `src/types`: shared TS types.
- `android`/`ios`: Capacitor native shells; `capacitor-www`: Capacitor web output.
- `supabase/migrations`: schema/RLS migrations; `supabase/tabel_export_from_supabase.sql` reflects the deployed schema snapshot.
- `docs`: product plans, delivery reports, reviews.
- `public`: static assets; global styles in `src/app/globals.css`.

## Data Model & Security Notes
Key tables (per PRD v2.1): `users` (membership + `ai_chat_count` + `is_admin`), `user_settings`, `bazi_charts`, `ziwei_charts`, `hepan_charts`, `mbti_readings`, `tarot_readings`, `liuyao_divinations`, `conversations`, `notifications`, `feature_subscriptions`, `orders`, `credit_transactions`, `daily_checkins`, `user_levels`, `user_achievements`, `community_posts`, `community_comments`, `community_votes`, `community_reports`, `ming_records`, `ming_notes`, `face_readings`, `palm_readings`, `reminder_subscriptions`, `scheduled_reminders`, `annual_reports`, `login_attempts`, `rate_limits`. RLS is enabled; `notifications` inserts are service-role only. Admin operations use service-side Supabase clients; do not expose service keys to the client.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies.
- `pnpm dev`: local dev server (`http://localhost:3000`).
- `pnpm build`: production build.
- `pnpm start`: run production build.
- `pnpm lint`: ESLint.
- `pnpm test`: Node test runner for `src/tests/*.test.ts`.

## Coding Style & Naming Conventions
Use TSX functional components. Match the file’s formatting; avoid unrelated reformatting. Route files follow Next.js conventions (`page.tsx`, `layout.tsx`, `route.ts`). Tailwind is the default; global overrides live in `src/app/globals.css`. Keep pages thin by extracting components into `src/components`. When using React hooks or Server Actions, add a brief comment on why and mark client/server components with `use client` or `use server` plus a short reason.

## Testing Guidelines
Use `src/tests/*.test.ts` with the Node test runner (`pnpm test`); linting is still the primary gate. If adding tests outside `src/tests`, update the `pnpm test` glob.

## Commit & Pull Request Guidelines
Use Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) with a short summary. Keep commits focused. For PRs, include a concise description and screenshots for UI changes.

## Configuration & Secrets
Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_SECRET`, `CRON_SECRET`. Store in `.env.local` and platform env vars; never expose server-only keys via `NEXT_PUBLIC_`.

## Design & UX Guidance
Clean, neutral surfaces with restrained gold accents. Theme tokens per PRD: dark background #0a0a0a / #1a1a1a with text #ffffff / #a0a0a0; light background #ffffff / #f5f5f5 with text #000000 / #666666. Keep the light/dark toggle, left sidebar + main content on desktop, and bottom navigation on mobile. Use Lucide consistently, avoid noisy animations, and keep motion subtle.
