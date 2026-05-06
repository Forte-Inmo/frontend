import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Plus, Trash2, X, ShieldCheck, Lock, Settings2, Save } from 'lucide-react';

export default function Roles() {
  const [roles, setRoles] = useState(() => {
    try {
      const cached = localStorage.getItem('forte_roles_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [availablePermissions] = useState([
    { id: 'informes:view', name: 'Ver Informes', description: 'Permite listar y ver el contenido de los reportes.' },
    { id: 'informes:manage', name: 'Editar Informes', description: 'Permite modificar el contenido de los reportes en el builder.' },
    { id: 'campos:manage', name: 'Gestionar Catastro', description: 'Permite crear, editar y borrar terrenos.' },
    { id: 'rbac:manage', name: 'Gestionar Accesos', description: 'Permite administrar usuarios y sus roles.' },
    { id: 'settings:manage', name: 'Ajustes Globales', description: 'Permite cambiar logos y nombres de la plataforma.' },
  ]);
  const [loading, setLoading] = useState(!localStorage.getItem('forte_roles_cache'));
  const [selectedRole, setSelectedRole] = useState(null);
  const [draftPermissions, setDraftPermissions] = useState([]);
  const [isNewRoleModalOpen, setIsNewRoleModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsNewRoleModalOpen(false);
      setIsEditModalOpen(false);
      setIsClosing(false);
      setSelectedRole(null);
      setNewRoleName('');
    }, 400);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    if (roles.length === 0) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      const result = data || [];
      setRoles(result);
      localStorage.setItem('forte_roles_cache', JSON.stringify(result));
    } catch (error) {
      console.error("Error fetching Supabase roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionsArray = (role) => {
    if (!role?.permissions) return [];
    if (Array.isArray(role.permissions)) return role.permissions;
    if (typeof role.permissions === 'string') {
      try {
        return JSON.parse(role.permissions);
      } catch (e) {
        return role.permissions.replace(/^{|}$/g, '').split(',');
      }
    }
    return [];
  };

  const togglePermission = (permissionId) => {
    if (!selectedRole || selectedRole.is_admin) return;

    const isAssigned = draftPermissions.includes(permissionId);
    
    const nextPerms = isAssigned 
      ? draftPermissions.filter(p => p !== permissionId)
      : [...draftPermissions, permissionId];

    setDraftPermissions(nextPerms);
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    try {
      const { error } = await supabase
        .from('roles')
        .update({ permissions: draftPermissions })
        .eq('id', selectedRole.id);
      
      if (error) {
        alert("Error guardando permisos: " + error.message);
        throw error;
      }
      
      const updatedRole = { ...selectedRole, permissions: draftPermissions };
      setSelectedRole(updatedRole);
      setRoles(roles.map(r => r.id === selectedRole.id ? updatedRole : r));
      handleClose();
    } catch (error) {
      console.error("Error saving Supabase permission:", error);
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert([{ name: newRoleName, is_admin: false, permissions: [] }])
        .select()
        .single();
      
      if (error) throw error;
      setRoles(prev => [...prev, data]);
      handleClose();
    } catch (error) {
      console.error("Error creating Supabase role:", error);
    }
  };

  const deleteRole = async (roleId) => {
    if (!confirm('¿Estás seguro de eliminar este rol?')) return;
    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);
      if (error) throw error;
      setRoles(prev => prev.filter(r => r.id !== roleId));
    } catch (error) {
      console.error("Error deleting Supabase role:", error);
    }
  };

  const openEditModal = (role) => {
    setSelectedRole(role);
    setDraftPermissions(getPermissionsArray(role));
    setIsEditModalOpen(true);
  };

  return (
    <div className="p-6 sm:p-8 bg-gray-50/50 min-h-screen">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-4 tracking-tight">
             <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
               <Shield className="w-8 h-8 text-white" />
             </div>
             Roles y Permisos
          </h1>
          <p className="text-gray-500 font-medium mt-2">
             Administra jerarquías y limita el acceso a funciones críticas.
          </p>
        </div>
        <button onClick={() => setIsNewRoleModalOpen(true)} className="shrink-0 bg-gray-900 text-white px-5 sm:px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95">
          <Plus className="w-5 h-5" /> Nuevo Rol
        </button>
      </div>

      {/* ── Roles Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1, 2, 3].map(i => <div key={i} className="bg-white h-40 rounded-[2rem] animate-pulse border border-gray-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {roles.map(role => (
             <div 
               key={role.id} 
               onClick={() => openEditModal(role)} 
               className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 group flex flex-col relative"
             >
                <div className="flex items-start justify-between mb-5">
                   <div className={`p-3 rounded-2xl ${role.is_admin ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600'} transition-colors`}>
                      {role.is_admin ? <ShieldCheck className="w-6 h-6"/> : <Shield className="w-6 h-6"/>}
                   </div>
                   {!role.is_admin && (
                      <button onClick={(e) => { e.stopPropagation(); deleteRole(role.id); }} className="p-2.5 bg-white text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition shadow-sm border border-transparent hover:border-red-100">
                         <Trash2 className="w-4 h-4" />
                      </button>
                   )}
                </div>
                
                <h3 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors tracking-tight">{role.name}</h3>
                
                <div className="mt-auto pt-4 flex items-center justify-between">
                   {role.is_admin ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">Superusuario</span>
                   ) : (
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><Settings2 className="w-4 h-4"/> {getPermissionsArray(role).length} permisos asignados</span>
                   )}
                </div>
             </div>
           ))}
        </div>
      )}

      {/* ── Slide-over Panel: Nuevo Rol ── */}
      {isNewRoleModalOpen && (
        <div className={`fixed inset-0 z-[100] flex justify-end p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-400 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
           <div className={`bg-white w-full max-w-md h-full shadow-2xl rounded-[2.5rem] flex flex-col border border-gray-100 overflow-hidden ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/60 shrink-0">
                 <h3 className="text-2xl font-black text-gray-900 tracking-tight">Crear Rol</h3>
                 <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-xl transition text-gray-400">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">Nombre del Rol</label>
                    <input 
                      autoFocus 
                      type="text" 
                      value={newRoleName} 
                      onChange={(e) => setNewRoleName(e.target.value)} 
                      placeholder="Ej: Operador de Lotes" 
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold text-gray-700" 
                    />
                 </div>
              </div>
              <div className="p-8 bg-gray-50/50 border-t border-gray-100">
                 <button onClick={createRole} disabled={!newRoleName.trim()} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-500/20 disabled:opacity-50 active:scale-95">
                    Guardar Rol
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ── Slide-over Panel: Editar Permisos ── */}
      {isEditModalOpen && selectedRole && (
         <div className={`fixed inset-0 z-[100] flex justify-end p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-400 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`bg-white w-full max-w-2xl h-full shadow-2xl rounded-[2.5rem] flex flex-col border border-gray-100 overflow-hidden ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
               
               <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/60 shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xl">{selectedRole.name.charAt(0).toUpperCase()}</div>
                     <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedRole.name}</h2>
                        {selectedRole.is_admin ? (
                           <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200 mt-1.5"><Lock className="w-3 h-3" /> Acceso Total Inamovible</div>
                        ) : (
                           <p className="text-xs text-gray-500 font-medium mt-1">Configura qué puede hacer este rol.</p>
                        )}
                     </div>
                  </div>
                  <button onClick={handleClose} className="p-2.5 hover:bg-gray-200 rounded-2xl transition text-gray-400">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="p-8 overflow-y-auto bg-gray-50/30 flex-1">
                  <div className="grid grid-cols-1 gap-4">
                     {availablePermissions.map(permission => {
                       const active = selectedRole.is_admin || draftPermissions.includes(permission.id);
                       return (
                         <div 
                           key={permission.id} 
                           onClick={() => togglePermission(permission.id)} 
                           className={`p-5 rounded-2xl border-2 transition-all ${selectedRole.is_admin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} flex items-center justify-between gap-4 ${active ? 'bg-white border-emerald-200 shadow-sm ring-2 ring-emerald-50' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                         >
                            <div className="flex-1">
                               <h4 className={`font-bold transition-colors text-sm ${active ? 'text-gray-900' : 'text-gray-500'}`}>{permission.name}</h4>
                               <p className="text-[10px] sm:text-[11px] font-medium text-gray-400 leading-tight mt-1">{permission.description}</p>
                            </div>
                            <div className={`relative w-11 h-6 transition-colors duration-300 rounded-full shrink-0 ${active ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                               <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                         </div>
                       );
                     })}
                  </div>
               </div>
               
               <div className="p-8 border-t border-gray-100 bg-white shrink-0 flex gap-4">
                  <button onClick={handleClose} className="flex-1 bg-gray-50 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-100 transition active:scale-95 border-2 border-transparent">
                     Cancelar
                  </button>
                  <button onClick={savePermissions} disabled={selectedRole.is_admin} className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                     <Save className="w-5 h-5" /> Guardar Permisos
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
