-- Módulo Campos: Tabla y Políticas de Acceso

CREATE TABLE IF NOT EXISTS campos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    alias_comercial text,
    superficie_total numeric,
    uso text CHECK (uso IN ('agricola', 'ganadero', 'ambos')),
    provincia text,
    departamento text,
    descripcion text,
    latitud numeric,
    longitud numeric,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE campos ENABLE ROW LEVEL SECURITY;

-- Permitir lectura y escritura solo a usuarios autenticados
CREATE POLICY "Auth Read Campos" ON campos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth Insert Campos" ON campos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth Update Campos" ON campos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth Delete Campos" ON campos
  FOR DELETE TO authenticated USING (true);
