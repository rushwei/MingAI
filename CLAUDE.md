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
- **Bazi (Four Pillars)**: Uses `lunar-javascript` library for calculating 天干地支, 五行, 十神. Includes blind Bazi (盲派) analysis with 六十甲子惊天客 formulas
- **Ziwei Doushu (Purple Star Astrology)**: Uses `iztro` library for palace positions, star distributions, 四化, and 运限 analysis
- **Tarot (塔罗牌)**: 78-card Waite deck with major/minor arcana. Multiple spreads (single, three-card, love, Celtic cross). Uses `lib/tarot.ts`
- **Liuyao (六爻)**: I-Ching hexagram divination with 64 hexagrams, coin-toss algorithm, 变卦, 旺衰判定, 旬空, 伏神, 刑冲合害破. Uses `lib/liuyao.ts`
- **Hepan (合盘)**: Synastry/compatibility analysis between two Bazi charts. Types: love, business, family. Uses `lib/hepan.ts`
- **MBTI (性格测试)**: 16-type personality system with Likert scale (1-7) scoring across 4 dimensions. Uses `lib/mbti.ts`
- **Face Reading (面相分析)**: Vision AI analysis of facial features for fortune reading
- **Palm Reading (手相分析)**: Vision AI analysis of palm lines (生命线/智慧线/感情线) and hand shape

### AI Chat System
- Streaming responses via SSE using multiple AI providers: DeepSeek, GLM (via SiliconFlow/硅基流动), Gemini, Qwen
- Vision models (Qwen-VL, Gemini-VL) for face/palm reading
- Deep reasoning models for complex analysis
- Chat can reference saved Bazi/Ziwei charts for context
- Per-module model selection (八字/紫微/塔罗/六爻/MBTI/合盘/运势)
- **Model Access by Tier**: Free (deepseek, glm-4.6), Plus (deepseek-pro, glm-4.7, gemini), Pro (DeepAI全系列)
- **Unified AI Storage**: All AI analyses stored in `conversations` table with `source_type` discriminator (chat, bazi_wuxing, bazi_personality, tarot, liuyao, mbti, hepan, face, palm) and `source_data` JSONB for original input
- **Knowledge Base**: Supabase Postgres + pgvector + FTS + Qwen3-Reranker for RAG. Supports archiving conversations/records as knowledge sources
- **@Mentions**: Reference knowledge base, divination data (八字/紫薇/塔罗/六爻/面相/手相/MBTI/合盘/运势), or records in chat

### Database Schema
- **Schema export**: `supabase/tabel_export_from_supabase.sql` (note: filename has typo)
- **Migrations**: `supabase/migrations/*.sql`
- **Core tables**: `users` (with `is_admin`, `ai_chat_count`, `membership`), `user_settings` (with `default_bazi_chart_id`, `default_ziwei_chart_id`, `prompt_kb_ids`), `app_settings`, `bazi_charts`, `ziwei_charts`, `conversations`
- **Divination tables**: `tarot_readings`, `liuyao_divinations`, `hepan_charts`, `mbti_readings`, `palm_readings`, `face_readings` (all link to `conversations` via `conversation_id`)
- **Community tables**: `community_posts`, `community_comments`, `community_votes`, `community_reports`, `community_anonymous_mapping`
- **Records tables**: `ming_records` (events), `ming_notes` (daily notes)
- **Gamification tables**: `user_levels`, `daily_checkins`, `credit_transactions`, `user_achievements`
- **System tables**: `rate_limits`, `notifications`, `feature_subscriptions`, `login_attempts`, `orders`, `reminder_subscriptions`, `scheduled_reminders`, `annual_reports`
- **Knowledge Base tables (Phase 8)**: `knowledge_bases`, `knowledge_chunks` (with pgvector embeddings), `archived_sources`

### Membership & Credits
- **Free**: 3 AI credits max, +1 daily restore, basic models (deepseek, glm-4.6)
- **Plus**: 50 credits max, +50 initial, +5 daily restore, reasoning models (deepseek-pro, glm-4.7, gemini)
- **Pro**: 200 credits max, +200 initial, +1 hourly restore, all models including DeepAI
- **Pay-per-use**: ¥9.9 = 1 credit (doesn't change membership tier)
- Rate limiting via Supabase `rate_limits` table (IP + endpoint tracking)
- Credit restoration via GitHub Actions (daily for Free/Plus, hourly for Pro)

### Gamification System
- **Levels**: 8-tier growth system with titles
- **Experience**: Earned from various activities
- **Check-ins**: 7-day/30-day reward cycles
- **Achievements**: Behavior-based unlocks

### Scheduled Tasks (GitHub Actions)
- **Daily**: Credit restoration for Free/Plus users, solar term reminders
- **Hourly**: Credit restoration for Pro users, fortune alerts, key date reminders
- **On-demand**: Admin notification broadcasts, annual report generation

### Project Structure
```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                # API routes (chat, tarot, liuyao, hepan, mbti, bazi, ziwei, face, palm, credits, membership, notifications, reminders, knowledge-base, data-sources, dream)
│   ├── bazi/              # Bazi form + results pages
│   ├── ziwei/             # Ziwei form + results pages
│   ├── tarot/             # Tarot card draws
│   ├── liuyao/            # I-Ching divination
│   ├── hepan/             # Compatibility analysis
│   ├── mbti/              # Personality testing
│   ├── face/              # Face reading (面相分析)
│   ├── palm/              # Palm reading (手相分析)
│   ├── dream/             # Dream interpretation (周公解梦)
│   ├── daily/             # Daily fortune
│   ├── monthly/           # Monthly fortune
│   ├── fortune-hub/       # Fortune center (aggregates all divination features)
│   ├── chat/              # AI conversation interface
│   ├── admin/             # Admin panel (notifications, reports, activation keys)
│   ├── community/         # 命理社区 (anonymous posts, comments, voting)
│   ├── records/           # 命理记账 (event records, daily notes)
│   └── user/              # User dashboard (profile, charts, orders, settings, achievements, knowledge-base, ai-settings)
├── components/            # React components by feature
│   ├── bazi/form/         # Bazi form sections
│   ├── ziwei/             # Ziwei chart display
│   ├── chat/              # Chat UI (MentionPopover, MentionBadge, SourceBadge, SourcePanel)
│   ├── knowledge-base/    # Knowledge base management UI
│   ├── layout/            # Sidebar, Header, MobileNav
│   └── ui/                # Shared UI (ThemeProvider, ThemeToggle)
├── lib/                   # Business logic
│   ├── supabase.ts        # Database client + types
│   ├── ai.ts              # AI personalities + API integration
│   ├── ai-access.ts       # Model access control by membership tier
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
│   ├── reminders.ts       # Push reminders (节气/运势/关键日)
│   ├── gamification.ts    # Levels, check-ins, achievements
│   ├── auth.ts            # Authentication helpers
│   ├── credits.ts         # Membership/credit system
│   ├── activation-keys.ts # Activation key management
│   ├── knowledge-base/    # Knowledge base (ingest, search, embeddings)
│   ├── data-sources/      # Unified data source access for AI
│   ├── mentions.ts        # @mention parsing and resolution
│   ├── prompt-builder.ts  # Dynamic prompt construction with context
│   └── source-tracker.ts  # Track data sources used in AI responses
├── tests/                 # Test files (Node.js test runner)
└── types/index.ts         # Centralized TypeScript types
supabase/
├── migrations/            # SQL migration files
├── functions/             # Supabase Edge Functions
└── tabel_export_from_supabase.sql  # Current schema export
docs/                      # Project documentation
android/                   # Capacitor Android app
ios/                       # Capacitor iOS app
```

### Mobile Development (Capacitor)
```bash
pnpm build                 # Build web assets first
npx cap sync               # Sync web assets to native projects
npx cap open android       # Open Android Studio
npx cap open ios           # Open Xcode
```

### Key Patterns

**Server vs Client Components**: Server components are default; client components marked with `'use client'` plus a brief reason comment explaining why (hooks, interactivity, etc.)

**Import Alias**: Use `@/` to resolve to `src/` (e.g., `import { supabase } from '@/lib/supabase'`)

**API Route Pattern**: Parse request → Validate → Check auth → Check credits/rate limits → Execute → Return/stream response

**Styling**: Tailwind CSS classes inline, CSS variables for theming (--accent, --foreground), gold accent (#D4AF37), light/dark theme support

## Environment Variables

Required in `.env.local` (see `.env.example` for full list):
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # Server-only
SUPABASE_DB_URL=...               # Edge Function direct DB (for vector index)

# AI Models - each has _API_KEY, _API_URL, _MODEL_ID, _MODEL_NAME
DEEPSEEK_API_KEY=...              # DeepSeek via SiliconFlow
DEEPSEEK_PRO_API_KEY=...          # DeepSeek official (Pro tier)
GLM_API_KEY=...                   # GLM-4.6 via SiliconFlow
GLM_PRO_API_KEY=...               # GLM-4.7 (Plus tier)
GEMINI_API_KEY=...                # Gemini models
GEMINI_VL_API_KEY=...             # Gemini vision models
QWEN_API_KEY=...                  # Qwen models
QWEN_VL_API_KEY=...               # Qwen vision models (face/palm reading)
DEEPAI_API_KEY=...                # DeepAI models (Pro tier only)

# Knowledge Base (Phase 8)
QWEN_EMBEDDING_API_KEY=...        # text-embedding-v4
QWEN_RERANK_API_KEY=...           # qwen3-rerank
VECTOR_SEARCH_ENABLED=false

# Optional
DIFY_API_KEY=...                  # Dify workflow (attachments/search)
INTERNAL_API_SECRET=...           # Server-side auth bypass
RESEND_API_KEY=...                # Email notifications
```

## Coding Conventions

- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters` enforced
- Functional components only, PascalCase filenames
- Match existing file's indentation/quote style
- Keep page files thin, extract logic to feature components
- Add teaching-mode comments for hooks explaining *why* they're needed
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`
