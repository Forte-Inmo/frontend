import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { LayoutDashboard, Layers, Map as MapIcon, LineChart, Settings, LogOut, Users, Shield, User, ChevronUp } from 'lucide-react';

const menuItems = [
  { name: 'Inicio', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Campos', icon: Layers, path: '/dashboard/campos' },
  { name: 'Informes', icon: LineChart, path: '/dashboard/informes' },
  { name: 'Usuarios', icon: Users, path: '/dashboard/usuarios', permission: 'rbac:manage' },
  { name: 'Roles', icon: Shield, path: '/dashboard/roles', permission: 'rbac:manage' },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { hasPermission, forceLogout, profile } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userInitials = profile?.full_name 
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : profile?.email?.charAt(0).toUpperCase() || '?';

  const handleLogout = async () => {
    try {
      await forceLogout();
      navigate('/'); // Redirigir al login explícitamente
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <aside className="w-[280px] flex-shrink-0 flex flex-col h-screen border-r border-[#e5e4e7] bg-white p-5 sticky top-0 hidden md:flex font-sans">
      {/* Logo Area */}
      <div className="flex items-center gap-2 mb-8 px-2">
        {settings?.org1_logo_url ? (
          <img src={settings.org1_logo_url} alt="Logo" className="max-h-10 w-auto object-contain" />
        ) : (
          <>
            <div className="w-7 h-7 bg-[#107549] text-white flex items-center justify-center rounded text-sm asterisk-icon font-bold">
              *
            </div>
            <span className="font-bold text-xl text-[#08060d]">{settings?.website_name || 'Forte'}</span>
          </>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1">
        {menuItems.filter(item => !item.permission || hasPermission(item.permission)).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-[20px] transition-colors duration-200 text-sm font-medium ${
                isActive
                  ? 'bg-[#107549] text-white'
                  : 'text-[#6b6375] hover:bg-gray-100 hover:text-[#08060d]'
              }`}
            >
              <Icon className="w-[20px] h-[20px]" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* User Section & Profile Menu */}
      <div className="mt-auto relative">
        {/* Profile Dropup Menu */}
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 overflow-hidden animate-slide-up z-50">
            <div className="px-5 py-3 border-b border-gray-50 mb-2">
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mi Cuenta</p>
            </div>
            
            <button 
              onClick={() => { navigate('/dashboard/perfil'); setIsUserMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors text-left"
            >
              <User className="w-4 h-4" />
              Ver Perfil
            </button>

            {hasPermission('settings:manage') && (
              <button 
                onClick={() => { navigate('/dashboard/ajustes'); setIsUserMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors text-left"
              >
                <Settings className="w-4 h-4" />
                Ajustes
              </button>
            )}

            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left border-t border-gray-50 mt-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        )}

        {/* User Toggle Button */}
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className={`flex items-center w-full gap-3 p-3 rounded-2xl border transition-all duration-300 ${
            isUserMenuOpen 
              ? 'bg-emerald-50 border-emerald-100' 
              : 'bg-gray-50 border-transparent hover:bg-gray-100'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-emerald-200 shrink-0">
             {userInitials}
          </div>
          <div className="flex-1 text-left min-w-0">
             <p className="text-sm font-black text-gray-900 truncate tracking-tight">{profile?.full_name || 'Usuario'}</p>
             <p className="text-[10px] font-bold text-gray-500 truncate">{profile?.email || 'Forte User'}</p>
          </div>
          <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </aside>
  );
}
