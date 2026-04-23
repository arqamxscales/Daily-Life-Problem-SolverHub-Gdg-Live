create extension if not exists "pgcrypto";

create table if not exists public.problem_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  anonymous_id text not null,
  created_at timestamptz not null default now(),
  input jsonb not null,
  output jsonb not null
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  thread_id uuid references public.chat_threads(id) on delete cascade not null,
  anonymous_id text not null,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists problem_plans_user_id_idx on public.problem_plans(user_id);
create index if not exists chat_threads_user_id_idx on public.chat_threads(user_id);
create index if not exists chat_messages_user_thread_idx on public.chat_messages(user_id, thread_id);

alter table public.problem_plans enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "users read own plans" on public.problem_plans;
create policy "users read own plans"
on public.problem_plans for select
using (auth.uid() = user_id);

drop policy if exists "users write own plans" on public.problem_plans;
create policy "users write own plans"
on public.problem_plans for insert
with check (auth.uid() = user_id);

drop policy if exists "users read own threads" on public.chat_threads;
create policy "users read own threads"
on public.chat_threads for select
using (auth.uid() = user_id);

drop policy if exists "users write own threads" on public.chat_threads;
create policy "users write own threads"
on public.chat_threads for insert
with check (auth.uid() = user_id);

drop policy if exists "users update own threads" on public.chat_threads;
create policy "users update own threads"
on public.chat_threads for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users read own chat" on public.chat_messages;
create policy "users read own chat"
on public.chat_messages for select
using (auth.uid() = user_id);

drop policy if exists "users write own chat" on public.chat_messages;
create policy "users write own chat"
on public.chat_messages for insert
with check (auth.uid() = user_id);

drop policy if exists "users update own chat" on public.chat_messages;
create policy "users update own chat"
on public.chat_messages for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
