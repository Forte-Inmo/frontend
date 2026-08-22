import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MapWidget from '../components/MapWidget';
import { FileText, Layers, Users, ArrowUpRight, Clock, MapPin } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    campos: 0,
    informes: 0,
    usuarios: 0
  });
  const [recentInformes, setRecentInformes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Consultas paralelas para el dashboard
      const [camposCount, informesCount, profilesCount, recentRes] = await Promise.all([
        supabase.from('campos').select('*', { count: 'exact', head: true }),
        supabase.from('informes').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('informes')
          .select(`
            *,
            campos (
              nombre,
              provincia
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      setStats({
        campos: camposCount.count || 0,
        informes: informesCount.count || 0,
        usuarios: profilesCount.count || 0
      });

      setRecentInformes(recentRes.data || []);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-black text-[#08060d] tracking-tight">
          Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'} 👋
        </h1>
        <p className="text-[#6b6375] font-medium text-lg">
          Este es el resumen de actividad.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Stats & Map */}
        <div className="lg:col-span-2 space-y-6">

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-[2.5rem] border border-[#e5e4e7] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <div className="text-3xl font-black text-[#08060d]">{stats.campos}</div>
              <div className="text-sm font-medium text-[#6b6375]">Campos Totales</div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-[#e5e4e7] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-3xl font-black text-[#08060d]">{stats.informes}</div>
              <div className="text-sm font-medium text-[#6b6375]">Informes Generados</div>
            </div>

            <div className="bg-[#107549] p-6 rounded-[2.5rem] text-white shadow-lg shadow-emerald-900/10 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black">{stats.usuarios}</div>
                <div className="text-sm font-medium opacity-80">Colaboradores</div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
            </div>
          </div>

          {/* Map Widget Section */}
          <div className="bg-white rounded-[3rem] border border-[#e5e4e7] p-4 h-[400px] relative shadow-sm isolate">
            <div className="absolute top-8 right-10 z-[100] flex items-center gap-2 pointer-events-none">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-black text-emerald-800 uppercase tracking-tighter shadow-sm border border-emerald-100">Mapa Satelital Activo</span>
            </div>
            <MapWidget />
          </div>

        </div>

        {/* Right Column: Recent Activity */}
        <div className="bg-white rounded-[3rem] border border-[#e5e4e7] p-8 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-[#08060d] tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Informes Recientes
            </h3>
            <button
              onClick={() => navigate('/dashboard/informes')}
              className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-full transition-colors"
              aria-label="Ver todos los informes"
            >
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto">
            {recentInformes.length > 0 ? recentInformes.map((inf) => (
              <div
                key={inf.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/dashboard/builder/${inf.id}`)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                    <FileText className="w-6 h-6 text-gray-400 group-hover:text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#08060d] truncate group-hover:text-emerald-700 transition-colors">
                      {inf.titulo}
                    </div>
                    <div className="text-xs text-[#6b6375] font-medium flex items-center gap-1.5 mt-0.5 uppercase tracking-wider">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      {inf.campos?.nombre} · {new Date(inf.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-40">
                <FileText className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">No hay informes recientes</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/dashboard/informes')}
            className="w-full bg-gray-50 hover:bg-gray-100 text-[#08060d] font-bold py-4 rounded-2xl mt-8 transition-colors text-sm"
          >
            Ver todos los informes
          </button>
        </div>

      </div>
    </div>
  );
}
