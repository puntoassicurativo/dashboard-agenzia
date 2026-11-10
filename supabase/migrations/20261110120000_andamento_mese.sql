-- Dashboard di agenzia: pagina "Andamento mese" della SNC (entrate, uscite, utile, prelievi, stima tasse).
-- Scritta dall'agente agenti\cruscotto_agenzia (utile.py) con la chiave secret, che salta la RLS.
-- Dati riservati: li leggono SOLO gli utenti elencati in utile_accesso (Fabio, Claudio, Lorenzo).
-- Gli utenti in utile_accesso si aggiungono via API con la chiave secret, mai da questo file.

create table if not exists public.utile_accesso (
    user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.utile_accesso enable row level security;
drop policy if exists "utile_accesso la propria riga" on public.utile_accesso;
create policy "utile_accesso la propria riga" on public.utile_accesso
    for select to authenticated using (user_id = auth.uid());
revoke all on public.utile_accesso from anon;
grant select on public.utile_accesso to authenticated;

create table if not exists public.utile_mese (
    mese text primary key,                 -- AAAA-MM
    aggiornato_il timestamptz not null default now(),
    valori jsonb not null                  -- entrate, uscite, sotto l'utile, totali, dettaglio per voce
);
alter table public.utile_mese enable row level security;
drop policy if exists "utile_mese solo autorizzati" on public.utile_mese;
create policy "utile_mese solo autorizzati" on public.utile_mese
    for select to authenticated
    using (exists (select 1 from public.utile_accesso a where a.user_id = auth.uid()));
revoke all on public.utile_mese from anon;
grant select on public.utile_mese to authenticated;

create table if not exists public.utile_info (
    id int primary key default 1,
    aggiornato_il timestamptz not null default now(),
    valori jsonb not null                  -- stima annua delle tasse, ipotesi, cose da chiarire, da classificare
);
alter table public.utile_info enable row level security;
drop policy if exists "utile_info solo autorizzati" on public.utile_info;
create policy "utile_info solo autorizzati" on public.utile_info
    for select to authenticated
    using (exists (select 1 from public.utile_accesso a where a.user_id = auth.uid()));
revoke all on public.utile_info from anon;
grant select on public.utile_info to authenticated;
