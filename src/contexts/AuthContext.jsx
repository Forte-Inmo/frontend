import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('forte_user_cache');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem('forte_profile_cache');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  // Si ya tenemos un perfil y un usuario en cache, no mostramos la pantalla de carga para que sea instantáneo y no haya redirecciones
  const [loading, setLoading] = useState(!localStorage.getItem('forte_profile_cache') || !localStorage.getItem('forte_user_cache'));

  const fetchProfile = useCallback(async (sessionUser) => {
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      const query = supabase
        .from('profiles')
        .select('*, roles(name, permissions, is_admin)')
        .eq('id', sessionUser.id)
        .limit(1);

      const { data, error } = await Promise.race([query, timeout]);

      if (error) {
      } else if (data && data.length > 0) {
        const newProfile = data[0];
        setProfile(newProfile);
        // Guardar en cache para la próxima recarga
        localStorage.setItem('forte_profile_cache', JSON.stringify(newProfile));
      }
    } catch (err) {
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Supabase emitirá INITIAL_SESSION, SIGNED_IN o SIGNED_OUT automáticamente al suscribirse.
    // No necesitamos llamar a getSession() manualmente en el mount, ya que causa deadlocks en React Strict Mode.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          // Si nos sacan o hay un error, limpiamos todo rastro local
          setUser(null);
          setProfile(null);
          localStorage.removeItem('forte_profile_cache');
          localStorage.removeItem('forte_user_cache');
          localStorage.removeItem('forte_last_login');
          // Limpiar también posibles tokens de supabase internos
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
          });
        } else if (session?.user) {
          setUser(session.user);
          localStorage.setItem('forte_user_cache', JSON.stringify(session.user));
          if (event === 'SIGNED_IN') {
            localStorage.setItem('forte_last_login', Date.now().toString());
          }
          await fetchProfile(session.user);
        }
      } catch (err) {
        console.error("Auth change error:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const forceLogout = useCallback(async () => {
    localStorage.removeItem('forte_profile_cache');
    localStorage.removeItem('forte_last_login');
    await supabase.auth.signOut();
    window.location.href = '/';
  }, []);

  const hasPermission = (perm) => {
    if (profile?.roles?.is_admin) return true;
    return profile?.roles?.permissions?.includes(perm) || false;
  };

  useEffect(() => {
    // Verificar si la sesión ya expiró por tiempo (Ej: 24 horas)
    const lastLogin = localStorage.getItem('forte_last_login');
    if (lastLogin) {
      const hoursSinceLogin = (Date.now() - parseInt(lastLogin)) / (1000 * 60 * 60);
      if (hoursSinceLogin > 24) { // 24 horas de límite
        forceLogout();
      }
    }
  }, [forceLogout]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-[9999]">
        <div className="relative flex items-center justify-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-emerald-500/20 z-10">*</div>
          <div className="absolute inset-0 bg-emerald-500 rounded-2xl animate-ping opacity-20"></div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2">Autenticando Plataforma</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshUser, hasPermission, forceLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
