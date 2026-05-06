-- 1. Crear la tabla de Ajustes Globales (Soportando 2 inombilarias)
CREATE TABLE IF NOT EXISTS platform_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Fuerza que solo exista una fila id = 1
  website_name text DEFAULT 'Plataforma Forte',
  background_url text,
  
  -- Inmobiliaria 1
  org1_name text DEFAULT 'Inmobiliaria 1',
  org1_logo_url text,
  org1_address text,
  org1_phone text,
  
  -- Inmobiliaria 2
  org2_name text DEFAULT 'Inmobiliaria 2',
  org2_logo_url text,
  org2_address text,
  org2_phone text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Insertar fila inicial por defecto
INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer la configuracion (necesario para la pantalla de Login pública)
CREATE POLICY "Public Read Settings" ON platform_settings
  FOR SELECT TO public USING (true);

-- Solo los usuarios autenticados pueden modificar los ajustes
CREATE POLICY "Auth Update Settings" ON platform_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 4. Crear el Bucket de Storage público para alojar las imagenes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', true) 
ON CONFLICT (id) DO NOTHING;

-- Dar politicas de visibilidad a los archivos de storage
CREATE POLICY "Public Assets View" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'assets');

-- Dar poder de subida/actualización a los usuarios autenticados
CREATE POLICY "Auth Assets Insert Update" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'assets') WITH CHECK (bucket_id = 'assets');
