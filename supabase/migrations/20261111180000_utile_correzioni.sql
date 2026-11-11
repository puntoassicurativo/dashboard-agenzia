-- Dashboard di agenzia, pagina "Andamento": correzioni fatte dalla dashboard (la "tendina").
-- Fabio, Claudio o Lorenzo assegnano una voce a un movimento dell'estratto conto che l'agente non riconosce, o
-- correggono una voce gia' assegnata. L'agente agenti\cruscotto_agenzia legge le correzioni attive e le applica
-- prima delle sue regole. Una riga per movimento (chiave stabile calcolata dall'agente): l'ultima scelta vince.
-- Niente delete: si annulla con annullata = true. chi e quando li mette il database, mai il browser.

create table if not exists public.utile_correzioni (
    chiave text primary key check (char_length(chiave) between 10 and 200),
    voce text not null check (char_length(voce) between 1 and 120),
    una_tantum boolean not null default false,
    nota text check (nota is null or char_length(nota) <= 300),
    chi uuid not null default auth.uid() references auth.users (id),
    quando timestamptz not null default now(),
    annullata boolean not null default false
);

-- chi e quando sempre dal database: il browser non puo' firmare a nome di un altro ne' cambiare la data
create or replace function public.utile_correzioni_firma()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if auth.uid() is not null then
        new.chi := auth.uid();
    end if;
    new.quando := now();
    return new;
end;
$$;
drop trigger if exists utile_correzioni_firma on public.utile_correzioni;
create trigger utile_correzioni_firma
    before insert or update on public.utile_correzioni
    for each row execute function public.utile_correzioni_firma();

alter table public.utile_correzioni enable row level security;
drop policy if exists "utile_correzioni lettura autorizzati" on public.utile_correzioni;
create policy "utile_correzioni lettura autorizzati" on public.utile_correzioni
    for select to authenticated
    using (exists (select 1 from public.utile_accesso a where a.user_id = auth.uid()));
drop policy if exists "utile_correzioni inserimento autorizzati" on public.utile_correzioni;
create policy "utile_correzioni inserimento autorizzati" on public.utile_correzioni
    for insert to authenticated
    with check (exists (select 1 from public.utile_accesso a where a.user_id = auth.uid()));
drop policy if exists "utile_correzioni modifica autorizzati" on public.utile_correzioni;
create policy "utile_correzioni modifica autorizzati" on public.utile_correzioni
    for update to authenticated
    using (exists (select 1 from public.utile_accesso a where a.user_id = auth.uid()))
    with check (exists (select 1 from public.utile_accesso a where a.user_id = auth.uid()));
revoke all on public.utile_correzioni from anon;
revoke all on public.utile_correzioni from authenticated;
grant select, insert, update on public.utile_correzioni to authenticated;
