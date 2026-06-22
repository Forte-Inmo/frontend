-- Agrega columna tipo a campos para clasificar establecimientos
-- Ejecutar en el SQL Editor de Supabase:

ALTER TABLE campos 
ADD COLUMN IF NOT EXISTS tipo text CHECK (tipo IN ('agricola', 'ganadero', 'mixto', 'coto de caza', 'otro'));

ALTER TABLE campos 
ADD COLUMN IF NOT EXISTS tipo_personalizado text;
