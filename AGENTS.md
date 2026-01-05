# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js App Router project. Core routes and server components live in `src/app`, including API handlers in `src/app/api` (`route.ts`) and feature pages like `src/app/bazi`, `src/app/chat`, and `src/app/user`. Shared UI/layout pieces live in `src/components`, while domain logic (AI, auth, Supabase, membership) lives in `src/lib`. Shared types are in `src/types`, with the `@/` path alias mapped to `src/`. Static assets are in `public`, global styles in `src/app/globals.css`, and product docs in `docs/` (PRD, design).

## Build, Test, and Development Commands
- `pnpm install`: install dependencies (preferred; `pnpm-lock.yaml` is authoritative).
- `pnpm dev`: run the local dev server on `http://localhost:3000`.
- `pnpm build`: create a production build.
- `pnpm start`: run the production build locally.
- `pnpm lint`: run ESLint (Next.js core web vitals + TypeScript rules).

## Coding Style & Naming Conventions
Use TypeScript and React (TSX) with 2-space indentation, matching the existing files. Prefer double quotes for strings (see `src/app/page.tsx`). Components use PascalCase filenames (e.g., `src/components/layout/Header.tsx`). Route files follow Next.js conventions: `page.tsx`, `layout.tsx`, and `route.ts`. Tailwind CSS is used for styling; add shared/global rules only in `src/app/globals.css`. Teaching-mode note: when using `useState`, `useEffect`, `useContext`, or Server Actions, add a short comment explaining why it is needed, and clearly mark client components with `use client` (or `use server` where applicable).

## Testing Guidelines
There is no dedicated test runner configured yet; linting is the primary quality gate. If you add tests, use a clear naming pattern like `*.test.tsx` or `*.spec.ts` under the relevant feature area in `src/`, and document the new test command in `package.json`.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commit-style prefixes (`feat:`, `fix:`) with a short, descriptive summary. Keep commits focused and scoped. For PRs, include a concise description, link related issues, and add screenshots or short clips for UI changes.

## Configuration & Secrets
Client and server integrations depend on environment variables. At minimum, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. AI calls may use `DEEPSEEK_API_KEY`, `GLM_API_KEY`, and optionally `GLM_API_BASE_URL`. Store secrets in `.env.local`, never commit them, and avoid exposing server-only keys via `NEXT_PUBLIC_`.

## Design & UX Guidance
The product targets a clean, modern, neutral look: black/white/gray surfaces with a restrained gold accent. Maintain the light/dark theme toggle, the left sidebar + main content layout on desktop, and bottom navigation on mobile. Use Lucide icons consistently and keep animations subtle and purposeful.
