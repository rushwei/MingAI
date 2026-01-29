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
- **Tarot**: 78-card Waite deck with major/minor arcana. Multiple spreads (single, three-card, love, Celtic cross). Uses `lib/tarot.ts`
- **Liuyao (六爻)**: I-Ching hexagram divination with 64 hexagrams, coin-toss algorithm, 变卦, 旺衰判定, 旬空, 伏神, 刑冲合害破. Uses `lib/liuyao.ts`
- **Hepan (合盘)**: Synastry/compatibility analysis between two Bazi charts. Types: love, business, family. Uses `lib/hepan.ts`
- **MBTI (性格测试)**: 16-type personality system with Likert scale (1-7) scoring across 4 dimensions. Uses `lib/mbti.ts`
- **Face Reading (面相分析)**: Vision AI analysis of facial features for fortune reading
- **Palm Reading (手相分析)**: Vision AI analysis of palm lines (生命线/智慧线/感情线) and hand shape

### AI Chat System
- Streaming responses via SSE using multiple AI providers: DeepSeek, GLM (via SiliconFlow), Gemini, Qwen, Kimi
- Vision models (Qwen-VL, Gemini-VL) for face/palm reading
- Deep reasoning models for complex analysis
- Chat can reference saved Bazi/Ziwei charts for context
- Per-module model selection (bazi/ziwei/tarot/liuyao/MBTI/hepan/运势)
- **Model Access by Tier**: Free (deepseek, glm-4.6), Plus (deepseek-pro, glm-4.7, gemini), Pro (DeepAI)
- **Unified AI Storage**: All AI analyses stored in `conversations` table with `source_type` discriminator (chat, bazi_wuxing, bazi_personality, tarot, liuyao, mbti, hepan, face, palm) and `source_data` JSONB for original input
- **Knowledge Base**: Supabase Postgres + pgvector + FTS + Qwen3-Reranker for RAG. Supports archiving conversations/records as knowledge sources
- **@Mentions**: Reference knowledge base, divination data (bazi/ziwei/tarot/liuyao/MBTI/hepan/face/palm/运势), or records in chat

### Database Schema
- **Schema export**: `supabase/tabel_export_from_supabase.sql`
- **Migrations log**: `supabase/migrations/*.sql`

#### Core Tables
| Table | Key Columns | Description |
|-------|-------------|-------------|
| `users` | `id`, `nickname`, `membership` (free/plus/pro), `ai_chat_count`, `is_admin`, `membership_expires_at` | User profiles with membership tier |
| `user_settings` | `user_id`, `default_bazi_chart_id`, `default_ziwei_chart_id`, `prompt_kb_ids`, `custom_instructions`, `expression_style` | Per-user preferences |
| `app_settings` | `setting_key`, `setting_value` | Global app settings (e.g., payment_paused) |
| `bazi_charts` | `id`, `user_id`, `name`, `birth_date`, `birth_time`, `calendar_type`, `chart_data` | Saved Bazi charts |
| `ziwei_charts` | `id`, `user_id`, `name`, `birth_date`, `birth_time`, `chart_data` | Saved Ziwei charts |
| `conversations` | `id`, `user_id`, `personality`, `messages`, `source_type`, `source_data` | AI chat history with source tracking |

#### Divination Tables (all link to `conversations` via `conversation_id`)
| Table | Key Columns |
|-------|-------------|
| `tarot_readings` | `spread_id`, `question`, `cards` (JSONB) |
| `liuyao_divinations` | `question`, `hexagram_code`, `changed_hexagram_code`, `changed_lines` |
| `hepan_charts` | `type` (love/business/family), `person1_*`, `person2_*`, `compatibility_score` |
| `mbti_readings` | `mbti_type`, `scores`, `percentages` |
| `face_readings` | `analysis_type` |
| `palm_readings` | `analysis_type`, `hand_type` (left/right/both) |

#### AI Model Management Tables
| Table | Key Columns | Description |
|-------|-------------|-------------|
| `ai_models` | `model_key`, `display_name`, `vendor`, `required_tier`, `supports_reasoning`, `supports_vision` | AI model registry |
| `ai_model_sources` | `model_id`, `source_key`, `api_url`, `api_key_env_var`, `is_active`, `priority` | Multi-provider sources per model |
| `ai_model_stats` | `model_key`, `source_key`, `date`, `call_count`, `success_count`, `total_tokens_used` | Usage analytics |

#### Other Tables
- **Community**: `community_posts`, `community_comments`, `community_votes`, `community_reports`, `community_anonymous_mapping`
- **Records**: `ming_records` (events), `ming_notes` (daily notes)
- **Gamification**: `user_levels`, `daily_checkins`, `credit_transactions`, `user_achievements`
- **System**: `rate_limits`, `notifications`, `feature_subscriptions`, `login_attempts`, `orders`, `activation_keys`, `purchase_links`
- **Reminders**: `reminder_subscriptions`, `scheduled_reminders`, `annual_reports`
- **Knowledge Base**: `knowledge_bases`, `knowledge_entries` (with pgvector embeddings), `archived_sources`

### Membership & Credits
- **Free**: 3 AI credits max, +1 daily restore, basic models (deepseek, glm-4.6, kimi)
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
│   ├── admin/             # Admin panel (ai-services, payment, notifications)
│   ├── community/         # 命理社区 (anonymous posts, comments, voting)
│   ├── records/           # 命理记账 (event records, daily notes)
│   └── user/              # User dashboard (profile, charts, orders, settings, achievements, knowledge-base, ai-settings)
├── components/            # React components by feature
│   ├── admin/             # Admin panels (AIModelPanel, AISourcePanel, AIStatsPanel, KeyManagementPanel, etc.)
│   ├── bazi/form/         # Bazi form sections
│   ├── ziwei/             # Ziwei chart display
│   ├── chat/              # Chat UI (MentionPopover, MentionBadge, SourceBadge, SourcePanel)
│   ├── knowledge-base/    # Knowledge base management UI
│   ├── layout/            # Sidebar, Header, MobileNav
│   └── ui/                # Shared UI (ThemeProvider, ThemeToggle)
├── lib/                   # Business logic
│   ├── supabase.ts        # Browser-side Supabase client + types
│   ├── supabase-server.ts # Server-side service role client
│   ├── api-utils.ts       # API route helpers (auth, responses)
│   ├── ai.ts              # AI personalities + API integration
│   ├── ai-access.ts       # Model access control by membership tier
│   ├── ai-config.ts       # AI model configuration
│   ├── ai-providers/      # Provider integrations (OpenAI-compatible, Gemini, Vision)
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
│   ├── auth.ts            # Authentication helpers (OTP, login, profile)
│   ├── credits.ts         # Credit consumption/restoration
│   ├── membership.ts      # Membership tier logic
│   ├── activation-keys.ts # Activation key management
│   ├── cache.ts           # Memory/localStorage/sessionStorage caching
│   ├── retry.ts           # Exponential backoff retry
│   ├── validation.ts      # Field validation helpers
│   ├── token-utils.ts     # Token counting and truncation
│   ├── pagination.ts      # Pagination parameter parsing
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

### Admin System

Admin pages (`/admin/*`) require `is_admin=true` in the `users` table. All admin API routes use `requireAdminUser()` or `requireAdminContext()` middleware.

#### Admin Pages
| Path | Component | Description |
|------|-----------|-------------|
| `/admin/ai-services` | Multi-tab | AI model management, source switching, usage stats |
| `/admin/payment` | Multi-tab | Payment pause toggle, activation keys, purchase links |
| `/admin/notifications` | Single | Batch feature launch notifications |

#### Admin Components (`src/components/admin/`)
| Component | Features |
|-----------|----------|
| `AIModelPanel` | Enable/disable models, set tier requirements, adjust temperature/max_tokens, switch active sources |
| `AISourcePanel` | Add/remove API sources per model, configure provider URLs and env vars, set priority |
| `AIStatsPanel` | View call counts, success rates, token usage, daily trends (7/14/30 days) |
| `KeyManagementPanel` | Batch create activation keys (membership or credits), view/filter/delete keys |
| `PurchaseLinkPanel` | Configure Plus/Pro/Credits purchase URLs |
| `PaymentPausePanel` | Global payment system on/off switch |
| `NotificationLaunchPanel` | Template-based batch notifications with variable substitution |

#### Admin API Routes
```
GET/POST   /api/admin/ai-models              # List/create models
PATCH/DEL  /api/admin/ai-models/[id]         # Update/delete model
GET/POST   /api/admin/ai-models/[id]/sources # List/add sources
POST/PATCH/DEL /api/admin/ai-models/[id]/sources/[sourceId] # Activate/update/delete source
GET        /api/admin/ai-models/stats        # Usage statistics
POST       /api/admin/ai-models/cache        # Clear config cache
GET/POST   /api/activation-keys              # List/create keys (admin) or activate (user)
DELETE     /api/activation-keys              # Delete keys
GET/POST   /api/payment-status               # Check/toggle payment pause
POST       /api/notifications/launch         # Batch send notifications
```

### Reusable Utilities

#### API Utilities (`lib/api-utils.ts`)
Standard helpers for API route handlers:
```typescript
createRequestSupabaseClient()  // Server-side Supabase client from cookies
getAuthContext(request)        // Get user from Bearer token or session
requireUserContext(request)    // Require authenticated user, return { supabase, user } or error
requireAdminUser(request)      // Require admin user (Bearer token)
requireAdminContext(request)   // Require admin user (session + RLS bypass)
getServiceRoleClient()         // Service role client (bypasses RLS)
jsonError(message, status)     // Standardized error response
jsonOk(payload, status)        // Standardized success response
```

#### Authentication (`lib/auth.ts`)
```typescript
signInWithEmail() / signUpWithEmail() / signOut()
getCurrentUser() / getSession() / getUserProfile()
sendOTP() / verifyOTP() / resetPasswordWithOTP()
checkLoginAttempts() / recordLoginAttempt()
signInWithEmailProtected()     // Login with attempt limiting
```

#### Credits & Membership (`lib/credits.ts`, `lib/membership.ts`)
```typescript
getUserCreditInfo() / getCredits() / useCredit() / addCredits() / hasCredits()
restoreUserCredits() / restoreAllCredits()  // For cron jobs
getMembershipInfo() / upgradeMembership() / purchaseCredits()
getCreditLimit(membership)     // Get max credits for tier
```

#### Rate Limiting (`lib/rate-limit.ts`)
```typescript
checkRateLimit(identifier, endpoint, maxRequests, windowMs)
getClientIP(request)           // Extract IP from headers
```

#### Caching (`lib/cache.ts`)
```typescript
createMemoryCache<T>(ttlMs)    // In-memory cache with TTL
createSingleFlight<T>()        // Deduplicate concurrent requests
readLocalCache() / writeLocalCache()   // localStorage with expiration
readSessionJSON() / writeSessionJSON() // sessionStorage helpers
```

#### Token Utilities (`lib/token-utils.ts`)
```typescript
countTokens(text)              // Estimate tokens (Chinese/English aware)
truncateToTokens(text, max)    // Truncate to token limit
countMessageTokens(messages)   // Count tokens in message array
```

#### Validation (`lib/validation.ts`)
```typescript
hasNonEmptyStrings(obj, fields)  // Check required fields exist
missingFields(obj, fields)       // List missing/empty fields
missingSearchParams(params, keys) // List missing URL params
```

#### Other Utilities
| Module | Functions |
|--------|-----------|
| `lib/retry.ts` | `withRetry(fn, options)` - Exponential backoff retry |
| `lib/pagination.ts` | `parsePagination(params)` - Parse page/limit params |
| `lib/ai-analysis.ts` | `createAIAnalysisConversation()` - Store AI results with source tracking |
| `lib/notification.ts` | `getUnreadCount()`, `markAsRead()`, `getNotificationTemplate()` |
| `lib/source-tracker.ts` | `SourceTracker` class - Track data sources injected into prompts |
| `lib/mentions.ts` | `parseMentions()`, `searchMentionTargets()` - @mention resolution |
| `lib/prompt-builder.ts` | Build prompts with knowledge base, chart context, mentions |

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
NVIDIA_API_KEY=...                # Kimi, GLM-4.7, DeepSeek
GLM_API_KEY=...                   # GLM-4.6 via SiliconFlow
GLM_PRO_API_KEY=...               # GLM-4.7 (Plus tier)
GEMINI_API_KEY=...                # Gemini models
GEMINI_VL_API_KEY=...             # Gemini vision models
QWEN_API_KEY=...                  # Qwen models
QWEN_VL_API_KEY=...               # Qwen vision models (face/palm reading)
DEEPAI_API_KEY=...                # DeepAI models (Pro tier only)

# Knowledge Base
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
