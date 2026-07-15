import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Campos from './pages/Campos';
import Informes from './pages/Informes';
import Ajustes from './pages/Ajustes';
import InformeBuilder from './pages/InformeBuilder';
import PlantillaBuilder from './pages/PlantillaBuilder';
import RenderPage from './pages/RenderPage';
import Roles from './pages/Roles';
import Usuarios from './pages/Usuarios';
import Perfil from './pages/Perfil';
import PermissionGuard from './components/PermissionGuard';

import './App.css';

const pageTitles = {
  '/': 'Forte',
  '/dashboard': 'Inicio',
  '/dashboard/campos': 'Campos',
  '/dashboard/informes': 'Informes',
  '/dashboard/perfil': 'Perfil',
  '/dashboard/ajustes': 'Ajustes',
  '/dashboard/usuarios': 'Usuarios',
  '/dashboard/roles': 'Roles',
};

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const title = pageTitles[location.pathname];
    if (title) {
      document.title = `${title} - Forte`;
    } else if (location.pathname.startsWith('/dashboard/builder/')) {
      document.title = 'Builder - Forte';
    } else if (location.pathname.startsWith('/dashboard/plantillas/')) {
      document.title = 'Plantillas - Forte';
    } else if (location.pathname.startsWith('/render/')) {
      document.title = 'Render - Forte';
    }
  }, [location]);

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login />} />

      
      {/* Rutas Privadas Globales */}
      <Route element={user ? <Outlet /> : <Navigate to="/" />}>
        
        {/* Rutas con Sidebar Decorativo */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/campos" element={<Campos />} />
          <Route path="/dashboard/informes" element={<Informes />} />
          <Route path="/dashboard/perfil" element={<Perfil />} />
          <Route element={<PermissionGuard permission="settings:manage" />}>
            <Route path="/dashboard/ajustes" element={<Ajustes />} />
          </Route>

          {/* Gestión Protegida (Solo Admin con rbac:manage) */}
          <Route element={<PermissionGuard permission="rbac:manage" />}>
            <Route path="/dashboard/usuarios" element={<Usuarios />} />
            <Route path="/dashboard/roles" element={<Roles />} />
          </Route>
        </Route>

        {/* Builder Full Screen (Fuera del Sidebar) */}
        <Route path="/dashboard/builder/:informeId" element={<InformeBuilder />} />

        {/* Plantilla Builder (Fuera del Sidebar, protegido con settings:manage) */}
        <Route element={<PermissionGuard permission="settings:manage" />}>
          <Route path="/dashboard/plantillas/:plantillaId" element={<PlantillaBuilder />} />
        </Route>

      </Route>
    </Routes>
  );
}

function App() {
  return (
    <SettingsProvider>
      <Router>
        <Routes>
          <Route path="/render/:informeId" element={<RenderPage />} />
          <Route path="/*" element={
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          } />
        </Routes>
      </Router>
    </SettingsProvider>
  );
}

export default App;
