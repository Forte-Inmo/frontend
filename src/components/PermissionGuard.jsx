import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Componente para proteger rutas basadas en permisos específicos.
 * @param {string} permission - El slug del permiso requerido.
 */
export default function PermissionGuard({ permission }) {
  const { hasPermission, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full w-full py-20">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!hasPermission(permission)) {
    // Si no tiene permiso, lo mandamos al dashboard principal o mostramos algo
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
