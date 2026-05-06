-- Extensión Estructural: Creador de Documentos (Informes Avanzados)

CREATE TABLE IF NOT EXISTS informes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campo_id uuid REFERENCES campos(id) ON DELETE CASCADE,
    pages_data jsonb DEFAULT '[]'::jsonb, -- Estructura rica y pesada de paginación
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE informes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth Lectura Informes" ON informes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth Inserción Informes" ON informes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth Actualización Informes" ON informes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth Borrado Informes" ON informes
  FOR DELETE TO authenticated USING (true);
