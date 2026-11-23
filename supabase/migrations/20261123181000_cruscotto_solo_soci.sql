-- Review R001 follow-up (23/11/2026): the daily cruscotto row holds the agency's commissions, the premium
-- account balance and the deltas. Only partners (users in utile_accesso) open the Cruscotto pages, so only
-- they may read the table.
drop policy if exists "cruscotto lettura utenti autenticati" on public.cruscotto;
create policy "cruscotto lettura soci" on public.cruscotto
    for select to authenticated
    using (exists (select 1 from public.utile_accesso a where a.user_id = auth.uid()));
