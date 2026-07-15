import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Mail, Search, X, Save, Shield, Edit3, RefreshCw, Plus, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ─── UI Primitives ────────────────────────────────────────── */

function FieldLabel({ children, required }) {
  return (
    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">
      {children}{required && <span className="text-emerald-500 ml-0.5">*</span>}
    </label>
  );
}

function SectionCard({ icon: Icon, title, color = 'emerald', children }) {
  const colorMap = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue:    'bg-blue-100 text-blue-700',
    amber:   'bg-amber-100 text-amber-700',
  };
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 bg-gray-50/60">
        <div className={`p-2 rounded-xl ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-black text-gray-700 tracking-tight">{title}</h3>
      </div>
      <div className="p-6 space-y-4">
        {children}
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────── */

const ALLOWED_CREATOR_ROLES = [
  '46fd1f5f-444c-4bdc-b13d-40e9cc504d4a',
  'a6a9bc56-10b2-4aff-95c7-583ae3429f83'
];

export default function Usuarios() {
  const { profile: currentProfile } = useAuth();
  const canCreateUsers = ALLOWED_CREATOR_ROLES.includes(currentProfile?.role_id);

  const [profiles, setProfiles] = useState(() => {
    try {
      const cached = localStorage.getItem('forte_profiles_list_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [roles, setRoles] = useState(() => {
    try {
      const cached = localStorage.getItem('forte_roles_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(!localStorage.getItem('forte_profiles_list_cache'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveWarning, setSaveWarning] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
      setEditingProfile(null);
      setPassword('');
      setPasswordConfirm('');
      setSaveError(null);
      setSaveWarning(null);
    }, 400);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (profiles.length === 0) setLoading(true);
    try {
      const [profRes, rolesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, roles(id, name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('roles')
          .select('*')
          .order('name', { ascending: true })
      ]);

      if (profRes.error) throw profRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const pData = profRes.data || [];
      const rData = rolesRes.data || [];

      setProfiles(pData);
      setRoles(rData);

      localStorage.setItem('forte_profiles_list_cache', JSON.stringify(pData));
      localStorage.setItem('forte_roles_cache', JSON.stringify(rData));
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async ({ email, password, full_name, role_id }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Sesión expirada. Iniciá sesión nuevamente.');
    }

    const response = await fetch('https://supabase.borei.com.ar/functions/v1/create-user', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, full_name, role_id })
    });

    const result = await response.json();

    if (response.status === 401) {
      throw new Error('Sesión expirada. Iniciá sesión nuevamente.');
    }
    if (response.status === 403) {
      throw new Error('No tenés permisos para crear usuarios.');
    }
    if (response.status === 207) {
      return { user: result.user, warning: result.error || 'El perfil no pudo crearse automáticamente.' };
    }
    if (!response.ok) {
      throw new Error(result.error || 'Error inesperado al crear el usuario.');
    }

    return { user: result.user };
  };

  const handleEdit = (profile) => {
    setEditingProfile({ ...profile });
    setPassword('');
    setPasswordConfirm('');
    setSaveError(null);
    setSaveWarning(null);
    setIsModalOpen(true);
  };

  const handleNewUser = () => {
    setEditingProfile({ email: '', full_name: '', role_id: '' });
    setPassword('');
    setPasswordConfirm('');
    setSaveError(null);
    setSaveWarning(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveWarning(null);

    try {
      const { id, full_name, role_id, email } = editingProfile;

      if (!id) {
        if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        if (password !== passwordConfirm) throw new Error('Las contraseñas no coinciden.');
      }

      if (id) {
        const payload = { full_name, role_id: role_id || null };
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
      } else {
        const result = await createUser({ email, password, full_name, role_id });
        if (result.warning) {
          setSaveWarning(result.warning);
        }
      }

      handleClose();
      fetchData();
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 sm:p-8 bg-gray-50/50 min-h-full space-y-10">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h1 className="text-4xl font-black text-gray-900 flex items-center gap-4 tracking-tight">
              <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
                <Users className="w-8 h-8 text-white" />
              </div>
              Gestión de Usuarios
           </h1>
           <p className="text-gray-500 font-medium mt-2">Personal del equipo en Supabase.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
           {canCreateUsers && (
             <button 
                onClick={handleNewUser}
                className="p-4 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 font-bold text-sm"
             >
                <Plus className="w-5 h-5" /> Nuevo Usuario
             </button>
           )}
           <button 
              onClick={fetchData}
              className={`p-4 rounded-2xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all shadow-sm`}
           >
              <RefreshCw className="w-5 h-5 text-emerald-600" />
           </button>
           <div className="relative flex-1 md:w-80">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar usuarios..." 
                className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>
      </div>

      {/* ── Users Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {[1,2,3,4].map(i => (
             <div key={i} className="bg-white h-[280px] rounded-[2.5rem] animate-pulse border border-gray-100 shadow-sm"></div>
           ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {filteredProfiles.map(profile => (
             <div 
               key={profile.id} 
               className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all p-8 group flex flex-col relative overflow-hidden"
             >
                <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[9px] font-black uppercase tracking-[0.1em] shadow-sm
                   ${profile.roles?.name === 'Administrador' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                   {profile.roles?.name || 'Sin Rol'}
                </div>

                <div className="flex flex-col items-center text-center mb-6">
                   <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-gray-50 to-gray-100 text-emerald-600 flex items-center justify-center font-black text-3xl shadow-inner mb-4 group-hover:scale-110 transition-transform duration-500">
                      {profile.full_name?.charAt(0) || profile.email?.charAt(0) || '?'}
                   </div>
                   <h3 className="text-xl font-black text-gray-900 leading-tight tracking-tight">{profile.full_name || 'Nuevo Usuario'}</h3>
                   <div className="flex items-center gap-2 text-gray-400 font-medium text-xs mt-1.5 break-all">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[180px]">{profile.email}</span>
                   </div>
                </div>

                <div className="mt-auto pt-6 border-t border-gray-50 flex gap-2">
                   <button 
                     onClick={() => handleEdit(profile)}
                     className="flex-1 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 text-gray-500 font-bold py-3.5 rounded-2xl transition-all text-sm flex items-center justify-center gap-2"
                   >
                      <Edit3 className="w-4 h-4" /> Editar
                   </button>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* ── Slide-over Panel (Floating Style) ── */}
      {isModalOpen && editingProfile && (
        <div className={`fixed inset-0 z-[100] flex justify-end p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-400 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
           <div className={`bg-white w-full max-w-lg h-full shadow-2xl rounded-[2.5rem] flex flex-col border border-gray-100 overflow-hidden ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
              
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/60 shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-emerald-100 rounded-2xl">
                       <Users className="w-6 h-6 text-emerald-700" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                       {editingProfile.id ? 'Editar Perfil' : 'Nuevo Usuario'}
                    </h2>
                 </div>
                 <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-xl transition text-gray-400">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto flex-1">
                 <SectionCard icon={Users} title="Datos Personales" color="emerald">
                    <div className="space-y-4">
                       <div>
                          <FieldLabel required>Nombre Completo</FieldLabel>
                          <input 
                             type="text"
                             required
                             value={editingProfile.full_name || ''}
                             onChange={(e) => setEditingProfile(prev => ({ ...prev, full_name: e.target.value }))}
                             placeholder="Ej: Franco Casas"
                             className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-bold text-gray-700"
                          />
                       </div>
                       <div>
                          <FieldLabel required>Correo Electrónico</FieldLabel>
                          <input 
                             type="email"
                             required
                             disabled={!!editingProfile.id}
                             value={editingProfile.email || ''}
                             onChange={(e) => setEditingProfile(prev => ({ ...prev, email: e.target.value }))}
                             placeholder="correo@ejemplo.com"
                             className={`w-full px-5 py-4 rounded-2xl border-2 transition-all font-bold 
                                ${editingProfile.id ? 'bg-gray-100 border-transparent text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-transparent text-gray-400 text-gray-700'}`}
                          />
                        </div>
                        {!editingProfile.id && (
                          <>
                            <div>
                              <FieldLabel required>Contraseña</FieldLabel>
                              <div className="relative">
                                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                                <input 
                                  type={showPassword ? 'text' : 'password'}
                                  required
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  placeholder="Mínimo 8 caracteres"
                                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-bold text-gray-700"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <FieldLabel required>Confirmar Contraseña</FieldLabel>
                              <div className="relative">
                                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                                <input 
                                  type={showPasswordConfirm ? 'text' : 'password'}
                                  required
                                  value={passwordConfirm}
                                  onChange={(e) => setPasswordConfirm(e.target.value)}
                                  placeholder="Repetí la contraseña"
                                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-bold text-gray-700"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                     </div>
                  </SectionCard>

                  <SectionCard icon={Shield} title="Permisos de Sistema" color="amber">
                    <div>
                       <FieldLabel>Rol de Usuario</FieldLabel>
                       <div className="relative">
                          <Shield className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                          <select 
                            value={editingProfile.role_id || ''}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, role_id: e.target.value }))}
                            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                          >
                             <option value="">Sin Rol Asignado</option>
                             {roles.map(role => (
                               <option key={role.id} value={role.id}>{role.name}</option>
                             ))}
                          </select>
                       </div>
                    </div>
                 </SectionCard>
                {saveError && (
                  <div className="px-8 py-4 bg-red-50 border-t border-red-100 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <span className="text-sm font-bold text-red-700">{saveError}</span>
                  </div>
                )}
                {saveWarning && (
                  <div className="px-8 py-4 bg-amber-50 border-t border-amber-100 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <span className="text-sm font-bold text-amber-700">{saveWarning}</span>
                  </div>
                )}
                <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex gap-4">
                   <button type="button" onClick={handleClose} className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition" disabled={saving}>Cancelar</button>
                   <button 
                     type="submit"
                     disabled={saving}
                     className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {saving ? (
                       <Loader2 className="w-5 h-5 animate-spin" />
                     ) : (
                       <Save className="w-5 h-5" />
                     )}
                     {editingProfile.id ? 'Guardar Cambios' : 'Crear Usuario'}
                   </button>
                </div>
               </form>
           </div>
        </div>
      )}
    </div>
  );
}
