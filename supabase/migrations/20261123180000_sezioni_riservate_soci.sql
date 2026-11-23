-- Review R001/R002/R032 (23/11/2026).
-- Lists A-L stay readable by every logged-in user (the staff works them), but the sections that hold the
-- agency's own figures are for the partners only (users in utile_accesso):
--   F   loss ratio (premiums and claims by line, producer and point of sale)
--   H   decade check (agency commissions title by title)
--   BRK broker statements (partners-only page)
-- The same condition applies to reading and to updating "fatto"/"nota".

drop policy if exists "sezioni lettura autenticati" on public.sezione_righe;
create policy "sezioni lettura autenticati" on public.sezione_righe
    for select to authenticated
    using (sezione not in ('F', 'H', 'BRK')
           or exists (select 1 from public.utile_accesso a where a.user_id = auth.uid()));

drop policy if exists "sezioni fatto e nota autenticati" on public.sezione_righe;
create policy "sezioni fatto e nota autenticati" on public.sezione_righe
    for update to authenticated
    using (sezione not in ('F', 'H', 'BRK')
           or exists (select 1 from public.utile_accesso a where a.user_id = auth.uid()))
    with check (sezione not in ('F', 'H', 'BRK')
           or exists (select 1 from public.utile_accesso a where a.user_id = auth.uid()));

drop policy if exists "sezioni info lettura autenticati" on public.sezione_info;
create policy "sezioni info lettura autenticati" on public.sezione_info
    for select to authenticated
    using (sezione not in ('F', 'H', 'BRK')
           or exists (select 1 from public.utile_accesso a where a.user_id = auth.uid()));

-- R032: trigger functions must not be callable as RPC. Postgres checks EXECUTE only when the trigger is
-- created, not when it fires, so revoking does not stop the triggers.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_update_user() from public, anon, authenticated;
revoke execute on function public.sezione_righe_modifica() from public, anon, authenticated;
revoke execute on function public.cleanup_note_attachments() from public, anon, authenticated;
revoke execute on function public.handle_contact_note_created_or_updated() from public, anon, authenticated;
-- is_admin is used inside RLS policies: logged-in users keep it, anonymous visitors do not.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
