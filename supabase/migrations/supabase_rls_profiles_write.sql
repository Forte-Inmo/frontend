-- Agrega políticas de UPDATE e INSERT en profiles para usuarios autenticados
-- Corrección: faltaban estas políticas, solo existía SELECT

CREATE POLICY "Allow authenticated update profiles" ON profiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated insert profiles" ON profiles
  FOR INSERT TO authenticated WITH CHECK (true);
