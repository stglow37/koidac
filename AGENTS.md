<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KOI-DAC — Project Context for AI Agents

## What this project is

KOI-DAC is a community platform for Korean competitive programming problems (KOISTUDY). It shows two independent difficulty signals side-by-side:
1. **AI rating** (`ai_tier`) — Gemini-estimated solved.ac-style tier (e.g. "Gold 4"), pre-computed by a batch script for all ~4000 KOISTUDY problems.
2. **User rating** (`avg_rating`) — crowd-sourced 1–5 votes from logged-in users.

A companion Chrome extension (in `extension/`) overlays this data on KOISTUDY pages. The extension is read-only — it only displays, never writes.

## Architecture

- **Framework**: Next.js App Router — all pages under `src/app/`
- **Language**: TypeScript + React 19
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth) — called directly from the browser except in `/api/` routes
- **AI**: Google Gemini API (`gemini-2.0-flash`) via `@google/generative-ai`
- **Deployment**: Vercel at https://koidac.vercel.app

All pages are client-side rendered (`'use client'`). No SSR or ISR.

## Database Schema

### `problems`
| column | type | notes |
|---|---|---|
| id | serial | auto PK |
| problem_id | integer | UNIQUE; KOISTUDY problem number |
| title | text | required |
| statement | text | full scraped problem text from KOISTUDY |
| ai_tier | text | e.g. `"Gold 4"` — Gemini estimate; null until batch script runs |
| ai_algorithms | text | comma-separated tags e.g. `"DP, BFS"` |
| ai_reasoning | text | one-sentence explanation from Gemini |
| created_at | timestamptz | auto |

### `votes`
| column | type | notes |
|---|---|---|
| id | serial | auto PK |
| problem_id | integer | references `problems.problem_id` (not `problems.id`) |
| user_id | text | Supabase auth uid |
| rating | integer | 1–5; UNIQUE(problem_id, user_id); duplicate → error code `23505` |

### `comments`
| column | type | notes |
|---|---|---|
| id | serial | auto PK |
| problem_id | integer | references `problems.problem_id` |
| user_id | text | Supabase auth uid |
| user_nickname | text | write-time snapshot of `user_metadata.display_name`; does NOT update on rename |
| content | text | |
| created_at | timestamptz | auto |

### `problems_with_stats` (VIEW — do not write to it)
Joins `problems` with aggregated `votes`. Adds two computed columns:
- `avg_rating: float` — average vote (0 if no votes); already a number, not a string
- `vote_count: integer`

**All read queries go through this view.** Never query the `problems` table directly in the frontend.

## Key Files

| File | Role |
|---|---|
| `src/lib/supabase.ts` | Supabase client; validates env vars |
| `src/lib/gemini.ts` | Gemini client + `rateProblem()` function + prompt |
| `src/types/index.ts` | `Problem`, `Comment`, `SortCriteria` types |
| `src/hooks/useProblems.ts` | Paginated server-side fetch from `problems_with_stats` |
| `src/app/page.tsx` | Home: auth, search/sort, pagination, voting |
| `src/app/problem/[id]/page.tsx` | Thin dynamic-route wrapper |
| `src/app/problem/[id]/ProblemClient.tsx` | Detail: AI badge, user rating, vote, comments |
| `src/app/admin/page.tsx` | Admin: delete problems/comments; no add form (batch handles that) |
| `src/components/AuthForm.tsx` | Sign-in/sign-up; nickname in `user_metadata.display_name` |
| `src/components/ProblemList.tsx` | Problem cards with AI badge + user rating badge + vote buttons |
| `src/app/api/problem/[id]/route.ts` | GET only — returns problem + ai_tier + stats for extension |
| `src/app/api/problem/bulk/route.ts` | POST — batch fetch for extension |
| `scripts/rate-problems.mjs` | Batch: scrape KOISTUDY 1–5000 → Gemini → upsert Supabase |
| `extension/` | Chrome extension source files (move manually from separate folder) |

## Type Gotchas

- `Problem.avg_rating` is a `number` (from the view), not a string. No casting needed.
- `Problem.vote_count` is a `number`.
- AI rating and user rating are **completely separate** — do not merge or average them.
- Admin auth is client-side email check — not secure, Supabase RLS not implemented.

## API Endpoints (Chrome Extension — read-only)

All endpoints include CORS headers (`Access-Control-Allow-Origin: *`).

| Method | Path | Returns |
|---|---|---|
| GET | `/api/problem/[id]` | `{problem_id, title, ai_tier, ai_algorithms, avg_rating, vote_count}` or 404 |
| POST | `/api/problem/bulk` | `{data: [{problem_id, registered, title?, ai_tier?, avg_rating?, vote_count?}][]}` |

The POST endpoint for auto-creating problems from the extension has been removed. All problems are now managed by the batch script.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anonymous/public key
NEXT_PUBLIC_ADMIN_EMAILS=       # Comma-separated admin emails (browser-visible)
GEMINI_API_KEY=                 # Google AI Studio key (server-side only, not NEXT_PUBLIC)
```

## Implemented Features (do not re-add)

- Supabase auth: sign up / sign in with email + password; nickname in `user_metadata.display_name`
- Voting 1–5 per problem; duplicate blocked by DB constraint (error `23505`)
- Server-side search (ILIKE on title + problem_id match) and sort via Supabase query
- Paginated problem list (30 per page) — `PAGE_SIZE` exported from `useProblems.ts`
- Problem detail: AI tier badge (color-coded by tier), user rating, vote buttons, comments
- Admin dashboard: view all problems with AI + user ratings, delete problems/comments
- REST API for Chrome extension (GET single + POST bulk), both include `ai_tier`
- Batch script for pre-rating all KOISTUDY problems (run offline, resumes from last position)

## What is NOT implemented yet

- Supabase RLS (Row Level Security) — admin operations are client-side only
- Running the batch script (waiting for BOJ to come back online to refine anchor examples)
- Chrome extension update to display `ai_tier` from the new API response format
