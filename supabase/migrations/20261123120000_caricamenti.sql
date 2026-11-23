-- "Carica file" page of the agency dashboard (simplification plan of 21/11/2026, P4, 23/11/2026).
-- PRIVATE bucket: the partners (users listed in utile_accesso) upload decade files, bank statements, invoices and
-- documents; the morning run on Lorenzo's PC (agenti\cruscotto_agenzia\caricamenti.py, secret key) brings them into the
-- input folders and moves them from "da_scaricare/" to "scaricati/". Nobody else can read, list or upload. Never public.

insert into storage.buckets (id, name, public, file_size_limit)
values ('caricamenti', 'caricamenti', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "caricamenti lettura soci" on storage.objects;
create policy "caricamenti lettura soci" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'caricamenti'
        and exists (select 1 from public.utile_accesso a where a.user_id = (select auth.uid()))
    );

drop policy if exists "caricamenti caricamento soci" on storage.objects;
create policy "caricamenti caricamento soci" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'caricamenti'
        and (storage.foldername(name))[1] = 'da_scaricare'
        and exists (select 1 from public.utile_accesso a where a.user_id = (select auth.uid()))
    );

-- a wrong file can be removed while it is still waiting for the morning run (not after)
drop policy if exists "caricamenti rimozione soci" on storage.objects;
create policy "caricamenti rimozione soci" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'caricamenti'
        and (storage.foldername(name))[1] = 'da_scaricare'
        and exists (select 1 from public.utile_accesso a where a.user_id = (select auth.uid()))
    );
