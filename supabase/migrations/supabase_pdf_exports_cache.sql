-- Cache de exportaciones: permite reutilizar un PDF ya generado cuando no hubo cambios.
-- Ejecutar en el SQL Editor de Supabase.

-- Tipo de export para distinguir PDF normal vs revista A3
alter table pdf_exports add column if not exists format text;

-- settings no tiene updated_at definido en migraciones; asegurarlo
alter table settings add column if not exists updated_at timestamptz default now();

-- campos: en producción no tenía la columna, asegurarla también
alter table campos add column if not exists updated_at timestamptz default now();

-- Función genérica para mantener updated_at al día
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers: cualquier UPDATE en estas tablas marca el cambio y por lo tanto
-- invalida las exportaciones previas del informe afectado
drop trigger if exists trg_informes_updated_at on informes;
create trigger trg_informes_updated_at
  before update on informes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_campos_updated_at on campos;
create trigger trg_campos_updated_at
  before update on campos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_settings_updated_at on settings;
create trigger trg_settings_updated_at
  before update on settings
  for each row execute function public.set_updated_at();