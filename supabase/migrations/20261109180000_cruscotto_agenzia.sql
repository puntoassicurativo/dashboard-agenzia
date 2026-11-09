-- Dashboard di agenzia (Punto Assicurativo, agenzia Vittoria 346): pagina principale.
-- Una riga al giorno scritta dall'agente agenti\cruscotto_agenzia sul PC di Lorenzo
-- con la chiave secret (che salta la RLS). Gli utenti autenticati leggono soltanto.
-- Nessun dato personale dei clienti in questa tabella: solo totali.

create table if not exists public.cruscotto (
    data_dati date primary key,           -- giorno a cui si riferiscono i dati BO (di solito ieri)
    aggiornato_il timestamptz not null default now(),
    valori jsonb not null,                -- i cinque numeri con confronti (vedi agente.py)
    mensile jsonb,                        -- serie degli ultimi 12 mesi per il grafico
    avvisi jsonb                          -- eventuali avvisi (scarti con Vittoria, dati mancanti)
);

alter table public.cruscotto enable row level security;

drop policy if exists "cruscotto lettura utenti autenticati" on public.cruscotto;
create policy "cruscotto lettura utenti autenticati" on public.cruscotto
    for select to authenticated using (true);

revoke all on public.cruscotto from anon;
grant select on public.cruscotto to authenticated;
