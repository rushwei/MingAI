# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js App Router project. Routes live in `src/app`, with feature pages under `src/app/bazi`, `src/app/ziwei`, `src/app/chat`, and `src/app/user` (including `src/app/user/charts`), plus API handlers in `src/app/api`. Feature UI is in `src/components/{bazi,ziwei,chat,profile}`, shared UI/layout in `src/components/{layout,ui}`, and domain logic in `src/lib`; shared types are in `src/types` with the `@/` alias. Static assets are in `public`, global styles in `src/app/globals.css`, and docs in `docs/`.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies (`pnpm-lock.yaml` is authoritative).
- `pnpm dev`: run the local dev server on `http://localhost:3000`.
- `pnpm build`: create a production build.
- `pnpm start`: run the production build locally.
- `pnpm lint`: run ESLint.

## Coding Style & Naming Conventions
Use TypeScript and React (TSX) with functional components. Match the existing file’s indentation and quote style; avoid reformatting unrelated code. Components use PascalCase filenames, and route files follow Next.js conventions (`page.tsx`, `layout.tsx`, `route.ts`). Tailwind CSS is used for styling; add shared/global rules only in `src/app/globals.css`. Keep page files thin by extracting reusable sections into feature components under `src/components/{bazi,ziwei,chat,profile}`. Teaching-mode note: when using `useState`, `useEffect`, `useContext`, or Server Actions, add a short comment explaining why they are needed, and mark client/server components with `use client` or `use server` plus a brief reason.

## Testing Guidelines
There is no dedicated test runner yet; linting is the primary quality gate. If you add tests, use `*.test.tsx` or `*.spec.ts` under `src/` and document the new test command in `package.json`.

## Commit & Pull Request Guidelines
Use Conventional Commit-style prefixes (`feat:`, `fix:`, `chore:`) with a short summary. Keep commits focused and scoped. For PRs, include a concise description, link related issues, and add screenshots or short clips for UI changes.

## Configuration & Secrets
Client and server integrations depend on environment variables. At minimum, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. AI calls may use `DEEPSEEK_API_KEY` and `GLM_API_KEY`. Store secrets in `.env.local`, never commit them, and avoid exposing server-only keys via `NEXT_PUBLIC_`.

## Design & UX Guidance
The product targets a clean, modern, neutral look: black/white/gray surfaces with a restrained gold accent. Maintain the light/dark theme toggle, the left sidebar + main content layout on desktop, and bottom navigation on mobile. Use Lucide icons consistently and keep animations subtle.
