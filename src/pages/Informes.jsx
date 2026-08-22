import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  FileText, Plus, Search, Calendar, MapPin,
  ChevronRight, Trash2, Clock, X, Save,
  Layers, AlertCircle, Download, Loader2, History, Mail
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useExportPDF } from '../hooks/useExportPDF';
import { useExportBooklet } from '../hooks/useExportBooklet';

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
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
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

export default function Informes() {
  const navigate = useNavigate();
  const { user, profile, hasPermission } = useAuth();
  const canManage = hasPermission('informes:manage');
  const [informes, setInformes] = useState(() => {
    try {
      const cached = localStorage.getItem('forte_informes_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [campos, setCampos] = useState(() => {
    try {
      const cached = localStorage.getItem('forte_campos_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(!localStorage.getItem('forte_informes_cache'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedCampoId, setSelectedCampoId] = useState('');
  const [selectedPlantillaId, setSelectedPlantillaId] = useState('');
  const [plantillas, setPlantillas] = useState([]);

  // Versiones PDF state
  const [versionesModal, setVersionesModal] = useState(null);
  const [versiones, setVersiones] = useState([]);
  const [loadingVersiones, setLoadingVersiones] = useState(false);

  const [activeTab, setActiveTab] = useState('informes');
  const [exports, setExports] = useState([]);
  const [loadingExports, setLoadingExports] = useState(false);

  const handleVerVersiones = async (informe) => {
    setVersionesModal(informe.id);
    setLoadingVersiones(true);
    const { data } = await supabase
      .from('informe_versiones')
      .select('*')
      .eq('informe_id', informe.id)
      .order('version_number', { ascending: false });
    setVersiones(data || []);
    setLoadingVersiones(false);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
      setSelectedCampoId('');
      setSelectedPlantillaId('');
    }, 400);
  };

  useEffect(() => {
    fetchData();

    // Suscripción Realtime para informes
    const channel = supabase
      .channel('public:informes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'informes' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    if (informes.length === 0) setLoading(true);
    try {
      const [infRes, camposRes] = await Promise.all([
        supabase
          .from('informes')
          .select('*, campos(*), versiones_count:informe_versiones(count)')
          .order('created_at', { ascending: false }),
        supabase
          .from('campos')
          .select('*')
          .order('nombre', { ascending: true })
      ]);

      if (infRes.error) throw infRes.error;
      if (camposRes.error) throw camposRes.error;

      const infData = infRes.data || [];
      const campData = camposRes.data || [];

      setInformes(infData);
      setCampos(campData);

      localStorage.setItem('forte_informes_cache', JSON.stringify(infData));
      localStorage.setItem('forte_campos_cache', JSON.stringify(campData));
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const createInforme = async () => {
    if (!selectedCampoId) return;
    try {
      const selectedCampo = campos.find(c => c.id === selectedCampoId);

      let templatePages = [];
      if (selectedPlantillaId) {
        try {
          const { data: plantilla, error: pError } = await supabase
            .from('plantillas')
            .select('pages_data')
            .eq('id', selectedPlantillaId)
            .maybeSingle();

          if (plantilla?.pages_data?.length > 0) {
            templatePages = JSON.parse(JSON.stringify(plantilla.pages_data));
          }
        } catch (e) {

        }
      }

      const caratula = {
        id: crypto.randomUUID(),
        type: 'CARATULA',
        titulo: 'CAMPO EN VENTA',
        portada_url: '',
        overlay_opacidad: 85,
        overlay_color: '#8cc63f',
        logos_scale: 100,
        logos_offset: 0
      };

      const pages_data = [caratula, ...templatePages];

      const { data, error } = await supabase
        .from('informes')
        .insert([{
          campo_id: selectedCampoId,
          titulo: `Informe ${selectedCampo.nombre}`,
          estado: 'borrador',
          created_by: user?.id,
          updated_by: user?.id,
          pages_data
        }])
        .select()
        .single();

      if (error) throw error;
      navigate(`/dashboard/builder/${data.id}`);
    } catch (error) {

    }
  };

  const deleteInforme = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este informe?')) return;
    try {
      const { error } = await supabase
        .from('informes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setInformes(informes.filter(i => i.id !== id));
    } catch (error) {

    }
  };

  const filteredInformes = informes.filter(i =>
    i.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.campos?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { exportPDF, checkExistingExport, downloadExisting, getExports } = useExportPDF();
  const { exportBooklet, checkExistingExport: checkExistingBooklet, downloadExisting: downloadExistingBooklet } = useExportBooklet();
  const [exportingId, setExportingId] = useState(null);
  const [bookletingId, setBookletingId] = useState(null);
  const [exportProgress, setExportProgress] = useState(null);

  const handleExport = async (informe) => {
    setExportingId(informe.id);
    setExportProgress({ stage: 'pending', progress: 0, logs: ['Iniciando...'], error: null });
    try {
      const filename = `${informe.titulo || 'Informe'}-${informe.campos?.nombre || 'Terreno'}.pdf`.replace(/\s+/g, '_');
      const existing = await checkExistingExport(informe.id, { type: 'pdf' });
      if (existing.exists && existing.fresh && existing.signedUrl) {
        setExportProgress({ stage: 'done', progress: 100, logs: ['No hubo cambios desde la última exportación. Descargando PDF existente...'], error: null });
        await downloadExisting(existing.signedUrl, filename);
        setExportProgress(null);
        return;
      }
      await exportPDF({
        informeId: informe.id,
        filename,
        informeTitle: `${informe.titulo || 'Informe'} - ${informe.campos?.nombre || 'Terreno'}`,
        onProgress: (p) => setExportProgress(p),
      });
      if (activeTab === 'exportaciones') {
        loadExports();
      }
    } catch (error) {

      setExportProgress(prev => ({ ...prev, stage: 'error', error: error.message, logs: [...(prev?.logs || []), 'ERROR: ' + error.message] }));
    } finally {
      setExportingId(null);
    }
  };

  const handleExportBooklet = async (informe) => {
    setBookletingId(informe.id);
    setExportProgress({ stage: 'pending', progress: 0, logs: ['Iniciando exportación revista...'], error: null });
    try {
      const filename = `${informe.titulo || 'Informe'}-${informe.campos?.nombre || 'Terreno'}-revista.pdf`.replace(/\s+/g, '_');
      const existing = await checkExistingBooklet(informe.id, { type: 'booklet' });
      if (existing.exists && existing.fresh && existing.signedUrl) {
        setExportProgress({ stage: 'done', progress: 100, logs: ['No hubo cambios desde la última exportación. Descargando revista existente...'], error: null });
        await downloadExistingBooklet(existing.signedUrl, filename);
        setExportProgress(null);
        return;
      }
      await exportBooklet({
        informeId: informe.id,
        filename,
        informeTitle: `${informe.titulo || 'Informe'} - ${informe.campos?.nombre || 'Terreno'}`,
        onProgress: (p) => setExportProgress(p),
      });
      if (activeTab === 'exportaciones') {
        loadExports();
      }
    } catch (error) {

      setExportProgress(prev => ({ ...prev, stage: 'error', error: error.message, logs: [...(prev?.logs || []), 'ERROR: ' + error.message] }));
    } finally {
      setBookletingId(null);
    }
  };

  const loadExports = async () => {
    setLoadingExports(true);
    try {
      const data = await getExports();
      setExports(data || []);
    } catch (e) {

    } finally {
      setLoadingExports(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'exportaciones') {
      loadExports();
    }
  }, [activeTab]);

  const camposDisponibles = campos.filter(campo =>
    !informes.some(inf => inf.campo_id === campo.id)
  );

  const openCreateModal = async () => {
    setSelectedPlantillaId('');
    setIsModalOpen(true);
    try {
      const [pRes, sRes] = await Promise.all([
        supabase.from('plantillas').select('*').order('nombre', { ascending: true }),
        supabase.from('settings').select('default_plantilla_id').limit(1).maybeSingle()
      ]);
      setPlantillas(pRes.data || []);
      if (sRes.data?.default_plantilla_id) {
        setSelectedPlantillaId(sRes.data.default_plantilla_id);
      }
    } catch (e) {

    }
  };

  return (
    <div className="p-6 sm:p-8 bg-gray-50/50 min-h-full space-y-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-4 tracking-tight">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <FileText className="w-8 h-8 text-white" />
            </div>
            Gestión de Informes
          </h1>
          <p className="text-gray-500 font-medium mt-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            {informes.length} reportes generados en Supabase
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar informes..."
              className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {canManage && (
            <button
              onClick={openCreateModal}
              className="shrink-0 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nuevo Informe</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('informes')}
          className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === 'informes'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-2 -mt-0.5" />
          Informes
        </button>
        <button
          onClick={() => setActiveTab('exportaciones')}
          className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === 'exportaciones'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <History className="w-3.5 h-3.5 inline mr-2 -mt-0.5" />
          Exportaciones
        </button>
      </div>

      {/* ── Tab: Exportaciones ── */}
      {activeTab === 'exportaciones' && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/60 flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-700 tracking-tight">Historial de Exportaciones</h3>
            {exports.length > 0 && (
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{exports.length} exportaciones</span>
            )}
          </div>
          <div className="p-4">
            {loadingExports ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : exports.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-100">
                <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-black text-gray-400 uppercase tracking-wide">Ninguna exportación aún</p>
                <p className="text-xs text-gray-400 mt-1 font-medium">Las exportaciones aparecerán aquí y recibirás un email cuando estén listas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exports.map(exp => {
                  const informe = informes.find(i => i.id === exp.informe_id);
                  return (
                    <div key={exp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50/50 transition-colors border border-transparent hover:border-emerald-100">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          exp.status === 'done' ? 'bg-emerald-100 text-emerald-600' :
                          exp.status === 'error' ? 'bg-red-100 text-red-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                          {exp.status === 'done' ? <Download className="w-5 h-5" /> :
                           exp.status === 'error' ? <AlertCircle className="w-5 h-5" /> :
                           <Loader2 className="w-5 h-5 animate-spin" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-gray-800 truncate">
                            {informe?.titulo || 'Informe'}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(exp.created_at).toLocaleDateString('es-AR', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          exp.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                          exp.status === 'error' ? 'bg-red-100 text-red-700' :
                          exp.status === 'cmyk' || exp.status === 'rendering' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {exp.status === 'done' ? 'Listo' :
                           exp.status === 'error' ? 'Error' :
                           exp.status === 'rendering' ? 'Renderizando' :
                           exp.status === 'cmyk' ? 'Procesando' : 'Pendiente'}
                        </div>
                        {exp.status === 'done' && (
                          <a
                            href={exp.signedUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" /> Descargar
                          </a>
                        )}
                        {exp.status === 'error' && (
                          <span className="text-[10px] text-red-500 font-bold max-w-[200px] truncate" title={exp.error}>
                            {exp.error}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Informes List ── */}
      {activeTab === 'informes' && (loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white h-24 rounded-[2rem] animate-pulse border border-gray-100 shadow-sm"></div>
          ))}
        </div>
      ) : filteredInformes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredInformes.map(informe => (
            <div
              key={informe.id}
              onClick={() => navigate(`/dashboard/builder/${informe.id}`)}
              className="bg-white p-5 sm:p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer group flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
            >
              {/* Icono + Información */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors shrink-0">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 truncate group-hover:text-emerald-700 transition-colors tracking-tight">{informe.titulo}</h3>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] shadow-sm shrink-0
                          ${informe.estado === 'publicado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {informe.estado}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 flex-wrap">
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> {informe.campos?.nombre}</div>
                    <div className="h-3 w-px bg-gray-200 hidden sm:block"></div>
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(informe.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 flex-wrap sm:shrink-0 sm:justify-end">
                {canManage && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExport(informe); }}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-emerald-100 hover:border-emerald-500"
                    >
                      {exportingId === informe.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span>{exportingId === informe.id ? 'Generando...' : 'Exportar PDF'}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExportBooklet(informe); }}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 hover:bg-blue-500 text-blue-600 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-blue-100 hover:border-blue-500"
                    >
                      {bookletingId === informe.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span>{bookletingId === informe.id ? 'Generando...' : 'Revista A3'}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVerVersiones(informe); }}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-gray-100"
                    >
                      <History className="w-3.5 h-3.5" /> Versiones
                      {informe.versiones_count?.[0]?.count > 0 && (
                        <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full text-[8px]">
                          {informe.versiones_count[0].count}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteInforme(informe.id); }}
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      aria-label="Eliminar informe"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border-2 border-dashed border-gray-100 p-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
            <FileText className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">No se encontraron informes</h3>
          <p className="text-gray-500 font-medium max-w-sm mb-8">Comienza creando tu primer reporte técnico seleccionando un terreno del catastro.</p>
          {canManage && (
            <button
              onClick={openCreateModal}
              className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition shadow-xl shadow-emerald-100"
            >
              Crear Primer Informe
            </button>
          )}
        </div>
      ))}

      {/* ── Slide-over Panel (Floating Style) ── */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-[100] flex justify-end p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-400 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
          <div className={`bg-white w-full max-w-lg h-full shadow-2xl rounded-[2.5rem] flex flex-col border border-gray-100 overflow-hidden ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/60">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-emerald-100 rounded-2xl">
                  <FileText className="w-6 h-6 text-emerald-700" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Nuevo Informe</h2>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-xl transition text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto flex-1">
              <SectionCard icon={Layers} title="Selección de Terreno" color="emerald">
                {camposDisponibles.length > 0 ? (
                  <div>
                    <FieldLabel required>Terreno Vinculado</FieldLabel>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                      <select
                        value={selectedCampoId}
                        onChange={(e) => setSelectedCampoId(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                      >
                        <option value="">Selecciona un establecimiento...</option>
                        {camposDisponibles.map(campo => (
                          <option key={campo.id} value={campo.id}>{campo.nombre} ({campo.provincia})</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                        <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-900 text-sm">No hay campos disponibles</div>
                      <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                        Todos tus terrenos ya tienen un informe creado.
                      </p>
                    </div>
                  </div>
                )}
              </SectionCard>

              <SectionCard icon={FileText} title="Plantilla" color="blue">
                <div>
                  <FieldLabel>Estructura predefinida</FieldLabel>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                    <select
                      value={selectedPlantillaId}
                      onChange={(e) => setSelectedPlantillaId(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                    >
                      <option value="">Sin plantilla (solo carátula)</option>
                      {plantillas.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                      <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex gap-4">
              <button onClick={handleClose} className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition">Cancelar</button>
              <button
                onClick={createInforme}
                disabled={!selectedCampoId}
                className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-95"
              >
                <Save className="w-5 h-5" /> Generar Informe
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Versiones PDF */}
      {versionesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setVersionesModal(null)} 
          />
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up-fade">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div>
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Historial de PDFs</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  Versiones generadas
                </p>
              </div>
              <button onClick={() => setVersionesModal(null)} className="p-2 hover:bg-gray-200 rounded-xl transition text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de versiones */}
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {loadingVersiones ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                </div>
              ) : versiones.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">Ningún PDF generado aún</p>
                </div>
              ) : versiones.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Badge de versión */}
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-black text-sm">
                      v{v.version_number}
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-800">
                        {new Date(v.created_at).toLocaleDateString('es-AR', { 
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">
                        por {v.created_by_name}
                      </div>
                    </div>
                  </div>
                  {/* Botón descargar */}
                  <a 
                    href={v.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl border border-gray-200 hover:border-emerald-200 transition-all font-black text-[9px] uppercase tracking-widest shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Progreso Export PDF ── */}
      {exportProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <FileText className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm font-black text-gray-700">Exportar PDF</span>
              </div>
              <button
                onClick={() => setExportProgress(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <span>{exportProgress.error ? 'Error' : exportProgress.stage === 'done' ? 'Completado' : 'Procesando...'}</span>
                  <span>{exportProgress.progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      exportProgress.error ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${exportProgress.progress}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                {(exportProgress.logs || []).map((log, i) => (
                  <div key={i} className={`text-[11px] font-mono leading-relaxed ${
                    log.startsWith('ERROR') ? 'text-red-600 font-bold' : 'text-gray-600'
                  }`}>
                    {'> '}{log}
                    {i === (exportProgress.logs || []).length - 1 && exportProgress.stage !== 'done' && exportProgress.stage !== 'error' && (
                      <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>

              {(exportProgress.stage === 'done' || exportProgress.stage === 'error') && (
                <button
                  onClick={() => setExportProgress(null)}
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    exportProgress.error
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  {exportProgress.error ? 'Cerrar' : 'Cerrar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
