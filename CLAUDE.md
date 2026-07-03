# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**远声 / Talk To Global** — an AI founder IP copilot that helps Chinese AI founders create X/Twitter and LinkedIn content for global audiences. The core workflow: AI interviews the founder → generates a Founder Voice DNA → transcreates Chinese thinking into credible English platform posts. This is not a generic AI writing assistant.

## Commands

### Frontend (`frontend/`)

```bash
cd frontend
npm install          # install dependencies
npm run dev          # start dev server (vite dev)
npm run build        # production build
npm run build:dev    # development build
npm run preview      # preview production build
npm run lint         # eslint
npm run format       # prettier --write .
```

### Backend (`backend/`)

```bash
cd backend
supabase init              # already done — initializes Supabase project
supabase start             # start local Supabase (DB, Auth, Storage, Edge Functions)
supabase db push           # apply migrations to remote
supabase db reset          # reset local DB and re-run migrations + seeds
supabase functions serve   # serve Edge Functions locally
supabase functions deploy  # deploy Edge Functions to Supabase Cloud
```

No test runner is configured yet.

## Architecture

### Frontend (`frontend/`)

- **Framework**: TanStack Start (SSR meta-framework on TanStack Router) with React 19, Vite 8, Nitro
- **Styling**: Tailwind CSS v4 + shadcn/ui (new-york style, slate base, CSS variables). UI primitives live in `src/components/ui/` — add new ones with `npx shadcn@latest add <component>`
- **Package manager**: npm (bun.lock exists but bun is not installed)
- **State/data**: TanStack Query for server state, custom hooks for Supabase data
- **Vite config**: Uses `@lovable.dev/vite-tanstack-config` — do NOT manually add tanstackStart, viteReact, tailwindcss, tsConfigPaths, or nitro plugins; they're already included. Pass additional config via `defineConfig({ vite: { ... } })`.

### Routing

File-based routing in `src/routes/`. Key conventions:
- `index.tsx` → `/`, `home.tsx` → `/home`, `dna.tsx` → `/dna`
- `$param.tsx` → dynamic segment (bare `$`, no curly braces)
- `__root.tsx` → app shell wrapping all pages; must preserve `<Outlet />`
- `routeTree.gen.ts` is auto-generated — do not edit by hand
- Do NOT create `src/pages/` or `app/layout.tsx` — those are Next.js conventions

Current routes: `/` (index), `/home`, `/dna`, `/generate`, `/interview`, `/library`, `/profile`, `/upload`, `/sitemap.xml`. All flat files — no nested folder routes.

### Server entry

`src/server.ts` is the SSR entry (configured via `tanstackStart.server.entry`). It wraps TanStack Start's server entry with error handling for h3's swallowed errors. `src/start.ts` creates the Start instance with error middleware.

### Backend (`backend/`)

Supabase-based backend with:
- **Auth**: Email OTP / Magic Link for login
- **Database**: PostgreSQL with 8 tables (profiles, founder_dna, materials, interviews, interview_messages, contents, question_bank, hot_signals)
- **Storage**: Two buckets — `interview-audio` (voice recordings) and `materials` (uploaded files)
- **Edge Functions**: 6 serverless functions in `supabase/functions/`
  - `question-next` — fetch next interview question from question bank
  - `generate-zh` — generate 3 Chinese candidate versions via LLM
  - `generate-en` — transcreate to English for X/LinkedIn via LLM
  - `extract-dna` — extract Founder Voice DNA from interview + materials
  - `transcribe` — speech-to-text via MiMo V2.5 ASR (chat completions format, api-key auth)
  - `hot-signals` — fetch Twitter founder voice templates for content generation
- **Shared utilities** in `functions/_shared/`: `llm.ts` (LLM abstraction supporting OpenAI/Anthropic/custom), `auth.ts` (JWT verification), `cors.ts`

### Frontend hooks (`src/hooks/`)

- `useAuth.ts` — Supabase auth state (signInWithEmail, signInWithPhone, signOut)
- `useDna.ts` — Founder DNA CRUD (fetch, generate from interview, update, confirm)
- `useContents.ts` — Content library (list, filter, generate Chinese/English, save)
- `useInterview.ts` — Interview flow (start, send answer, voice answer, complete)
- `useMaterials.ts` — Material upload (text, file, URL)

### Environment variables

All sensitive values use environment variables — no hardcoded URLs or API keys in source code. See `.env.example` files for reference.

Frontend (`frontend/.env`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Edge Functions (`backend/.env.example`, set in Supabase Dashboard → Edge Functions → Secrets):
```
LLM_PROVIDER=openai          # openai | anthropic | custom
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
MIMO_ASR_API_KEY=your-mimo-api-key
MIMO_ASR_BASE_URL=https://api.xiaomimimo.com
MIMO_ASR_MODEL=mimo-v2.5-asr
```
Note: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase at runtime.

### Design system tokens

Colors are defined as CSS custom properties in `src/styles.css`. Key palette:
- Primary green: `#5a7f3d` (backgrounds, CTAs)
- Accent gold: `#f6a623` (highlights, active states)
- Background: `#f8faf5` (warm off-white)
- Card: `#ffffff`
- Muted: `#eef3e8` (borders, dividers, inactive surfaces)

Custom utilities: `card-soft`, `btn-pill`, `btn-pill-primary`. Animations: `animate-spark-float`, `animate-spark-nod`, `animate-fade-up`.

### Path aliases

`@/*` maps to `./src/*` (configured in tsconfig.json and vite config).

## Reference materials

- `material/interviewQuestions.md` — MVP interview question bank (10 questions) and Founder DNA output structure
- `material/twitter-hotpots-analysis.md` — Analysis of 10 top AI/Builder Twitter accounts with reusable founder voice patterns
- `doc/产品简介.md` — Chinese product brief
- `doc/UI-DESIGN-NOTION.md` — UI design reference with page-by-page wireframes
- `doc/Founder Voice V3(1).docx` — PRD v0.3

## Key product principles

1. **Chinese confirmation before English**: never jump from raw input to English posts; always produce Chinese candidate text first for the founder to confirm meaning and style
2. **Transcreation, not translation**: English output adapts confirmed Chinese for platform norms and overseas audiences
3. **Founder Voice DNA** is the strategic base for all generation — it includes founder profile, business objective, target audience, beliefs, voice style, content pillars
4. **No auto-publishing**: all content is prepared for user review/copying only
5. **Interview-style interaction**: AI asks follow-up questions rather than generating from prompts alone

## Mobile-first design

The app targets 390-430px mobile width. `AppLayout` centers content in a max-width container. Design style: Notion-inspired — whitespace, surface gray backgrounds, borderless inputs, collapsible blocks. Bottom tab navigation with 3 tabs: 首页 / 内容库 / 我的.
