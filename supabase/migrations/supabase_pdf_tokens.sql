create table pdf_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  informe_id uuid references informes(id) on delete cascade,
  used boolean default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index idx_pdf_tokens_token on pdf_tokens(token);
create index idx_pdf_tokens_informe_id on pdf_tokens(informe_id);

alter table pdf_tokens enable row level security;

create policy "Allow anon read for token validation"
  on pdf_tokens for select
  using (true);

create policy "Allow authenticated insert"
  on pdf_tokens for insert
  with check (true);

create policy "Allow authenticated update"
  on pdf_tokens for update
  using (true);