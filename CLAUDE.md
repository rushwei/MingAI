# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm install          # Install dependencies (pnpm-lock.yaml is authoritative)
pnpm dev              # Development server at http://localhost:3000
pnpm build            # Production build
pnpm start            # Run production build locally
pnpm lint             # Run ESLint
pnpm test             # Run all tests (Node.js built-in test runner)

# Run a single test file
NODE_OPTIONS=--require=./scripts/ts-register.cjs node --test src/tests/mbti-logic.test.ts
```

## Architecture Overview

**MingAI** is an AI-powered traditional Chinese divination platform built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, and Supabase (PostgreSQL + Auth).

### Core Divination Systems
- **Bazi (Four Pillars)**: Uses `lunar-javascript` library for calculating 天干地支 (heavenly stems/earthly branches), 五行 (five elements), and 十神 (ten gods)
- **Ziwei Doushu (Purple Star Astrology)**: Uses `iztro` library for palace positions and star distributions
- **Tarot (塔罗牌)**: 78-card Waite deck with major/minor arcana. Multiple spreads (single, three-card, love, Celtic cross). Uses `lib/tarot.ts`
- **Liuyao (六爻)**: I-Ching hexagram divination with 64 hexagrams, coin-toss algorithm, and hexagram transformations (变卦). Uses `lib/liuyao.ts`
- **Hepan (合盘)**: Synastry/compatibility analysis between two Bazi charts. Types: love, business, family. Uses `lib/hepan.ts`
- **MBTI (性格测试)**: 16-type personality system with Likert scale (1-7) scoring across 4 dimensions. Uses `lib/mbti.ts`

### AI Chat System
- Streaming responses via SSE using DeepSeek and GLM-4.6 APIs (GLM via SiliconFlow/硅基流动)
- Chat can reference saved Bazi/Ziwei charts for context
- **Unified AI Storage**: All AI analyses stored in `conversations` table with `source_type` discriminator (chat, bazi_wuxing, bazi_personality, tarot, liuyao, mbti, hepan) and `source_data` JSONB for original input

### Database Schema
- **Schema export**: `supabase/tabel_export_from_supabase.sql`
- **Migrations**: `supabase/migrations/*.sql`
- **Key tables**: `users` (with `is_admin`), `user_settings`, `bazi_charts`, `ziwei_charts`, `conversations`, `tarot_readings`, `liuyao_divinations`, `hepan_charts`, `mbti_readings`, `rate_limits`, `notifications`, `feature_subscriptions`, `login_attempts`, `orders`

### Membership & Credits
- **Free**: 3 AI credits max, +1 daily restore
- **Plus**: 50 credits max, +50 initial, +5 daily restore
- **Pro**: 200 credits max, +200 initial, +1 hourly restore
- Rate limiting via Supabase `rate_limits` table (IP + endpoint tracking)
- Credit restoration via GitHub Actions (daily for Free/Plus, hourly for Pro)

### Project Structure
```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                # API routes (chat, tarot, liuyao, hepan, mbti, bazi, ziwei, credits, membership, notifications)
│   ├── bazi/              # Bazi form + results pages
│   ├── ziwei/             # Ziwei form + results pages
│   ├── tarot/             # Tarot card draws
│   ├── liuyao/            # I-Ching divination
│   ├── hepan/             # Compatibility analysis
│   ├── mbti/              # Personality testing
│   ├── daily/             # Daily fortune
│   ├── monthly/           # Monthly fortune
│   ├── fortune-hub/       # Fortune center (aggregates all divination features)
│   ├── chat/              # AI conversation interface
│   ├── admin/             # Admin panel (notifications)
│   └── user/              # User dashboard (profile, charts, orders, settings)
├── components/            # React components by feature
│   ├── bazi/form/         # Bazi form sections
│   ├── ziwei/             # Ziwei chart display
│   ├── chat/              # Chat UI components
│   ├── layout/            # Sidebar, Header, MobileNav
│   └── ui/                # Shared UI (ThemeProvider, ThemeToggle)
├── lib/                   # Business logic
│   ├── supabase.ts        # Database client + types
│   ├── ai.ts              # AI personalities + API integration
│   ├── bazi.ts            # Bazi calculations (lunar-javascript wrapper)
│   ├── ziwei.ts           # Ziwei calculations (iztro wrapper)
│   ├── tarot.ts           # Tarot card definitions and spreads
│   ├── liuyao.ts          # I-Ching hexagrams and coin toss
│   ├── hepan.ts           # Compatibility calculations
│   ├── mbti.ts            # MBTI questions and type definitions
│   ├── fortune.ts         # Daily/monthly fortune generation
│   ├── ai-analysis.ts     # Unified AI analysis storage
│   ├── rate-limit.ts      # Distributed rate limiting
│   ├── notification.ts    # Notification system
│   ├── auth.ts            # Authentication helpers
│   └── credits.ts         # Membership/credit system
├── tests/                 # Test files (Node.js test runner)
└── types/index.ts         # Centralized TypeScript types
supabase/
├── migrations/            # SQL migration files
└── tabel_export_from_supabase.sql  # Current schema export
docs/                      # Project documentation
```

### Key Patterns

**Server vs Client Components**: Server components are default; client components marked with `'use client'` plus a brief reason comment explaining why (hooks, interactivity, etc.)

**Import Alias**: Use `@/` to resolve to `src/` (e.g., `import { supabase } from '@/lib/supabase'`)

**API Route Pattern**: Parse request → Validate → Check auth → Check credits/rate limits → Execute → Return/stream response

**Styling**: Tailwind CSS classes inline, CSS variables for theming (--accent, --foreground), gold accent (#D4AF37), light/dark theme support

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # Server-only
DEEPSEEK_API_KEY=...
GLM_API_KEY=...
RESEND_API_KEY=...                # Email notifications (optional)
```

## Coding Conventions

- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters` enforced
- Functional components only, PascalCase filenames
- Match existing file's indentation/quote style
- Keep page files thin, extract logic to feature components
- Add teaching-mode comments for hooks explaining *why* they're needed
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`
