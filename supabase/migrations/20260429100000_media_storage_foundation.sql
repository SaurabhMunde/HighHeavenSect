-- Media storage foundation: anonymous gallery submissions with admin approval.

create table if not exists public.media_uploads (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'gallery_image'
    check (kind in ('gallery_image', 'document')),
  display_name text not null
    check (char_length(trim(display_name)) between 2 and 50),
  title text not null default '',
  caption text not null default '',
  original_filename text not null default '',
  mime_type text not null,
  size_bytes int not null
    check (size_bytes > 0 and size_bytes <= 12582912),
  private_bucket text not null,
  private_path text not null unique,
  public_bucket text,
  public_path text,
  width int,
  height int,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  uploaded_ip_hash text,
  user_agent text not null default '',
  review_note text not null default '',
  approved_by_user_id uuid references auth.users on delete set null,
  approved_at timestamptz,
  rejected_by_user_id uuid references auth.users on delete set null,
  rejected_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists media_uploads_status_created_idx
  on public.media_uploads (status, created_at desc);

create index if not exists media_uploads_kind_status_idx
  on public.media_uploads (kind, status, created_at desc);

create index if not exists media_uploads_ip_created_idx
  on public.media_uploads (uploaded_ip_hash, created_at desc);

alter table public.media_uploads enable row level security;

create policy "media_uploads_public_or_admin_select"
  on public.media_uploads
  for select
  using (status = 'approved' or public.is_admin());

create policy "media_uploads_admin_insert"
  on public.media_uploads
  for insert
  with check (public.is_admin());

create policy "media_uploads_admin_update"
  on public.media_uploads
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "media_uploads_admin_delete"
  on public.media_uploads
  for delete
  using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'gallery-submissions',
  'gallery-submissions',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
where not exists (
  select 1 from storage.buckets where id = 'gallery-submissions'
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'gallery-public',
  'gallery-public',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
where not exists (
  select 1 from storage.buckets where id = 'gallery-public'
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'document-submissions',
  'document-submissions',
  false,
  12582912,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
where not exists (
  select 1 from storage.buckets where id = 'document-submissions'
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'document-public',
  'document-public',
  true,
  12582912,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
where not exists (
  select 1 from storage.buckets where id = 'document-public'
);

create policy "gallery_public_bucket_read"
  on storage.objects
  for select
  using (bucket_id = 'gallery-public');

create policy "document_public_bucket_read"
  on storage.objects
  for select
  using (bucket_id = 'document-public');
