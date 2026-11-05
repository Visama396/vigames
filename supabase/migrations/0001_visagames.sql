-- Visagames: accounts, cloud saves and leaderboards.
--
-- Run this file in the Supabase SQL editor. It is idempotent and can be
-- re-run safely. It assumes the shared `public.accounts` table already exists
-- (the same table used by ViPlay) with `id`, `username`, `display_name` and
-- `auth_id`.
--
-- Authentication uses Supabase Auth with the `${username}@app.local` fake
-- email, so `auth.uid()` is a verified identity. Accounts are still resolved
-- through `public.accounts.auth_id`.

-- ---------------------------------------------------------------------------
-- Shared auth helpers
-- ---------------------------------------------------------------------------

-- Links the current Supabase Auth user to its `accounts` row. Existing rows
-- are reused, so logging in from another device keeps the same account id.
create or replace function public.ensure_account_link(
  p_username text,
  p_display_name text
) returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
begin
  select * into v_account
  from public.accounts
  where auth_id = auth.uid();

  if v_account.id is null then
    insert into public.accounts (username, display_name, auth_id)
    values (p_username, p_display_name, auth.uid())
    returning * into v_account;
  else
    update public.accounts
    set username = p_username,
        display_name = coalesce(nullif(p_display_name, ''), display_name)
    where id = v_account.id
    returning * into v_account;
  end if;

  return v_account;
end;
$$;

-- Used during registration before the user has a session.
create or replace function public.username_taken(p_username text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.accounts where username = lower(trim(p_username))
  );
$$;

revoke all on function public.ensure_account_link(text, text) from public, anon;
grant execute on function public.ensure_account_link(text, text) to authenticated;

revoke all on function public.username_taken(text) from public;
grant execute on function public.username_taken(text) to anon, authenticated;

-- Visagames-specific helper. Keeping a separate name avoids clashing with
-- other projects that share the same database.
create or replace function public.visagames_current_account_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.accounts where auth_id = auth.uid() limit 1;
$$;

revoke all on function public.visagames_current_account_id() from public, anon;
grant execute on function public.visagames_current_account_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Per-account game progress (private)
-- ---------------------------------------------------------------------------
create table if not exists public.game_progress (
  account_id uuid not null references public.accounts (id) on delete cascade,
  game_slug text not null check (char_length(game_slug) between 1 and 64),
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (account_id, game_slug)
);

alter table public.game_progress enable row level security;

drop policy if exists "Game progress read own" on public.game_progress;
create policy "Game progress read own"
  on public.game_progress for select
  to authenticated
  using (account_id = public.visagames_current_account_id());

drop policy if exists "Game progress insert own" on public.game_progress;
create policy "Game progress insert own"
  on public.game_progress for insert
  to authenticated
  with check (account_id = public.visagames_current_account_id());

drop policy if exists "Game progress update own" on public.game_progress;
create policy "Game progress update own"
  on public.game_progress for update
  to authenticated
  using (account_id = public.visagames_current_account_id())
  with check (account_id = public.visagames_current_account_id());

drop policy if exists "Game progress delete own" on public.game_progress;
create policy "Game progress delete own"
  on public.game_progress for delete
  to authenticated
  using (account_id = public.visagames_current_account_id());

-- ---------------------------------------------------------------------------
-- Leaderboards (public read through RPCs only)
-- ---------------------------------------------------------------------------
create table if not exists public.game_scores (
  account_id uuid not null references public.accounts (id) on delete cascade,
  game_slug text not null check (char_length(game_slug) between 1 and 64),
  score bigint not null,
  detail jsonb not null default '{}'::jsonb,
  username text not null,
  display_name text not null,
  updated_at timestamptz not null default now(),
  primary key (account_id, game_slug)
);

create index if not exists idx_game_scores_leaderboard
  on public.game_scores (game_slug, score desc, updated_at asc);

alter table public.game_scores enable row level security;

-- No direct select/insert/update/delete policies: the table is only reached
-- through the SECURITY DEFINER RPCs below. This keeps account ids private
-- while still allowing public leaderboards.

-- Saves a private progress snapshot. The account is derived from auth.uid(),
-- never from client input.
create or replace function public.save_game_progress(
  p_game_slug text,
  p_progress jsonb
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.game_progress (account_id, game_slug, progress)
  select a.id, p_game_slug, coalesce(p_progress, '{}'::jsonb)
  from public.accounts a
  where a.auth_id = auth.uid()
  on conflict (account_id, game_slug) do update
    set progress = excluded.progress,
        updated_at = now();
$$;

create or replace function public.load_game_progress(p_game_slug text)
returns table (progress jsonb, updated_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select gp.progress, gp.updated_at
  from public.game_progress gp
  join public.accounts a on a.id = gp.account_id
  where a.auth_id = auth.uid()
    and gp.game_slug = p_game_slug
  limit 1;
$$;

-- Upserts the best score per account/game. `score` is always stored as
-- "higher is better"; games convert times/moves into a comparable score and
-- keep the readable breakdown in `detail`.
create or replace function public.submit_game_score(
  p_game_slug text,
  p_score bigint,
  p_detail jsonb default '{}'::jsonb
) returns public.game_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
  v_row public.game_scores;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_account
  from public.accounts
  where auth_id = auth.uid();

  if v_account.id is null then
    raise exception 'Account is not linked to this Auth user';
  end if;

  insert into public.game_scores (
    account_id, game_slug, score, detail, username, display_name
  )
  values (
    v_account.id,
    p_game_slug,
    p_score,
    coalesce(p_detail, '{}'::jsonb),
    v_account.username,
    coalesce(nullif(v_account.display_name, ''), v_account.username)
  )
  on conflict (account_id, game_slug) do update
    set score = greatest(public.game_scores.score, excluded.score),
        detail = case
          when excluded.score >= public.game_scores.score then excluded.detail
          else public.game_scores.detail
        end,
        username = excluded.username,
        display_name = excluded.display_name,
        updated_at = case
          when excluded.score >= public.game_scores.score then now()
          else public.game_scores.updated_at
        end
  returning * into v_row;

  return v_row;
end;
$$;

-- Public leaderboard reader. Returns a dense rank per game and never exposes
-- account ids or auth data.
create or replace function public.get_leaderboards(
  p_game_slugs text[] default null,
  p_limit integer default 20
) returns table (
  game_slug text,
  rank bigint,
  username text,
  display_name text,
  score bigint,
  detail jsonb,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  with ranked as (
    select
      gs.game_slug,
      row_number() over (
        partition by gs.game_slug
        order by gs.score desc, gs.updated_at asc
      ) as rank,
      gs.username,
      gs.display_name,
      gs.score,
      gs.detail,
      gs.updated_at
    from public.game_scores gs
    where p_game_slugs is null or gs.game_slug = any (p_game_slugs)
  )
  select
    ranked.game_slug,
    ranked.rank,
    ranked.username,
    ranked.display_name,
    ranked.score,
    ranked.detail,
    ranked.updated_at
  from ranked
  where ranked.rank <= greatest(1, least(coalesce(p_limit, 20), 100))
  order by ranked.game_slug, ranked.rank;
$$;

revoke all on function public.save_game_progress(text, jsonb) from public, anon;
grant execute on function public.save_game_progress(text, jsonb) to authenticated;

revoke all on function public.load_game_progress(text) from public, anon;
grant execute on function public.load_game_progress(text) to authenticated;

revoke all on function public.submit_game_score(text, bigint, jsonb) from public, anon;
grant execute on function public.submit_game_score(text, bigint, jsonb) to authenticated;

revoke all on function public.get_leaderboards(text[], integer) from public;
grant execute on function public.get_leaderboards(text[], integer) to anon, authenticated;
