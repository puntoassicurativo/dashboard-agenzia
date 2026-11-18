-- Agency dashboard, page "Chiedi alle condizioni" (single plan of 18/11/2026, P6).
-- A colleague writes a question on the Vittoria policy conditions; the Telegram bot process on Lorenzo's PC picks the
-- 'nuova' rows with the service key, answers with the same library and citations, and writes the answer back.
-- The Claude API key never leaves the PC. Every user reads and inserts only their own questions; only the service key
-- (which bypasses RLS) changes state, answer and cost.

create table if not exists public.domande_condizioni (
    id bigint generated always as identity primary key,
    utente uuid not null default auth.uid() references auth.users (id),
    domanda text not null check (char_length(domanda) between 3 and 2000),
    stato text not null default 'nuova' check (stato in ('nuova', 'in_corso', 'risposta', 'errore')),
    risposta text,
    creata_il timestamptz not null default now(),
    risposta_il timestamptz,
    costo_usd numeric(10, 4)
);
create index if not exists domande_condizioni_utente on public.domande_condizioni (utente, creata_il desc);
create index if not exists domande_condizioni_nuove on public.domande_condizioni (stato) where stato = 'nuova';

-- user and time always from the database: the browser cannot write in someone else's name or fill the answer
create or replace function public.domande_condizioni_firma()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if auth.uid() is not null then
        new.utente := auth.uid();
        new.stato := 'nuova';
        new.risposta := null;
        new.risposta_il := null;
        new.costo_usd := null;
        new.creata_il := now();
    end if;
    return new;
end;
$$;
drop trigger if exists domande_condizioni_firma on public.domande_condizioni;
create trigger domande_condizioni_firma
    before insert on public.domande_condizioni
    for each row execute function public.domande_condizioni_firma();

alter table public.domande_condizioni enable row level security;
drop policy if exists "domande_condizioni lettura proprie" on public.domande_condizioni;
create policy "domande_condizioni lettura proprie" on public.domande_condizioni
    for select to authenticated
    using (utente = auth.uid());
drop policy if exists "domande_condizioni inserimento proprie" on public.domande_condizioni;
create policy "domande_condizioni inserimento proprie" on public.domande_condizioni
    for insert to authenticated
    with check (utente = auth.uid());
revoke all on public.domande_condizioni from anon;
revoke all on public.domande_condizioni from authenticated;
grant select, insert on public.domande_condizioni to authenticated;
