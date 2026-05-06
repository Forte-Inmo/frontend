-- Parche a la tabla campos para soportar Perímetros de Tierra Interactivos
-- Ejecutar en el SQL Editor de Supabase:

ALTER TABLE campos 
ADD COLUMN IF NOT EXISTS coordenadas_poligono JSONB;
