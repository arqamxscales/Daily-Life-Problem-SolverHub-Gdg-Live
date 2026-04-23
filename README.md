# Daily Life Problem Solver Hub

Beta AI web app that turns personal daily-life problems into a practical action plan, weekly steps, and a 7-day schedule.

**Beta notice:** this release uses demo login only. Real Google/email authentication is disabled for now.

## Stack

- React + TypeScript + Vite
- Tailwind CSS + Framer Motion
- Demo login session for beta access
- Local chat + plan memory for demo usage
- Gemini via server-side proxy API (`/api/*`)
- Streaming chatbot responses

## Features

- Write a real life problem + context
- Get AI-generated:
  - concise strategy summary
  - quick win
  - step-by-step action plan
  - weekly schedule
  - risk checklist
- Agent Studio with 4 modes:
   - Planner Agent
   - Coach Agent
   - Critic Agent
   - Scheduler Agent
- One-click plan upgrade using selected agent mode
- AI chatbot for plan follow-up queries and blocker guidance
- Demo login only
- Route guards + auth-only pages (`/dashboard` protected, `/auth` public)
- Streaming chat responses
- Memory across sessions (local demo mode)
- Multi-thread chat (multiple conversations per user)
- Local history fallback (always)
- Fallback smart planner when AI is unavailable

## Local setup

1. Install dependencies

   npm install

2. Create env file

   cp .env.example .env

3. Add keys in `.env`

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (server-side key, secure)
   - optional: `GEMINI_MODEL`

4. Run

   npm run dev

## Final links

- Live demo: https://daily-life-problem-solver-hub.vercel.app
- GitHub repo: https://github.com/arqamxscales/Daily-Life-Problem-SolverHub-Gdg-Live
- Release tag: https://github.com/arqamxscales/Daily-Life-Problem-SolverHub-Gdg-Live/releases/tag/v1.0.0-launch

## Database Files

- Migrations: [database/migrations/0001_initial_schema.sql](database/migrations/0001_initial_schema.sql)
- Seed SQL reference: [database/seed/seed.sql](database/seed/seed.sql)
- One-click seed script: `npm run db:seed`

## One-click seed

Use the seed script only in a trusted development or demo Supabase project.

Set these local env vars before running:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SEED_USER_ID`

Then run:

```bash
npm run db:seed
```

## Supabase schema

Create these tables in Supabase SQL editor:

```sql
create table if not exists public.problem_plans (
  id uuid primary key,
   user_id uuid references auth.users(id) on delete cascade,
  anonymous_id text not null,
  created_at timestamptz not null,
  input jsonb not null,
  output jsonb not null
);

create table if not exists public.chat_messages (
   id uuid primary key,
   user_id uuid references auth.users(id) on delete cascade not null,
   thread_id uuid not null,
   anonymous_id text not null,
   role text not null check (role in ('user', 'assistant')),
   text text not null,
   created_at timestamptz not null
);

create table if not exists public.chat_threads (
   id uuid primary key,
   user_id uuid references auth.users(id) on delete cascade not null,
   title text not null,
   created_at timestamptz not null,
   updated_at timestamptz not null
);

alter table public.chat_messages
   add constraint chat_messages_thread_fk
   foreign key (thread_id) references public.chat_threads(id) on delete cascade;
```

Recommended RLS:

```sql
alter table public.problem_plans enable row level security;
alter table public.chat_messages enable row level security;

create policy "users read own plans"
on public.problem_plans for select
using (auth.uid() = user_id);

create policy "users write own plans"
on public.problem_plans for insert
with check (auth.uid() = user_id);

create policy "users read own chat"
on public.chat_messages for select
using (auth.uid() = user_id);

create policy "users write own chat"
on public.chat_messages for insert
with check (auth.uid() = user_id);

create policy "users update own chat"
on public.chat_messages for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users read own threads"
on public.chat_threads for select
using (auth.uid() = user_id);

create policy "users write own threads"
on public.chat_threads for insert
with check (auth.uid() = user_id);

create policy "users update own threads"
on public.chat_threads for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

For anonymous inserts into plans, add an additional policy as needed.

## Refresh token hardening

- PKCE OAuth flow enabled
- Periodic session hardening runs every 60s and refreshes near-expiry tokens
- Failed refresh triggers sign-out to avoid stale/invalid session usage
main` or `master`

## Notes

- Gemini key is no longer exposed to browser code; only server-side proxy uses it.
- App remains functional in degraded mode without server AI (fallback planning + local memory).
