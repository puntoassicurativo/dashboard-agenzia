-- Dashboard di agenzia, pagina "Andamento mese": blocchi nuovi (mese virtuoso dal foglio Saldi, contatore dell'anno,
-- partite non assicurative, utile fiscale, estratti letti, flussi, riepilogo per il commercialista).
-- Una sola tabella per tutti i blocchi: tipo + mese (AAAA-MM, oppure AAAA per l'anno, oppure una chiave fissa).
-- Scritta dall'agente agenti\cruscotto_agenzia con la chiave secret, che salta la RLS.
-- Dati riservati: li leggono SOLO gli utenti elencati in utile_accesso, come utile_mese.

create table if not exists public.andamento_blocchi (
    tipo text not null,
    mese text not null,
    valori jsonb not null,
    aggiornato_il timestamptz not null default now(),
    primary key (tipo, mese)
);
alter table public.andamento_blocchi enable row level security;
drop policy if exists "andamento_blocchi solo autorizzati" on public.andamento_blocchi;
create policy "andamento_blocchi solo autorizzati" on public.andamento_blocchi
    for select to authenticated
    using (exists (select 1 from public.utile_accesso a where a.user_id = auth.uid()));
revoke all on public.andamento_blocchi from anon;
revoke all on public.andamento_blocchi from authenticated;
grant select on public.andamento_blocchi to authenticated;
