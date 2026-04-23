-- Seed data for demonstration purposes.
-- Run this only in a trusted Supabase project.
-- Replace the placeholder user_id values with a real auth.users UUID.

insert into public.chat_threads (id, user_id, title, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'Welcome thread', now(), now())
on conflict (id) do nothing;

insert into public.problem_plans (id, user_id, anonymous_id, created_at, input, output)
values
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'seed-anonymous-user',
    now(),
    '{"problem":"Improve daily productivity","context":"Seed sample record","priority":"medium","hoursPerWeek":5,"deadlineDays":14}',
    '{"summary":"Seeded example plan","quickWin":"Spend 15 minutes planning today","steps":[],"schedule":[],"risks":[]}'
  )
on conflict (id) do nothing;
