-- 1. Tabla de Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    is_admin boolean DEFAULT false, -- Bypass total para administradores
    created_at timestamptz DEFAULT now()
);

-- 2. Tabla de Permisos (Catálogo)
CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    slug text NOT NULL UNIQUE, -- E.j: 'informes:edit'
    name text NOT NULL,        -- E.j: 'Editar Informes'
    description text,
    created_at timestamptz DEFAULT now()
);

-- 3. Tabla Intermedia: Permisos por Rol
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Tabla de Perfiles (Extensión de Auth.Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text,
    full_name text,
    role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. Función y Trigger para creación automática de perfil al registrarse
-- (Aunque el admin los cree, esta técnica asegura que siempre tengan un perfil)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RLS: Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (Lectura para autenticados, escritura solo para el rol admin)
-- Nota: Para simplificar la primera corrida, permitiremos que usuarios autenticados vean roles.
CREATE POLICY "Allow authenticated read roles" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read permissions" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read role_permissions" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read profiles" ON profiles FOR SELECT TO authenticated USING (true);

-- 7. Datos iniciales
INSERT INTO public.roles (name, is_admin) VALUES ('Administrador', true) ON CONFLICT (name) DO NOTHING;
INSERT INTO public.roles (name, is_admin) VALUES ('Visualizador', false) ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (slug, name, description) VALUES 
('campos:view', 'Ver Lotes', 'Permite visualizar los campos y mapas'),
('campos:edit', 'Editar Lotes', 'Permite crear y modificar campos'),
('informes:view', 'Ver Informes', 'Permite ver la lista de informes'),
('informes:edit', 'Gestionar Informes', 'Permite crear y editar el contenido de informes'),
('settings:manage', 'Ajustes Globales', 'Permite cambiar logos y nombres de empresa'),
('rbac:manage', 'Gestionar Roles', 'Permite crear roles y permisos')
ON CONFLICT (slug) DO NOTHING;
