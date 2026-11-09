-- Sezioni a lato della dashboard di agenzia (capitolo 4 del piano): A vincolate, B ex clienti,
-- C auto sospese, D franchigie, E quietanzamento evoluto, F sinistri su premi, G controlli documentali.
-- Le righe le scrive l'agente agenti\cruscotto_agenzia con la chiave secret. Gli utenti autenticati
-- leggono tutto e possono cambiare SOLO "fatto" e "nota" (piu' chi e quando, messi dal trigger).
-- Contengono dati dei clienti (nomi, telefoni): mai aprire la lettura ad anon.

create table if not exists public.sezione_righe (
    sezione text not null,                 -- 'A', 'B', 'C', 'D', 'E', 'F', 'G'
    chiave text not null,                  -- identificativo stabile della riga (polizza, titolo, sinistro...)
    gruppo text,                           -- sotto-elenco dentro la sezione
    ordine numeric,                        -- ordinamento (es. giorni alla scadenza)
    dati jsonb not null,                   -- colonne da mostrare
    attiva boolean not null default true,  -- false quando la riga non compare piu' in BO
    prima_vista date not null default current_date,
    ultima_vista date not null default current_date,
    fatto boolean not null default false,
    nota text,
    modificato_da text,
    modificato_il timestamptz,
    primary key (sezione, chiave)
);

create table if not exists public.sezione_info (
    sezione text primary key,
    aggiornato_il timestamptz not null default now(),
    riepilogo jsonb                        -- conteggi e tabelle aggregate (F e' tutta qui)
);

create or replace function public.sezione_righe_modifica() returns trigger
    language plpgsql security definer set search_path to '' as $$
begin
    if (new.fatto is distinct from old.fatto) or (new.nota is distinct from old.nota) then
        new.modificato_il := now();
        new.modificato_da := coalesce(auth.jwt() ->> 'email', new.modificato_da);
    end if;
    return new;
end;
$$;

drop trigger if exists sezione_righe_modifica on public.sezione_righe;
create trigger sezione_righe_modifica before update on public.sezione_righe
    for each row execute function public.sezione_righe_modifica();

alter table public.sezione_righe enable row level security;
alter table public.sezione_info enable row level security;

drop policy if exists "sezioni lettura autenticati" on public.sezione_righe;
create policy "sezioni lettura autenticati" on public.sezione_righe
    for select to authenticated using (true);
drop policy if exists "sezioni fatto e nota autenticati" on public.sezione_righe;
create policy "sezioni fatto e nota autenticati" on public.sezione_righe
    for update to authenticated using (true) with check (true);
drop policy if exists "sezioni info lettura autenticati" on public.sezione_info;
create policy "sezioni info lettura autenticati" on public.sezione_info
    for select to authenticated using (true);

revoke all on public.sezione_righe from anon, authenticated;
revoke all on public.sezione_info from anon, authenticated;
grant select on public.sezione_righe to authenticated;
grant update (fatto, nota) on public.sezione_righe to authenticated;
grant select on public.sezione_info to authenticated;
