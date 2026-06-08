-- Tabla de Plantillas
CREATE TABLE IF NOT EXISTS plantillas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    pages_data jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE plantillas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read plantillas" ON plantillas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert plantillas" ON plantillas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update plantillas" ON plantillas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete plantillas" ON plantillas FOR DELETE TO authenticated USING (true);

-- Agregar columna default_plantilla_id a settings si no existe
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_plantilla_id uuid REFERENCES plantillas(id) ON DELETE SET NULL;
