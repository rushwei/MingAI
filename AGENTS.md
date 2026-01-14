# Repository Guidelines

## Project Background
MingAI is an AI-driven Chinese astrology platform combining 八字 and 紫微斗数 with AI chat, daily/monthly fortune tools, subscription tiers, and notification delivery (site + email). The product emphasizes a calm, modern UI and privacy-first data handling. Feature status and scope live in `docs/plans/PRD-MingAI-v1.5.md` and delivery reports under `docs/deliverables/`.

## Architecture & Stack
Next.js 16 App Router + React 19 + TypeScript. UI uses Tailwind CSS and Lucide icons. Supabase provides Auth + Postgres + Storage; Resend is used for email notifications. AI inference is handled via DeepSeek/GLM API calls. Cron-like tasks run via GitHub Actions calling `/api/credits/restore`.

## Project Structure & Module Organization
- `src/app`: App Router routes and API handlers (`src/app/api`).
- `src/components`: feature components (`bazi`, `ziwei`, `chat`, `profile`, `notification`) and shared UI/layout (`layout`, `ui`).
- `src/lib`: domain logic (auth, membership, credits, notifications, AI, calendar).
- `supabase/migrations`: schema/RLS migrations; `supabase/tabel_export_from_supabase.sql` reflects the deployed schema snapshot.
- `docs`: product plans, delivery reports, reviews.
- `public`: static assets; global styles in `src/app/globals.css`.

## Data Model & Security Notes
Key tables: `users` (membership + `ai_chat_count` + `is_admin`), `user_settings`, `bazi_charts`, `ziwei_charts`, `conversations`, `notifications`, `feature_subscriptions`, `login_attempts`, `rate_limits`, `orders`. RLS is enabled; `notifications` inserts are service-role only. Admin operations use service-side Supabase clients; do not expose service keys to the client.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies.
- `pnpm dev`: local dev server (`http://localhost:3000`).
- `pnpm build`: production build.
- `pnpm start`: run production build.
- `pnpm lint`: ESLint.

## Coding Style & Naming Conventions
Use TSX functional components. Match the file’s formatting; avoid unrelated reformatting. Route files follow Next.js conventions (`page.tsx`, `layout.tsx`, `route.ts`). Tailwind is the default; global overrides live in `src/app/globals.css`. Keep pages thin by extracting components into `src/components`. When using React hooks or Server Actions, add a brief comment on why and mark client/server components with `use client` or `use server` plus a short reason.

## Testing Guidelines
No dedicated test runner yet; linting is the primary gate. If adding tests, use `*.test.tsx` or `*.spec.ts` under `src/` and document the command in `package.json`.

## Commit & Pull Request Guidelines
Use Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) with a short summary. Keep commits focused. For PRs, include a concise description and screenshots for UI changes.

## Configuration & Secrets
Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_SECRET`, `CRON_SECRET`. Store in `.env.local` and platform env vars; never expose server-only keys via `NEXT_PUBLIC_`.

## Design & UX Guidance
Clean, neutral surfaces (black/white/gray) with restrained gold accents. Keep the light/dark toggle, left sidebar + main content on desktop, and bottom navigation on mobile. Use Lucide consistently, avoid noisy animations, and keep motion subtle.
