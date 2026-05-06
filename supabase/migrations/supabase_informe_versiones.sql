-- Creación de tabla para versionado de informes en PDF
create table if not exists informe_versiones (
  id uuid default gen_random_uuid() primary key,
  informe_id uuid references informes(id) on delete cascade not null,
  version_number integer not null,
  pdf_url text not null,
  pdf_path text not null,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  created_by_name text
);

-- Índice para búsquedas rápidas
create index if not exists informe_versiones_informe_id_version_idx on informe_versiones(informe_id, version_number desc);

-- RLS
alter table informe_versiones enable row level security;

create policy "Autenticados pueden ver versiones"
  on informe_versiones for select
  using (auth.role() = 'authenticated');

create policy "Autenticados pueden insertar versiones"
  on informe_versiones for insert
  with check (auth.role() = 'authenticated');

-- Creación del bucket de Storage para PDFs
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', true)
on conflict (id) do nothing;

-- Políticas de Storage para el bucket pdfs
-- Permitir lectura pública a cualquier usuario
create policy "Lectura pública de PDFs"
on storage.objects for select
using ( bucket_id = 'pdfs' );

-- Permitir a usuarios autenticados subir PDFs
create policy "Autenticados pueden subir PDFs"
on storage.objects for insert
with check ( bucket_id = 'pdfs' and auth.role() = 'authenticated' );
