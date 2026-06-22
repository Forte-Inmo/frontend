-- Tabla de exportaciones de PDF (persistentes, con tracking de estado)
create table if not exists pdf_exports (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid references informes(id) on delete cascade not null,
  user_id uuid not null,
  status text default 'pending' check (status in ('pending','rendering','cmyk','done','error')),
  storage_path text,
  error text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_pdf_exports_informe_id on pdf_exports(informe_id);
create index if not exists idx_pdf_exports_user_id on pdf_exports(user_id);
create index if not exists idx_pdf_exports_status on pdf_exports(status);

alter table pdf_exports enable row level security;

-- Usuarios pueden ver sus propias exportaciones
create policy "Users can view own exports"
  on pdf_exports for select
  using (auth.uid() = user_id);

-- Usuarios pueden insertar sus propias exportaciones
create policy "Users can insert own exports"
  on pdf_exports for insert
  with check (auth.uid() = user_id);

-- Usuarios pueden actualizar sus propias exportaciones
create policy "Users can update own exports"
  on pdf_exports for update
  using (auth.uid() = user_id);

-- Bucket de Storage para PDFs exportados (privado, acceso por URL firmada)
insert into storage.buckets (id, name, public)
values ('pdf-exports', 'pdf-exports', false)
on conflict (id) do nothing;

-- Permitir al servicio (vía service_role key) subir y leer
create policy "Service role can manage pdf-exports"
  on storage.objects for all
  using ( bucket_id = 'pdf-exports' )
  with check ( bucket_id = 'pdf-exports' );

-- Usuarios autenticados pueden leer sus propios PDFs exportados
create policy "Users can read own exports"
  on storage.objects for select
  using (
    bucket_id = 'pdf-exports'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
