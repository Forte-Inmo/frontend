-- Agrega columna operacion a campos para tipo de operacion
-- Ejecutar en el SQL Editor de Supabase:

ALTER TABLE campos 
ADD COLUMN IF NOT EXISTS operacion text CHECK (operacion IN ('venta', 'alquiler'));
