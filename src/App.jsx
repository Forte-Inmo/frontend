import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Campos from './pages/Campos';
import Informes from './pages/Informes';
import Ajustes from './pages/Ajustes';
import InformeBuilder from './pages/InformeBuilder';
import Roles from './pages/Roles';
import Usuarios from './pages/Usuarios';
import Perfil from './pages/Perfil';
import PermissionGuard from './components/PermissionGuard';

import './App.css';

function AppRoutes() {
  const { user } = useAuth();

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

      </Route>
    </Routes>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
