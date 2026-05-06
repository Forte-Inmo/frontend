import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { refreshUser } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Fallback robusto para la imagen de fondo
  const bgImage = settings?.background_url || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop';
  
  return (
    <div className="flex min-h-screen w-full relative overflow-hidden bg-gray-900">
      {/* Capa de Imagen de Fondo */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000"
        style={{ 
          backgroundImage: `url(${bgImage})`,
          backgroundColor: '#111827' // Gris muy oscuro de respaldo
        }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>
      </div>

      {/* Panel de Login (Siempre Blanco) */}
      <div className="relative z-10 flex flex-col justify-center ml-auto w-full max-w-[520px] min-h-screen bg-white shadow-2xl px-10 py-12 md:px-20">
        
        {/* Logos */}
        {(settings?.org1_logo_url || settings?.org2_logo_url) ? (
          <div className="mb-12 flex items-center justify-center gap-6 w-full">
            {settings?.org1_logo_url && (
              <img src={settings.org1_logo_url} alt="Logo" className="h-[60px] w-auto object-contain" />
            )}
            {settings?.org2_logo_url && (
              <img src={settings.org2_logo_url} alt="Logo" className="h-[60px] w-auto object-contain" />
            )}
          </div>
        ) : (
          <div className="mb-12 text-center">
             <div className="w-16 h-16 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-emerald-200">*</div>
          </div>
        )}

        <div className="text-left mb-10 w-full">
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Forte Reports</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Panel de Control Interno</p>
        </div>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-6 w-full">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Corporativo</label>
            <input 
              type="email" 
              placeholder="tu@forte.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-600 focus:bg-white focus:outline-none transition-all font-bold text-gray-700 shadow-sm"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-600 focus:bg-white focus:outline-none transition-all font-bold text-gray-700 shadow-sm"
            />
          </div>
          
          {error && (
            <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl">
               <p className="text-red-600 text-[11px] font-black uppercase tracking-wider text-center">{error}</p>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full mt-4 py-4.5 bg-gray-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Validando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-auto pt-10 text-center">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
               Powered by Supabase & Forte
            </p>
        </div>
      </div>
    </div>
  );
}
