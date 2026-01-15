# AI Model Unification + Tarot Result Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify AI model selection across non-chat features and refactor tarot into a separate result page that only saves on first card reveal.

**Architecture:** Introduce a shared client `ModelSelector` (UI + model loading + reasoning toggle) and reuse the centralized AI service (`callAI`) with membership gating. Tarot becomes a two-step flow: `/tarot` collects inputs and `/tarot/result` handles draw-only, save-on-reveal, and AI interpretation.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Supabase Auth/DB.

---

### Task 1: Create reusable ModelSelector (and wire ChatComposer to it)

**Files:**
- Create: `src/components/ui/ModelSelector.tsx`
- Modify: `src/components/chat/ChatComposer.tsx`

**Step 1: Write the failing test**
- No automated test runner exists; document a manual checklist for this task:
  - Model list loads, caches, and displays vendor icons
  - Locked models show upgrade hints
  - Reasoning toggle appears only when allowed

**Step 2: Run test to verify it fails**
- Manual check in UI is expected to fail until the component exists.

**Step 3: Write minimal implementation**
- Implement `ModelSelector` by extracting logic from `ChatComposer` (fetch `/api/models`, localStorage cache, vendor grouping, reasoning toggle logic).
- Add `compact` prop to render smaller layout for result pages.
- Update `ChatComposer` to render `ModelSelector` and remove duplicated model/reasoning UI state.

**Step 4: Run test to verify it passes**
- Run: `pnpm lint`
- Manual check: chat composer still shows model dropdown and reasoning toggle.

**Step 5: Commit**
```bash
git add src/components/ui/ModelSelector.tsx src/components/chat/ChatComposer.tsx
git commit -m "feat: add shared model selector"
```

---

### Task 2: Add model selection inputs to tarot/liuyao/hepan/mbti/bazi APIs

**Files:**
- Modify: `src/app/api/tarot/route.ts`
- Modify: `src/app/api/liuyao/route.ts`
- Modify: `src/app/api/hepan/route.ts`
- Modify: `src/app/api/mbti/route.ts`
- Modify: `src/app/api/bazi/analysis/route.ts`

**Step 1: Write the failing test**
- Manual checklist:
  - API rejects disallowed model for membership
  - API records `source_data.model_id`
  - Reasoning only enabled when allowed

**Step 2: Run test to verify it fails**
- Manual check is expected to fail until model params are respected.

**Step 3: Write minimal implementation**
- Add `modelId` and `reasoning` to request bodies for AI actions.
- Import `callAI`, `DEFAULT_MODEL_ID`, `getModelConfig`, `getEffectiveMembershipType`, `isModelAllowedForMembership`, `isReasoningAllowedForMembership`.
- Validate model access by membership; compute reasoning flags; call `callAI` using feature-specific prompts appended to `chartContext`.
- Store `model_id` and `reasoning` in `source_data` when saving conversation.

**Step 4: Run test to verify it passes**
- Run: `pnpm lint`

**Step 5: Commit**
```bash
git add src/app/api/tarot/route.ts src/app/api/liuyao/route.ts src/app/api/hepan/route.ts src/app/api/mbti/route.ts src/app/api/bazi/analysis/route.ts
git commit -m "feat: unify ai model selection across feature apis"
```

---

### Task 3: Add draw-only and save actions to tarot API

**Files:**
- Modify: `src/app/api/tarot/route.ts`

**Step 1: Write the failing test**
- Manual checklist:
  - `draw-only` returns spread + cards without DB writes
  - `save` persists tarot_readings and returns `readingId`

**Step 2: Run test to verify it fails**
- Manual check expected to fail until actions exist.

**Step 3: Write minimal implementation**
- Add `draw-only` action for non-persisted draws.
- Add `save` action to persist when user flips first card.
- Keep `spread` action for backward compatibility if needed.

**Step 4: Run test to verify it passes**
- Run: `pnpm lint`

**Step 5: Commit**
```bash
git add src/app/api/tarot/route.ts
git commit -m "feat: split tarot draw-only and save actions"
```

---

### Task 4: Create `/tarot/result` page and simplify `/tarot`

**Files:**
- Create: `src/app/tarot/result/page.tsx`
- Modify: `src/app/tarot/page.tsx`

**Step 1: Write the failing test**
- Manual checklist:
  - `/tarot` only collects question/spread and navigates to `/tarot/result`
  - `/tarot/result` draws without saving
  - First flip triggers save and returns `readingId`

**Step 2: Run test to verify it fails**
- Manual check expected to fail until routing and result page exist.

**Step 3: Write minimal implementation**
- Extract result UI from old `/tarot/page.tsx` into `/tarot/result/page.tsx`.
- Update `/tarot` to become selection-only and navigate with query params.
- Implement save-on-first-reveal logic (track `hasSaved` and `readingId`).
- Use `ModelSelector` for AI interpret calls and pass `modelId` + `reasoning`.

**Step 4: Run test to verify it passes**
- Run: `pnpm lint`

**Step 5: Commit**
```bash
git add src/app/tarot/page.tsx src/app/tarot/result/page.tsx
git commit -m "feat: split tarot into selection and result pages"
```

---

### Task 5: Integrate ModelSelector into liuyao/hepan/mbti/bazi UIs

**Files:**
- Modify: `src/app/liuyao/result/page.tsx`
- Modify: `src/app/hepan/result/page.tsx`
- Modify: `src/app/mbti/result/page.tsx`
- Modify: `src/components/bazi/result/AIWuxingAnalysis.tsx`
- Modify: `src/components/bazi/result/AIPersonalityAnalysis.tsx`

**Step 1: Write the failing test**
- Manual checklist:
  - ModelSelector renders on each page
  - API requests include `modelId` + `reasoning`

**Step 2: Run test to verify it fails**
- Manual check expected to fail until selectors are wired.

**Step 3: Write minimal implementation**
- Add `selectedModel` + `reasoningEnabled` state in each UI.
- Fetch membership info (via `getMembershipInfo`) to pass `membershipType`.
- Include `ModelSelector` and pass props; forward `modelId`/`reasoning` in API requests.

**Step 4: Run test to verify it passes**
- Run: `pnpm lint`

**Step 5: Commit**
```bash
git add src/app/liuyao/result/page.tsx src/app/hepan/result/page.tsx src/app/mbti/result/page.tsx src/components/bazi/result/AIWuxingAnalysis.tsx src/components/bazi/result/AIPersonalityAnalysis.tsx
git commit -m "feat: add model selection to result pages"
```

---

### Task 6: Show model name in HistoryDrawer and update tarot detail path

**Files:**
- Modify: `src/components/layout/HistoryDrawer.tsx`

**Step 1: Write the failing test**
- Manual checklist:
  - History items display model name when `source_data.model_id` exists
  - Tarot history links to `/tarot/result`

**Step 2: Run test to verify it fails**
- Manual check expected to fail until HistoryDrawer joins conversations.

**Step 3: Write minimal implementation**
- Include conversation relation in Supabase `select` and extract `source_data.model_id`.
- Map model id to display name with `getModelName`.
- Update tarot detail path to `/tarot/result`.

**Step 4: Run test to verify it passes**
- Run: `pnpm lint`

**Step 5: Commit**
```bash
git add src/components/layout/HistoryDrawer.tsx
git commit -m "feat: show model name in history drawer"
```

---

### Task 7: End-to-end manual verification

**Files:**
- No code changes.

**Step 1: Write the failing test**
- Manual checklist:
  - Each feature allows model selection and respects membership locks
  - Tarot saves only after first reveal
  - History shows model name for AI analyses

**Step 2: Run test to verify it fails**
- N/A (manual checks only)

**Step 3: Write minimal implementation**
- N/A

**Step 4: Run test to verify it passes**
- Run: `pnpm lint`
- Manual test flows listed above.

**Step 5: Commit**
- No commit (verification only).

---

Plan complete and saved to `docs/plans/2026-01-15-ai-model-unify-tarot-result.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
