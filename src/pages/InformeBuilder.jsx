import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Save, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Layout, 
  Map as MapIcon, 
  Image as ImageIcon, 
  Type, 
  Settings, 
  Download, 
  Layers,
  Camera,
  Upload,
  X,
  User as UserIcon,
  MousePointer2,
  Check,
  List,
  Bold,
  Italic,
  Baseline,
  MapPin,
  ChevronUp,
  ChevronDown,
  LogOut,
  Loader2,
  Palette,
  Table as TableIcon,
  FileSpreadsheet
} from 'lucide-react';
import { usePageEditor } from '../hooks/usePageEditor';
import { useRealtimeCursors } from '../hooks/useRealtimeCursors';
import { useSettings } from '../contexts/SettingsContext';
import { useExportPDF } from '../hooks/useExportPDF';

// Componentes de las páginas
import CaratulaPage from '../components/ReportPages/CaratulaPage';
import UbicacionPage from '../components/ReportPages/UbicacionPage';
import SituacionActualPage from '../components/ReportPages/SituacionActualPage';
import DinamicaPage from '../components/ReportPages/DinamicaPage';
import AnalisisSueloPage from '../components/ReportPages/AnalisisSueloPage';
import TextoFotosPage from '../components/ReportPages/TextoFotosPage';

export default function InformeBuilder() {
  const { informeId: id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { exportPDF, checkExistingExport } = useExportPDF();
  const [existingExport, setExistingExport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [informe, setInforme] = useState(null);
  const { settings } = useSettings();
  const campoMetadata = informe?.campo;
  const brandColors = (settings?.brand_colors && Object.keys(settings.brand_colors).length > 0) ? settings.brand_colors : {
    primary: '#107549',
    secondary: '#003399',
    accent: '#ccff00',
    dark: '#001a4d'
  };

  const [activeLocks, setActiveLocks] = useState({});
  const [activeColorPicker, setActiveColorPicker] = useState(null);
  const displayName = profile?.full_name?.split('-')[0]?.split('(')[0]?.trim() || user?.email?.split('@')[0] || 'Colaborador';

  const saveInforme = useCallback(async (data, setStatus) => {
    setStatus('saving');
    try {
      const { error } = await supabase
        .from('informes')
        .update({ pages_data: data })
        .eq('id', id);
      if (error) throw error;
      setStatus('saved');
    } catch (error) {
      console.error('Error saving informe:', error);
      setStatus('error');
    }
  }, [id]);

  const {
    pagesData, setPagesData,
    resetPagesData,
    activePageIndex, setActivePageIndex,
    activeBlockIndex, setActiveBlockIndex,
    isEditingMap, setIsEditingMap,
    isEditingPage, setIsEditingPage,
    saveStatus,
    showPageSelector, setShowPageSelector,
    selectionFormat,
    isFirstLoad,
    addPage, removePage, movePage,
    updatePage,
    handleRemoteUpdate,
    updatePageSlice, addSlice,
    uploadImage,
  } = usePageEditor({ id, saveFn: saveInforme });

  const { cursors, broadcastData } = useRealtimeCursors({
    roomName: id, 
    username: displayName,
    onDataUpdate: (payload) => handleRemoteUpdate(payload)
  });

  const handleUpdatePage = useCallback((index, field, value) => {
    updatePage(index, field, value, broadcastData);
  }, [updatePage, broadcastData]);

  const noop = () => {};

  const fetchInforme = async () => {
    if (!id || id === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('informes')
        .select(`
          *,
          campo:campos(nombre, latitud, longitud, superficie_total, provincia, departamento)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setInforme(data);
      
      if (data.pages_data && data.pages_data.length > 0) {
        resetPagesData(data.pages_data);
      } else {
        resetPagesData([{ id: crypto.randomUUID(), type: 'CARATULA', titulo: 'INFORME TÉCNICO', subtitulo: data.campo?.nombre || 'TERRENO' }]);
      }
      
      setLoading(false);
      setTimeout(() => { isFirstLoad.current = false; }, 1000);
    } catch (error) {
      console.error('Error fetching informe:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInforme();
  }, [id]);

  useEffect(() => {
    if (searchParams.get('export') === 'true' && pagesData.length > 0 && !loading && informe) {
      const timer = setTimeout(async () => {
        try {
          const filename = `${informe.titulo || 'Informe'}-${informe.campo?.nombre || 'Terreno'}.pdf`.replace(/\s+/g, '_');
          await exportPDF({
            informeId: id,
            filename,
          });
          window.close();
        } catch (error) {
          console.error("Error en auto-export:", error);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, pagesData.length, searchParams, informe, campoMetadata]);

  useEffect(() => {
    if (id && !loading) {
      checkExistingExport(id).then(result => {
        if (result.exists) setExistingExport(result);
      }).catch(() => {});
    }
  }, [id, loading]);

  const acquireLock = (fieldPath) => {};
  const releaseLock = () => {};
  const isLockedByOther = (fieldPath) => false;

  const activePage = pagesData[activePageIndex];

  // Auto-migrate legacy UbicacionPage (title+description) to blocks
  useEffect(() => {
    if (activePage?.type === 'UBICACION' && !activePage.blocks && activePage.titulo) {
      const newBlocks = [
        { id: crypto.randomUUID(), type: 'title', title: activePage.titulo || 'UBICACIÓN Y DISTRIBUCIÓN', yOffset: 0, textColor: '#ffffff', titleSize: 'md' },
        { id: crypto.randomUUID(), type: 'text', text: activePage.descripcion || '', xOffset: 15, yOffset: 80, textColor: '#ffffff', textSize: 'md', bgColor: '#107549', variant: 'standard', width: 'half', align: 'left' },
      ];
      handleUpdatePage(activePageIndex, 'blocks', newBlocks);
    }
  }, [activePage?.type, activePage?.id, activePageIndex, handleUpdatePage]);

  function ThumbnailPreview({ page, pageIndex }) {
    const containerRef = useRef(null);
    const [scale, setScale] = useState(0);

    useLayoutEffect(() => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        const h = containerRef.current.offsetHeight;
        setScale(Math.min(w / 794, h / 1123));
      }
    }, []);

    const noop = () => {};

    return (
      <div ref={containerRef} className="w-full h-full overflow-hidden rounded-[2rem]" style={{ pointerEvents: 'none' }}>
        {scale > 0 && (
          <div style={{ width: '794px', height: '1123px', transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {page.type === 'CARATULA' && (
              <CaratulaPage page={page} pageIndex={pageIndex} updatePage={noop} isEditMode={false} uploadImage={noop} campoMetadata={campoMetadata} settings={settings} acquireLock={noop} releaseLock={noop} isLockedByOther={() => false} activeLocks={{}} />
            )}
            {page.type === 'UBICACION' && (
              <UbicacionPage page={page} pageIndex={pageIndex} updatePage={noop} isEditMode={false} uploadImage={noop} setIsEditingMap={noop} activeBlockIndex={null} setActiveBlockIndex={noop} settings={settings} acquireLock={noop} releaseLock={noop} isLockedByOther={() => false} activeLocks={{}} />
            )}
            {page.type === 'SITUACION_ACTUAL' && (
              <SituacionActualPage page={page} pageIndex={pageIndex} updatePage={noop} isEditMode={false} uploadImage={noop} settings={settings} acquireLock={noop} releaseLock={noop} isLockedByOther={() => false} activeLocks={{}} />
            )}
            {page.type === 'DINAMICA' && (
              <DinamicaPage page={page} pageIndex={pageIndex} updatePage={noop} isEditMode={false} uploadImage={noop} activeBlockIndex={null} setActiveBlockIndex={noop} settings={settings} acquireLock={noop} releaseLock={noop} isLockedByOther={() => false} activeLocks={{}} />
            )}
            {page.type === 'ANALISIS_SUELO' && (
              <AnalisisSueloPage page={page} pageIndex={pageIndex} updatePage={noop} updatePageSlice={noop} addSlice={noop} uploadImage={noop} settings={settings} acquireLock={noop} releaseLock={noop} isLockedByOther={() => false} activeLocks={{}} />
            )}
            {page.type === 'TEXTO_FOTOS' && (
              <TextoFotosPage page={page} pageIndex={pageIndex} updatePage={noop} settings={settings} acquireLock={noop} releaseLock={noop} isLockedByOther={() => false} activeLocks={{}} />
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) return <div className="p-10 text-center flex h-screen items-center justify-center text-emerald-800 font-bold text-xl">Cargando Informe...</div>;

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col font-sans">
      {/* Cursores Remotos */}
      {Object.values(cursors).map(c => (
        <div key={c.id} className="fixed z-[9999] pointer-events-none transition-all duration-150 ease-out" style={{ left: c.x, top: c.y }}>
          <MousePointer2 className="w-5 h-5 text-emerald-500 fill-emerald-500 shadow-xl" />
          <div className="ml-4 px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-md shadow-lg whitespace-nowrap uppercase tracking-tighter">
            {c.userName}
          </div>
        </div>
      ))}

      {/* Header */}
      <div className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-6">
          {(isEditingMap || activeBlockIndex !== null || isEditingPage) && (
            <button 
              onClick={() => {
                setIsEditingMap(false);
                setActiveBlockIndex(null);
                setIsEditingPage(false);
              }} 
              className="p-3 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100 animate-in fade-in slide-in-from-left duration-200"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
          )}
          <div className="h-10 w-[1px] bg-gray-100"></div>
          <div>
            <h1 className="text-sm font-black text-gray-900 tracking-tight uppercase">{informe?.nombre || 'Borrador'}</h1>
            <div className="text-[10px] text-gray-400 tracking-[0.3em] font-black uppercase mt-0.5">TERRENO: {campoMetadata?.nombre || '...'}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl border bg-gray-50/50">
            {saveStatus === 'saved' && <span className="text-emerald-600 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Sincronizado</span>}
            {saveStatus === 'saving' && <span className="text-amber-600 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Guardando...</span>}
          </div>

          {existingExport ? (
            <div className="flex items-center gap-2">
              <a
                href={existingExport.signedUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
              >
                <Download className="w-4 h-4" /> Descargar PDF
              </a>
            </div>
          ) : (
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4">
              Sin exportaciones
            </div>
          )}
          <button 
            onClick={() => navigate('/dashboard/informes')}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest border border-red-100 hover:border-red-500 shadow-sm group"
          >
            <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" /> Salir
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (Miniaturas) */}
        <div className="w-[380px] shrink-0 bg-white border-r border-gray-200 flex flex-col z-10 shadow-xl shadow-gray-100/50 overflow-hidden">
          <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
            {isEditingPage && isEditingMap && activePage?.type === 'UBICACION' ? (
              /* Vista de Edición de Mapa */
              <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right duration-300">
                <div className="flex flex-col gap-4">
                  <div className="h-1 w-12 bg-emerald-500 rounded-full"></div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 uppercase">Editar Mapa</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personalizá colores del mapa y marcador</p>
                </div>

                <div className="space-y-8">
                  {/* Color del Marcador */}
                  <div className="space-y-4">
                    <FieldLabel>Color del Marcador</FieldLabel>
                    <div className="bg-gray-50 p-4 rounded-3xl">
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(brandColors).map(([key, color]) => (
                          <button 
                            key={key}
                            onClick={() => handleUpdatePage(activePageIndex, 'pin_color', color)}
                            className="w-full aspect-square rounded-xl border border-gray-100 relative flex items-center justify-center transition-transform active:scale-90"
                            style={{ backgroundColor: color }}
                          >
                            {(activePage.pin_color || '#003399') === color && <Check className="w-4 h-4 text-white mix-blend-difference" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100"></div>

                  {/* Estilo de Textos */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <FieldLabel>Estilo de Título</FieldLabel>
                      <div className="bg-gray-50 p-4 rounded-[2rem] space-y-4">
                        <div className="flex bg-white p-1.5 rounded-2xl">
                          {[40, 50, 58, 70].map(size => (
                            <button 
                              key={size}
                              onClick={() => handleUpdatePage(activePageIndex, 'titulo_size', size)}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${ (activePage.titulo_size || 58) === size ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600' }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(brandColors).map(([key, color]) => (
                            <button 
                              key={key}
                              onClick={() => handleUpdatePage(activePageIndex, 'titulo_color', color)}
                              className="w-full aspect-square rounded-xl border border-gray-100 flex items-center justify-center transition-transform active:scale-90"
                              style={{ backgroundColor: color }}
                            >
                              {(activePage.titulo_color || '#ffffff') === color && <Check className="w-3 h-3 text-white mix-blend-difference" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <FieldLabel>Estilo de Descripción</FieldLabel>
                      <div className="bg-gray-50 p-4 rounded-[2rem] space-y-4">
                        <div className="flex bg-white p-1.5 rounded-2xl">
                          {[20, 24, 26, 32].map(size => (
                            <button 
                              key={size}
                              onClick={() => handleUpdatePage(activePageIndex, 'descripcion_size', size)}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${ (activePage.descripcion_size || 26) === size ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600' }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(brandColors).map(([key, color]) => (
                            <button 
                              key={key}
                              onClick={() => handleUpdatePage(activePageIndex, 'descripcion_color', color)}
                              className="w-full aspect-square rounded-xl border border-gray-100 flex items-center justify-center transition-transform active:scale-90"
                              style={{ backgroundColor: color }}
                            >
                              {(activePage.descripcion_color || '#ffffff') === color && <Check className="w-3 h-3 text-white mix-blend-difference" />}
                            </button>
                          ))}
                        </div>

                        <div className="h-px bg-gray-200 mx-2"></div>

                        {/* Formato de Texto Enriquecido */}
                        <div className="flex bg-white p-1.5 rounded-2xl gap-1">
                          <button 
                            onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false); }}
                            className={`flex-1 py-2 rounded-xl flex items-center justify-center transition-all ${ selectionFormat.bold ? 'bg-gray-100 text-emerald-600' : 'text-gray-400 hover:text-emerald-600' }`}
                          >
                            <Bold className="w-4 h-4" />
                          </button>
                          <button 
                            onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic', false); }}
                            className={`flex-1 py-2 rounded-xl flex items-center justify-center transition-all ${ selectionFormat.italic ? 'bg-gray-100 text-emerald-600' : 'text-gray-400 hover:text-emerald-600' }`}
                          >
                            <Italic className="w-4 h-4" />
                          </button>
                          <button 
                            onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList', false); }}
                            className={`flex-1 py-2 rounded-xl flex items-center justify-center transition-all ${ selectionFormat.list ? 'bg-gray-100 text-emerald-600' : 'text-gray-400 hover:text-emerald-600' }`}
                          >
                            <List className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100"></div>

                  {/* Colores por Departamento */}
                  {activePage.departamento ? (
                    <div className="space-y-4">
                      <div className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.3em]">
                        Departamento: {activePage.departamento}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-3xl space-y-3">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block text-center">Fondo</span>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(brandColors).map(([key, color]) => (
                              <button 
                                key={key}
                                onClick={() => {
                                  const deptColors = { ...(activePage.deptColors || {}) };
                                  if (deptColors[activePage.departamento] === color) {
                                    delete deptColors[activePage.departamento];
                                  } else {
                                    deptColors[activePage.departamento] = color;
                                  }
                                  handleUpdatePage(activePageIndex, 'deptColors', deptColors);
                                }}
                                className="w-full aspect-square rounded-xl border border-gray-100 relative flex items-center justify-center transition-transform active:scale-90"
                                style={{ backgroundColor: color }}
                              >
                                {(activePage.deptColors?.[activePage.departamento]) === color && <Check className="w-4 h-4 text-white mix-blend-difference" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-3xl space-y-3">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block text-center">Texto</span>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(brandColors).map(([key, color]) => (
                              <button 
                                key={key}
                                onClick={() => {
                                  const deptTextColors = { ...(activePage.deptTextColors || {}) };
                                  if (deptTextColors[activePage.departamento] === color) {
                                    delete deptTextColors[activePage.departamento];
                                  } else {
                                    deptTextColors[activePage.departamento] = color;
                                  }
                                  handleUpdatePage(activePageIndex, 'deptTextColors', deptTextColors);
                                }}
                                className="w-full aspect-square rounded-xl border border-gray-100 relative flex items-center justify-center transition-transform active:scale-90"
                                style={{ backgroundColor: color }}
                              >
                                {(activePage.deptTextColors?.[activePage.departamento]) === color && <Check className="w-4 h-4 text-white mix-blend-difference" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center text-center gap-2">
                      <MapPin className="w-8 h-8 text-gray-300" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seleccioná un departamento</p>
                      <p className="text-xs text-gray-500 font-medium">Hacé clic en cualquier departamento del mapa para editar sus colores.</p>
                    </div>
                  )}
                  <div className="h-px bg-gray-100"></div>

                  {/* Imagen de Fondo (Persistent Editor) */}
                  <div className="space-y-4">
                    <FieldLabel>{activePage.type === 'CARATULA' ? 'Imagen de Portada' : 'Imagen de Fondo de Página'}</FieldLabel>
                    {activePage.fondo_url || activePage.portada_url ? (
                      <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-100">
                        <img src={activePage.fondo_url || activePage.portada_url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="p-2 bg-white rounded-lg cursor-pointer hover:bg-emerald-50 text-emerald-600">
                            <Camera className="w-4 h-4" />
                            <input type="file" className="hidden" onChange={(e) => uploadImage(e, activePageIndex, activePage.type === 'CARATULA' ? 'portada_url' : 'fondo_url')} accept="image/*" />
                          </label>
                          <button 
                            onClick={() => handleUpdatePage(activePageIndex, activePage.type === 'CARATULA' ? 'portada_url' : 'fondo_url', '')}
                            className="p-2 bg-white rounded-lg hover:bg-red-50 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer">
                        <Upload className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase">Subir {activePage.type === 'CARATULA' ? 'Portada' : 'Fondo'}</span>
                        <input type="file" className="hidden" onChange={(e) => uploadImage(e, activePageIndex, activePage.type === 'CARATULA' ? 'portada_url' : 'fondo_url')} accept="image/*" />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ) : isEditingPage && activeBlockIndex !== null && (activePage?.type === 'DINAMICA' || activePage?.type === 'UBICACION') && activePage.blocks[activeBlockIndex] ? (
              /* Vista de Edición de Bloque */
              <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right duration-300">
                <div className="flex flex-col gap-4">
                  <div className="h-1 w-12 bg-emerald-500 rounded-full"></div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 uppercase">Editar Bloque</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personaliza el diseño del contenido</p>
                </div>

                <div className="space-y-8">
                  {/* Colores */}
                  <div className="space-y-4">
                    <FieldLabel>Paleta de Colores</FieldLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-3xl space-y-3 relative">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block text-center">Fondo</span>
                        <button
                          onClick={() => setActiveColorPicker(activeColorPicker === 'bg' ? null : 'bg')}
                          className="w-full aspect-square rounded-xl border-2 border-gray-200 relative overflow-hidden transition-transform active:scale-90"
                          style={{ backgroundColor: activePage.blocks[activeBlockIndex].bgColor || brandColors.primary }}
                        />
                        {activeColorPicker === 'bg' && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveColorPicker(null)} />
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                {Object.entries(brandColors).map(([key, color]) => (
                                  <button
                                    key={key}
                                    onClick={() => {
                                      const newBlocks = [...activePage.blocks];
                                      newBlocks[activeBlockIndex].bgColor = color;
                                      handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                      setActiveColorPicker(null);
                                    }}
                                    className="w-full aspect-square rounded-xl border border-gray-100 relative flex items-center justify-center transition-transform active:scale-90"
                                    style={{ backgroundColor: color }}
                                  >
                                    {activePage.blocks[activeBlockIndex].bgColor === color && <Check className="w-4 h-4 text-white mix-blend-difference" />}
                                  </button>
                                ))}
                              </div>
                              <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                  <Palette className="w-4 h-4 text-gray-400" />
                                  <span className="text-[9px] font-bold text-gray-500 uppercase">Personalizado</span>
                                  <input
                                    type="color"
                                    className="hidden"
                                    value={activePage.blocks[activeBlockIndex].bgColor || brandColors.primary}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const newBlocks = [...activePage.blocks];
                                      newBlocks[activeBlockIndex].bgColor = e.target.value;
                                      handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                      setActiveColorPicker(null);
                                    }}
                                  />
                                </label>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="bg-gray-50 p-4 rounded-3xl space-y-3 relative">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block text-center">Texto</span>
                        <button
                          onClick={() => setActiveColorPicker(activeColorPicker === 'text' ? null : 'text')}
                          className="w-full aspect-square rounded-xl border-2 border-gray-200 relative overflow-hidden transition-transform active:scale-90"
                          style={{ backgroundColor: activePage.blocks[activeBlockIndex].textColor || '#ffffff' }}
                        />
                        {activeColorPicker === 'text' && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveColorPicker(null)} />
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                {['#ffffff', '#000000', ...Object.values(brandColors)].map((color) => (
                                  <button
                                    key={color}
                                    onClick={() => {
                                      const newBlocks = [...activePage.blocks];
                                      newBlocks[activeBlockIndex].textColor = color;
                                      handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                      setActiveColorPicker(null);
                                    }}
                                    className="w-full aspect-square rounded-xl border border-gray-100 relative flex items-center justify-center transition-transform active:scale-90"
                                    style={{ backgroundColor: color }}
                                  >
                                    {activePage.blocks[activeBlockIndex].textColor === color && <Check className="w-4 h-4 text-white mix-blend-difference" />}
                                  </button>
                                ))}
                              </div>
                              <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                  <Palette className="w-4 h-4 text-gray-400" />
                                  <span className="text-[9px] font-bold text-gray-500 uppercase">Personalizado</span>
                                  <input
                                    type="color"
                                    className="hidden"
                                    value={activePage.blocks[activeBlockIndex].textColor || '#ffffff'}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const newBlocks = [...activePage.blocks];
                                      newBlocks[activeBlockIndex].textColor = e.target.value;
                                      handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                      setActiveColorPicker(null);
                                    }}
                                  />
                                </label>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

{activePage.blocks[activeBlockIndex].type !== 'piechart' && (
<>
                   {/* Estilo de Bloque */}
                   <div className="space-y-4">
                     <FieldLabel>Estilo de Bloque</FieldLabel>
                           <div className="flex bg-gray-50 p-1.5 rounded-2xl gap-1">
                       {[
                         { id: 'standard', label: 'Estándar' },
                         { id: 'fade-top', label: 'Fundido' },
                         { id: 'transparent', label: 'Transparente' }
                       ].map(option => (
                         <button 
                           key={option.id}
                           onClick={() => {
                             const newBlocks = [...activePage.blocks];
                             newBlocks[activeBlockIndex].variant = option.id;
                             handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                           }}
                           className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${ (activePage.blocks[activeBlockIndex].variant || 'standard') === option.id ? 'bg-emerald-500 shadow-md text-white scale-105' : 'text-gray-400 hover:text-gray-600' }`}
                         >
                           {option.label}
                         </button>
                       ))}
                     </div>
                   </div>

                   {(activePage.blocks[activeBlockIndex].variant || 'standard') === 'fade-top' && (
                     <div className="space-y-4">
                       <FieldLabel>Altura del Fundido</FieldLabel>
                       <div className="bg-gray-50 p-4 rounded-3xl">
                         <input
                           type="range"
                           min="50"
                           max="100"
                           step="5"
                           value={activePage.blocks[activeBlockIndex].fadeStop ?? 85}
                           onChange={(e) => {
                             const newBlocks = [...activePage.blocks];
                             newBlocks[activeBlockIndex].fadeStop = Number(e.target.value);
                             handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                           }}
                           className="w-full accent-emerald-500"
                         />
                         <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2">
                           <span>50%</span>
                           <span>{activePage.blocks[activeBlockIndex].fadeStop ?? 85}%</span>
                           <span>100%</span>
                         </div>
                         <p className="text-[8px] font-bold text-gray-400 uppercase text-center mt-1">
                           El fundido siempre arranca al 50% del bloque
                         </p>
                       </div>
                     </div>
                   )}
</>
)}

                  {/* Image-specific Controls */}
                  {activePage.blocks[activeBlockIndex].type === 'image' && (
                    <>
                      {/* Toggle: Fondo del Bloque */}
                      <div className="flex items-center justify-between bg-gray-50 p-5 rounded-3xl">
                        <div>
                          <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest block">Fondo del Bloque</span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase">Contenedor de la imagen</span>
                        </div>
                        <button
                          onClick={() => {
                            const newBlocks = [...activePage.blocks];
                            newBlocks[activeBlockIndex].showImageBg = newBlocks[activeBlockIndex].showImageBg === false ? true : false;
                            handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                          }}
                          className={`w-14 h-7 rounded-full transition-all relative ${activePage.blocks[activeBlockIndex].showImageBg !== false ? 'bg-emerald-500' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${activePage.blocks[activeBlockIndex].showImageBg !== false ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      {/* Escala de Imagen - Solo sin fondo */}
                      {activePage.blocks[activeBlockIndex].showImageBg === false && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <FieldLabel>Escala de Imagen</FieldLabel>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {typeof activePage.blocks[activeBlockIndex].imageScale === 'number' ? activePage.blocks[activeBlockIndex].imageScale : 100}%
                            </span>
                          </div>
                          <div className="px-2">
                            <input
                              type="range"
                              min="20"
                              max="200"
                              step="5"
                              value={typeof activePage.blocks[activeBlockIndex].imageScale === 'number' ? activePage.blocks[activeBlockIndex].imageScale : 100}
                              onChange={(e) => {
                                const newBlocks = [...activePage.blocks];
                                newBlocks[activeBlockIndex].imageScale = parseInt(e.target.value);
                                handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                              }}
                              className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between mt-2">
                              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Pequeño</span>
                              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Completo</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                   )}

                   {/* Table-specific Controls */}
                   {activePage.blocks[activeBlockIndex].type === 'table' && (
                     <div className="space-y-6">
                       <div className="space-y-3">
                         <FieldLabel>Configuración de Tabla</FieldLabel>
                         <div className="flex gap-2">
                           <button
                             onClick={() => {
                               const newBlocks = [...activePage.blocks];
                               const td = { ...newBlocks[activeBlockIndex].tableData, columns: [...newBlocks[activeBlockIndex].tableData.columns], rows: [...newBlocks[activeBlockIndex].tableData.rows] };
                               const newId = `c${Date.now()}`;
                               td.columns.push({ id: newId, header: `Columna ${td.columns.length + 1}` });
                               td.rows = td.rows.map(r => ({
                                 ...r,
                                 cells: { ...r.cells, [newId]: '' },
                               }));
                               newBlocks[activeBlockIndex].tableData = td;
                               handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                             }}
                             className="flex-1 py-3 bg-gray-50 hover:bg-emerald-50 rounded-xl text-[10px] font-black text-gray-600 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
                           >
                             <Plus className="w-4 h-4" /> Columna
                           </button>
                           <button
                             onClick={() => {
                               const newBlocks = [...activePage.blocks];
                               const td = { ...newBlocks[activeBlockIndex].tableData, columns: [...newBlocks[activeBlockIndex].tableData.columns], rows: [...newBlocks[activeBlockIndex].tableData.rows] };
                               const newId = `r${Date.now()}`;
                               const cells = {};
                               td.columns.forEach(c => { cells[c.id] = ''; });
                               td.rows.push({ id: newId, cells });
                               newBlocks[activeBlockIndex].tableData = td;
                               handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                             }}
                             className="flex-1 py-3 bg-gray-50 hover:bg-emerald-50 rounded-xl text-[10px] font-black text-gray-600 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
                           >
                             <Plus className="w-4 h-4" /> Fila
                           </button>
                         </div>
                       </div>

                       <div className="h-px bg-gray-100" />

                        {/* Colores de tabla */}
                        <div className="bg-gray-50 p-3 rounded-3xl space-y-2">
                          <FieldLabel>Colores de Tabla</FieldLabel>
                          {[
                            { key: 'tableHeaderBg', prop: 'headerBgColor', label: 'Fondo Enc.', colors: Object.values(brandColors), def: brandColors.primary },
                            { key: 'tableHeaderText', prop: 'headerTextColor', label: 'Texto Enc.', colors: ['#ffffff', '#000000', ...Object.values(brandColors)], def: '#ffffff' },
                            { key: 'tableBorder', prop: 'borderColor', label: 'Borde', colors: ['#e5e4e7', '#d1d5db', '#9ca3af', '#6b7280', ...Object.values(brandColors)], def: '#e5e4e7' },
                            { key: 'tableAltRow', prop: 'alternateRowColor', label: 'Fila Alt.', colors: ['#f4f4f5', '#e5e4e7', '#f0fdf4', '#ffffff', ...Object.values(brandColors)], def: '#f4f4f5' },
                          ].map(({ key, prop, label, colors, def }) => (
                            <div key={key} className="relative flex items-center justify-between">
                              <span className="text-[9px] font-bold text-gray-600">{label}</span>
                              <button
                                onClick={() => setActiveColorPicker(activeColorPicker === key ? null : key)}
                                className="w-7 h-7 rounded-lg border-2 border-gray-200 transition-transform active:scale-90"
                                style={{ backgroundColor: activePage.blocks[activeBlockIndex].tableData?.[prop] || def }}
                              />
                              {activeColorPicker === key && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setActiveColorPicker(null)} />
                                  <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-50 min-w-[160px]">
                                    <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                                      {colors.map((color) => (
                                        <button
                                          key={color}
                                          onClick={() => {
                                            const newBlocks = [...activePage.blocks];
                                            newBlocks[activeBlockIndex].tableData = { ...newBlocks[activeBlockIndex].tableData, [prop]: color };
                                            handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                            setActiveColorPicker(null);
                                          }}
                                          className="w-7 h-7 rounded-lg border border-gray-100 transition-transform active:scale-90"
                                          style={{ backgroundColor: color }}
                                        >
                                          {(activePage.blocks[activeBlockIndex].tableData?.[prop] || def) === color && <Check className="w-3 h-3 mx-auto text-white mix-blend-difference" />}
                                        </button>
                                      ))}
                                    </div>
                                    <label className="flex items-center justify-center gap-1.5 p-1 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                      <Palette className="w-3 h-3 text-gray-400" />
                                      <span className="text-[7px] font-bold text-gray-500 uppercase">Personalizado</span>
                                      <input
                                        type="color"
                                        className="hidden"
                                        value={activePage.blocks[activeBlockIndex].tableData?.[prop] || def}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const newBlocks = [...activePage.blocks];
                                          newBlocks[activeBlockIndex].tableData = { ...newBlocks[activeBlockIndex].tableData, [prop]: e.target.value };
                                          handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                          setActiveColorPicker(null);
                                        }}
                                      />
                                    </label>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                       <div className="h-px bg-gray-100" />

                       {/* Import XLSX/CSV */}
                       <div className="space-y-3">
                         <FieldLabel>Importar Datos</FieldLabel>
                         <label className="flex items-center gap-3 bg-gray-50 hover:bg-emerald-50 rounded-2xl p-4 cursor-pointer transition-all border-2 border-dashed border-gray-200 hover:border-emerald-300">
                           <FileSpreadsheet className="w-5 h-5 text-gray-400" />
                           <div>
                             <span className="text-[10px] font-black text-gray-600 block">XLSX / CSV</span>
                             <span className="text-[8px] font-bold text-gray-400">Sobrescribe datos actuales</span>
                           </div>
                           <input
                             type="file"
                             className="hidden"
                             accept=".xlsx,.xls,.csv"
                             onChange={async (e) => {
                               const file = e.target.files[0];
                               if (!file) return;
                               try {
                                 const XLSX = await import('xlsx');
                                 const data = await file.arrayBuffer();
                                 const workbook = XLSX.read(data, { type: 'array' });
                                 const sheet = workbook.Sheets[workbook.SheetNames[0]];
                                 const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                                 if (json.length === 0) return;
                                 const headers = Object.keys(json[0]);
                                 const newColumns = headers.map((h, i) => ({
                                   id: `c${i + 1}`,
                                   header: h,
                                 }));
                                 const newRows = json.map((row) => {
                                   const cells = {};
                                   newColumns.forEach((col, i) => {
                                     cells[col.id] = String(headers.reduce((acc, h, idx) => {
                                       if (idx === i) return row[h];
                                       return acc;
                                     }, '') || '');
                                   });
                                   // simpler approach
                                   return {
                                     id: `r${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                     cells: Object.fromEntries(newColumns.map((col, i) => [col.id, String(row[headers[i]] || '')])),
                                   };
                                 });
                                 const newBlocks = [...activePage.blocks];
                                 newBlocks[activeBlockIndex].tableData = {
                                   ...newBlocks[activeBlockIndex].tableData,
                                   columns: newColumns,
                                   rows: newRows,
                                 };
                                 handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                               } catch (err) {
                                 console.error('Error importing file:', err);
                                 alert('Error al importar el archivo. Asegúrate de que sea un XLSX o CSV válido.');
                               }
                               e.target.value = '';
                             }}
                           />
                         </label>
                       </div>
                      </div>
                    )}

                    {/* Piechart-specific Controls */}
                    {activePage.blocks[activeBlockIndex].type === 'piechart' && (
                      <div className="space-y-6">
                        {/* Card Stats Toggle + Editing */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between bg-gray-50 p-5 rounded-3xl">
                            <div>
                              <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest block">Estadísticas de Tarjeta</span>
                              <span className="text-[8px] font-bold text-gray-400 uppercase">Mostrar título y estadísticas</span>
                            </div>
                            <button
                              onClick={() => {
                                const newBlocks = [...activePage.blocks];
                                newBlocks[activeBlockIndex].showCard = newBlocks[activeBlockIndex].showCard === false ? true : false;
                                handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                              }}
                              className={`w-14 h-7 rounded-full transition-all relative ${activePage.blocks[activeBlockIndex].showCard !== false ? 'bg-emerald-500' : 'bg-gray-200'}`}
                            >
                              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${activePage.blocks[activeBlockIndex].showCard !== false ? 'right-1' : 'left-1'}`} />
                            </button>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-3xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Filas (título + estadística)</span>
                              <button
                                onClick={() => {
                                  const newBlocks = [...activePage.blocks];
                                  const titles = (newBlocks[activeBlockIndex].pieTitle || 'MONTE\nLIMPIO\nTOTAL').split('\n');
                                  const stats = [...(newBlocks[activeBlockIndex].pieStats || ['2.33%', '97.67%', '4495 HAS.'])];
                                  titles.push('');
                                  stats.push('');
                                  newBlocks[activeBlockIndex].pieTitle = titles.join('\n');
                                  newBlocks[activeBlockIndex].pieStats = stats;
                                  handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                }}
                                className="p-1 hover:bg-emerald-50 rounded-lg transition-colors text-gray-400 hover:text-emerald-500"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            {(activePage.blocks[activeBlockIndex].pieTitle || 'MONTE\nLIMPIO\nTOTAL').split('\n').map((line, li) => (
                              <div key={li} className="flex items-center gap-2">
                                <input
                                  value={line}
                                  onChange={(e) => {
                                    const newBlocks = [...activePage.blocks];
                                    const titles = (newBlocks[activeBlockIndex].pieTitle || 'MONTE\nLIMPIO\nTOTAL').split('\n');
                                    titles[li] = e.target.value;
                                    newBlocks[activeBlockIndex].pieTitle = titles.join('\n');
                                    handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                  }}
                                  className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] font-black text-gray-700 uppercase outline-none focus:border-emerald-400"
                                  placeholder="Título"
                                />
                                <input
                                  value={(activePage.blocks[activeBlockIndex].pieStats || ['2.33%', '97.67%', '4495 HAS.'])[li] || ''}
                                  onChange={(e) => {
                                    const newBlocks = [...activePage.blocks];
                                    const stats = [...(newBlocks[activeBlockIndex].pieStats || ['2.33%', '97.67%', '4495 HAS.'])];
                                    stats[li] = e.target.value;
                                    newBlocks[activeBlockIndex].pieStats = stats;
                                    handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                  }}
                                  className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] font-black text-gray-700 outline-none focus:border-emerald-400"
                                  placeholder="Ej: 2.33%"
                                />
                                <button
                                  onClick={() => {
                                    const newBlocks = [...activePage.blocks];
                                    const titles = (newBlocks[activeBlockIndex].pieTitle || 'MONTE\nLIMPIO\nTOTAL').split('\n');
                                    const stats = [...(newBlocks[activeBlockIndex].pieStats || ['2.33%', '97.67%', '4495 HAS.'])];
                                    titles.splice(li, 1);
                                    stats.splice(li, 1);
                                    newBlocks[activeBlockIndex].pieTitle = titles.join('\n');
                                    newBlocks[activeBlockIndex].pieStats = stats;
                                    handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                  }}
                                  className="p-1 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="h-px bg-gray-100" />
                        <div className="space-y-3">
                          <FieldLabel>Configuración de Sectores</FieldLabel>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const newBlocks = [...activePage.blocks];
                                const slices = [...(newBlocks[activeBlockIndex].slices || [])];
                                const n = slices.length + 1;
                                const equalPct = Math.round(100 / n);
                                const adjusted = slices.map(s => ({ ...s, percentage: equalPct }));
                                adjusted.push({ id: `${Date.now()}`, label: `Sector ${n}`, percentage: 100 - equalPct * (n - 1), color: ['#ccff00', '#4a8df8', '#003399', '#f97316', '#a855f7', '#22c55e', '#ef4444', '#06b6d4'][(n - 1) % 8] });
                                newBlocks[activeBlockIndex].slices = adjusted;
                                handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                              }}
                              className="flex-1 py-3 bg-gray-50 hover:bg-emerald-50 rounded-xl text-[10px] font-black text-gray-600 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
                            >
                              <Plus className="w-4 h-4" /> Sector
                            </button>
                          </div>
                          <div className="space-y-2">
                            {((activePage.blocks[activeBlockIndex].slices || [])).map((slice, si) => (
                              <div key={slice.id} className="bg-gray-50 p-3 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                  <div
                                    className="w-4 h-4 rounded-full flex-none border border-gray-200"
                                    style={{ backgroundColor: slice.color }}
                                  />
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                      const newBlocks = [...activePage.blocks];
                                      const slices = [...newBlocks[activeBlockIndex].slices];
                                      slices[si] = { ...slices[si], label: e.currentTarget.innerText };
                                      newBlocks[activeBlockIndex].slices = slices;
                                      handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                    }}
                                    className="flex-1 bg-transparent border-none outline-none font-black text-[10px] uppercase tracking-wider p-0"
                                  >
                                    {slice.label}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const newBlocks = [...activePage.blocks];
                                      const slices = [...newBlocks[activeBlockIndex].slices];
                                      slices.splice(si, 1);
                                      if (slices.length > 0) {
                                        const sumNonLast = slices.slice(0, -1).reduce((s, sl) => s + sl.percentage, 0);
                                        slices[slices.length - 1].percentage = Math.max(0, 100 - sumNonLast);
                                      }
                                      newBlocks[activeBlockIndex].slices = slices;
                                      handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                    }}
                                    className="p-1 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Porcentaje</span>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={slice.percentage}
                                          onChange={(e) => {
                                            const newVal = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                            const newBlocks = [...activePage.blocks];
                                            const slices = [...newBlocks[activeBlockIndex].slices];
                                            slices[si] = { ...slices[si], percentage: newVal };
                                            if (si !== slices.length - 1) {
                                              const sumNonLast = slices.slice(0, -1).reduce((s, sl) => s + sl.percentage, 0);
                                              slices[slices.length - 1].percentage = Math.max(0, 100 - sumNonLast);
                                            }
                                            newBlocks[activeBlockIndex].slices = slices;
                                            handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                          }}
                                          className="w-12 text-center text-[10px] font-black text-gray-700 bg-white border border-gray-200 rounded-lg p-0.5 outline-none focus:border-emerald-400"
                                        />
                                        <span className="text-[10px] font-black text-gray-400">%</span>
                                      </div>
                                    </div>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      step="1"
                                      value={slice.percentage}
                                      onChange={(e) => {
                                        const newVal = parseInt(e.target.value);
                                        const newBlocks = [...activePage.blocks];
                                        const slices = [...newBlocks[activeBlockIndex].slices];
                                        slices[si] = { ...slices[si], percentage: newVal };
                                        if (si !== slices.length - 1) {
                                          const sumNonLast = slices.slice(0, -1).reduce((s, sl) => s + sl.percentage, 0);
                                          slices[slices.length - 1].percentage = Math.max(0, 100 - sumNonLast);
                                        }
                                        newBlocks[activeBlockIndex].slices = slices;
                                        handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                      }}
                                      className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                    />
                                  </div>
                                  <div className="relative">
                                    <button
                                      onClick={() => setActiveColorPicker(activeColorPicker === `pie-slice-${si}` ? null : `pie-slice-${si}`)}
                                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center"
                                      style={{ backgroundColor: slice.color }}
                                    >
                                      {activeColorPicker === `pie-slice-${si}` && <Palette className="w-3 h-3 text-white mix-blend-difference" />}
                                    </button>
                                    {activeColorPicker === `pie-slice-${si}` && (
                                      <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-50 min-w-[160px]">
                                        <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                                          {['#ccff00','#4a8df8','#003399','#f97316','#a855f7','#22c55e','#ef4444','#06b6d4','#eab308','#ec4899','#14b8a6','#8b5cf6','#f43f5e','#0ea5e9','#84cc16','#64748b'].map((color) => (
                                            <button
                                              key={color}
                                              onClick={() => {
                                                const newBlocks = [...activePage.blocks];
                                                const slices = [...newBlocks[activeBlockIndex].slices];
                                                slices[si] = { ...slices[si], color };
                                                newBlocks[activeBlockIndex].slices = slices;
                                                handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                                setActiveColorPicker(null);
                                              }}
                                              className="w-7 h-7 rounded-lg border border-gray-100 transition-transform active:scale-90"
                                              style={{ backgroundColor: color }}
                                            >
                                              {slice.color === color && <Check className="w-3 h-3 mx-auto text-white mix-blend-difference" />}
                                            </button>
                                          ))}
                                        </div>
                                        <label className="flex items-center justify-center gap-1.5 p-1 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                          <Palette className="w-3 h-3 text-gray-400" />
                                          <span className="text-[7px] font-bold text-gray-500 uppercase">Personalizado</span>
                                          <input
                                            type="color"
                                            className="hidden"
                                            value={slice.color}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                              const newBlocks = [...activePage.blocks];
                                              const slices = [...newBlocks[activeBlockIndex].slices];
                                              slices[si] = { ...slices[si], color: e.target.value };
                                              newBlocks[activeBlockIndex].slices = slices;
                                              handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                              setActiveColorPicker(null);
                                            }}
                                          />
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 p-5 rounded-3xl">
                          <div>
                            <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest block">Tabla de Rangos</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase">Mostrar tabla debajo del gráfico</span>
                          </div>
                          <button
                            onClick={() => {
                              const newBlocks = [...activePage.blocks];
                              newBlocks[activeBlockIndex].showTable = newBlocks[activeBlockIndex].showTable === false ? true : false;
                              handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                            }}
                            className={`w-14 h-7 rounded-full transition-all relative ${activePage.blocks[activeBlockIndex].showTable !== false ? 'bg-emerald-500' : 'bg-gray-200'}`}
                          >
                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${activePage.blocks[activeBlockIndex].showTable !== false ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <FieldLabel>Filas de la Tabla</FieldLabel>
                            <button
                              onClick={() => {
                                const newBlocks = [...activePage.blocks];
                                const td = [...(newBlocks[activeBlockIndex].tableData || [])];
                                td.push({ calc: '0% - 0%', desc: 'NUEVA DESCRIPCIÓN' });
                                newBlocks[activeBlockIndex].tableData = td;
                                handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                              }}
                              className="p-1 hover:bg-emerald-50 rounded-lg transition-colors text-gray-400 hover:text-emerald-500"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {(activePage.blocks[activeBlockIndex].tableData || []).map((row, ri) => (
                              <div key={ri} className="bg-gray-50 p-2 rounded-2xl flex items-start gap-2">
                                <div className="flex-1 space-y-1">
                                  <input
                                    value={row.calc}
                                    onChange={(e) => {
                                      const newBlocks = [...activePage.blocks];
                                      const td = [...newBlocks[activeBlockIndex].tableData];
                                      td[ri] = { ...td[ri], calc: e.target.value };
                                      newBlocks[activeBlockIndex].tableData = td;
                                      handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-[9px] font-black text-gray-700 uppercase tracking-wider outline-none focus:border-emerald-400"
                                    placeholder="Ej: 20% - 30%"
                                  />
                                  <input
                                    value={row.desc}
                                    onChange={(e) => {
                                      const newBlocks = [...activePage.blocks];
                                      const td = [...newBlocks[activeBlockIndex].tableData];
                                      td[ri] = { ...td[ri], desc: e.target.value };
                                      newBlocks[activeBlockIndex].tableData = td;
                                      handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-[8px] font-bold text-gray-600 uppercase tracking-wider outline-none focus:border-emerald-400"
                                    placeholder="Descripción"
                                  />
                                </div>
                                <button
                                  onClick={() => {
                                    const newBlocks = [...activePage.blocks];
                                    const td = [...newBlocks[activeBlockIndex].tableData];
                                    td.splice(ri, 1);
                                    newBlocks[activeBlockIndex].tableData = td;
                                    handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                                  }}
                                  className="p-1 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-500 mt-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="h-px bg-gray-100" />
                      </div>
                    )}

                    {/* Ancho del Bloque */}
                    {activePage.blocks[activeBlockIndex].type !== 'title' && activePage.blocks[activeBlockIndex].type !== 'piechart' && (
                    <div className="space-y-3">
                      <FieldLabel>Ancho del Bloque</FieldLabel>
                      <div className="bg-gray-50 p-4 rounded-3xl">
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={(() => {
                            const w = activePage.blocks[activeBlockIndex].width;
                            if (!w || w === 'full') return 100;
                            if (w === 'half') return 50;
                            if (w === 'quarter') return 25;
                            return w;
                          })()}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            const newBlocks = [...activePage.blocks];
                            newBlocks[activeBlockIndex].width = val;
                            handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                          }}
                          className="w-full accent-emerald-600"
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] font-bold text-gray-400">10%</span>
                          <span className="text-xs font-bold text-emerald-600">
                            {(() => {
                              const w = activePage.blocks[activeBlockIndex].width;
                              if (!w || w === 'full') return '100%';
                              if (w === 'half') return '50%';
                              if (w === 'quarter') return '25%';
                              return `${w}%`;
                            })()}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">100%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const w = activePage.blocks[activeBlockIndex].width;
                    return w && w !== 'full' && w !== 100;
                  })() && (
                      <div className="flex bg-gray-50 p-1 rounded-xl gap-1 mt-2">
                        {['left', 'center', 'right'].map(align => (
                          <button 
                            key={align}
                            onClick={() => {
                              const newBlocks = [...activePage.blocks];
                              newBlocks[activeBlockIndex].align = align;
                              handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${ (activePage.blocks[activeBlockIndex].align || 'left') === align ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400' }`}
                          >
                            {align.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}

                  <div className="h-px bg-gray-100"></div>

                  {/* Título Toggle */}
                  {activePage.blocks[activeBlockIndex].type !== 'title' && activePage?.type !== 'UBICACION' && (
                    <div className="flex items-center justify-between bg-gray-50 p-5 rounded-3xl">
                      <div>
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest block">Mostrar Título</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase">Encabezado del bloque</span>
                      </div>
                      <button 
                        onClick={() => {
                           const newBlocks = [...activePage.blocks];
                           newBlocks[activeBlockIndex].hideTitle = !newBlocks[activeBlockIndex].hideTitle;
                           handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                        }}
                        className={`w-14 h-7 rounded-full transition-all relative ${!activePage.blocks[activeBlockIndex].hideTitle ? 'bg-emerald-500' : 'bg-gray-200'}`}
                      >
                         <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${!activePage.blocks[activeBlockIndex].hideTitle ? 'right-1' : 'left-1'}`} />
                      </button>
                     </div>
                   )}

                  {/* Tamaño Título */}
                  {((activePage.blocks[activeBlockIndex].type !== 'title' && !activePage.blocks[activeBlockIndex].hideTitle && activePage?.type !== 'UBICACION')
                    || (activePage.blocks[activeBlockIndex].type === 'title' && activePage?.type === 'UBICACION')) && (
                     <div className="space-y-3">
                       <FieldLabel>Tamaño Título</FieldLabel>
                       <div className="bg-gray-50 p-4 rounded-3xl">
                         <input
                           type="range"
                           min="16"
                           max="80"
                           step="1"
                           value={typeof activePage.blocks[activeBlockIndex]?.titleSize === 'number' ? activePage.blocks[activeBlockIndex].titleSize : 58}
                           onChange={(e) => {
                             const val = parseInt(e.target.value);
                             const newBlocks = [...activePage.blocks];
                             newBlocks[activeBlockIndex].titleSize = val;
                             handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                           }}
                           className="w-full accent-emerald-600"
                         />
                         <div className="flex justify-between items-center mt-2">
                           <span className="text-[10px] font-bold text-gray-400">16px</span>
                           <span className="text-xs font-bold text-emerald-600">
                             {typeof activePage.blocks[activeBlockIndex]?.titleSize === 'number' ? activePage.blocks[activeBlockIndex].titleSize : 58}px
                           </span>
                           <span className="text-[10px] font-bold text-gray-400">80px</span>
                         </div>
                       </div>
                     </div>
                   )}
 
{activePage.blocks[activeBlockIndex].type !== 'piechart' && (
                        <>
                        {/* Estilo de Texto (Formato Parcial) */}
                        <div className="space-y-4">
                          <FieldLabel>Formato de Texto</FieldLabel>
                          <div className="flex bg-gray-50 p-1.5 rounded-[1.5rem] gap-1">
                            <button 
                              onMouseDown={(e) => {
                                e.preventDefault();
                                document.execCommand('bold', false);
                              }}
                              className={`flex-1 py-3 rounded-xl flex items-center justify-center transition-all ${ selectionFormat.bold ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400 hover:text-emerald-600 hover:bg-white/50' }`}
                              title="Negrita"
                            >
                              <Bold className="w-4 h-4" />
                            </button>
                            <button 
                              onMouseDown={(e) => {
                                e.preventDefault();
                                document.execCommand('italic', false);
                              }}
                              className={`flex-1 py-3 rounded-xl flex items-center justify-center transition-all ${ selectionFormat.italic ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400 hover:text-emerald-600 hover:bg-white/50' }`}
                              title="Cursiva"
                            >
                              <Italic className="w-4 h-4" />
                            </button>
                            <button 
                              onMouseDown={(e) => {
                                e.preventDefault();
                                document.execCommand('insertUnorderedList', false);
                              }}
                              className={`flex-1 py-3 rounded-xl flex items-center justify-center transition-all ${ selectionFormat.list ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400 hover:text-emerald-600 hover:bg-white/50' }`}
                              title="Lista"
                            >
                              <List className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase text-center">Selecciona texto en el editor para aplicar formato</p>
                        </div>
                        </>
)}

{activePage.blocks[activeBlockIndex].type !== 'title' && activePage.blocks[activeBlockIndex].type !== 'piechart' && (
                          <div className="space-y-3">
                            <FieldLabel>Tamaño Cuerpo de Texto</FieldLabel>
                           <div className="bg-gray-50 p-4 rounded-3xl">
                             <input
                               type="range"
                               min="10"
                               max="40"
                               step="1"
                               value={(() => {
                                 const s = activePage.blocks[activeBlockIndex].textSize;
                                 if (s === 'sm') return 16;
                                 if (s === 'lg') return 24;
                                 if (s === 'xl') return 32;
                                 if (typeof s === 'number') return s;
                                 return 20;
                               })()}
                               onChange={(e) => {
                                 const val = parseInt(e.target.value);
                                 const newBlocks = [...activePage.blocks];
                                 newBlocks[activeBlockIndex].textSize = val;
                                 handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                               }}
                               className="w-full accent-emerald-600"
                             />
                             <div className="flex justify-between items-center mt-2">
                               <span className="text-[10px] font-bold text-gray-400">10px</span>
                               <span className="text-xs font-bold text-emerald-600">
                                 {(() => {
                                   const s = activePage.blocks[activeBlockIndex].textSize;
                                   if (s === 'sm') return '16px';
                                   if (s === 'lg') return '24px';
                                   if (s === 'xl') return '32px';
                                   if (typeof s === 'number') return `${s}px`;
                                   return '20px';
                                 })()}
                               </span>
                               <span className="text-[10px] font-bold text-gray-400">40px</span>
                             </div>
                           </div>
                         </div>
                        )}

                    <div className="h-px bg-gray-100"></div>

                   {/* Imagen de Fondo (Persistent Editor) */}
                  <div className="space-y-4">
                     <FieldLabel>Imagen de Fondo de Página</FieldLabel>
                     {activePage.fondo_url ? (
                       <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-100">
                         <img src={activePage.fondo_url} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                           <label className="p-2 bg-white rounded-lg cursor-pointer hover:bg-emerald-50 text-emerald-600">
                             <Camera className="w-4 h-4" />
                             <input type="file" className="hidden" onChange={(e) => uploadImage(e, activePageIndex, 'fondo_url')} accept="image/*" />
                           </label>
                           <button 
                             onClick={() => handleUpdatePage(activePageIndex, 'fondo_url', '')}
                             className="p-2 bg-white rounded-lg hover:bg-red-50 text-red-600"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       </div>
                     ) : (
                       <label className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer">
                         <Upload className="w-5 h-5" />
                         <span className="text-[9px] font-black uppercase">Subir Fondo de Página</span>
                         <input type="file" className="hidden" onChange={(e) => uploadImage(e, activePageIndex, 'fondo_url')} accept="image/*" />
                       </label>
                     )}
                   </div>

                  <div className="pt-8">
                    <button 
                      onClick={() => {
                        if (confirm('¿Estás seguro de eliminar este bloque?')) {
                          const newBlocks = [...activePage.blocks];
                          newBlocks.splice(activeBlockIndex, 1);
                          handleUpdatePage(activePageIndex, 'blocks', newBlocks);
                          setActiveBlockIndex(null);
                        }
                      }}
                      className="w-full py-5 bg-red-50 text-red-500 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 border-2 border-red-100 hover:border-red-500"
                    >
                       <Trash2 className="w-5 h-5" /> Eliminar Bloque
                    </button>
                  </div>
                </div>
              </div>
            ) : isEditingPage && activePage ? (
              /* Vista de Configuración de Página (General) */
              <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right duration-300">
                <div className="flex flex-col gap-4">
                  <div className="h-1 w-12 bg-emerald-500 rounded-full"></div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 uppercase">Configuración</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personaliza el fondo y estilo de la página</p>
                </div>

                <div className="space-y-8">
                  <div className="h-px bg-gray-100"></div>

                  {/* Imagen de Fondo (Persistent Editor) */}
                  <div className="space-y-4">
                    <FieldLabel>{activePage.type === 'CARATULA' ? 'Imagen de Portada' : 'Imagen de Fondo de Página'}</FieldLabel>
                    {activePage.fondo_url || activePage.portada_url ? (
                      <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-100">
                        <img src={activePage.fondo_url || activePage.portada_url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="p-2 bg-white rounded-lg cursor-pointer hover:bg-emerald-50 text-emerald-600">
                            <Camera className="w-4 h-4" />
                            <input type="file" className="hidden" onChange={(e) => uploadImage(e, activePageIndex, activePage.type === 'CARATULA' ? 'portada_url' : 'fondo_url')} accept="image/*" />
                          </label>
                          <button 
                            onClick={() => handleUpdatePage(activePageIndex, activePage.type === 'CARATULA' ? 'portada_url' : 'fondo_url', '')}
                            className="p-2 bg-white rounded-lg hover:bg-red-50 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer">
                        <Upload className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase">Subir {activePage.type === 'CARATULA' ? 'Portada' : 'Fondo'}</span>
                        <input type="file" className="hidden" onChange={(e) => uploadImage(e, activePageIndex, activePage.type === 'CARATULA' ? 'portada_url' : 'fondo_url')} accept="image/*" />
                      </label>
                    )}
                  </div>

                  {activePage.type === 'CARATULA' && (
                    <div className="space-y-6">
                      <div className="h-px bg-gray-100"></div>
                      <div className="space-y-4">
                        <FieldLabel>Color del Degradado</FieldLabel>
                        <div className="bg-gray-50 p-4 rounded-3xl relative">
                          <button
                            onClick={() => setActiveColorPicker(activeColorPicker === 'overlay' ? null : 'overlay')}
                            className="w-16 h-16 rounded-xl border-2 border-gray-200 overflow-hidden transition-transform active:scale-90"
                            style={{ backgroundColor: activePage.overlay_color || '#8cc63f' }}
                          />
                          {activeColorPicker === 'overlay' && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveColorPicker(null)} />
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  {Object.entries(brandColors).map(([key, color]) => (
                                    <button
                                      key={key}
                                      onClick={() => {
                                        handleUpdatePage(activePageIndex, 'overlay_color', color);
                                        setActiveColorPicker(null);
                                      }}
                                      className="w-full aspect-square rounded-xl border border-gray-100 relative flex items-center justify-center transition-transform active:scale-90"
                                      style={{ backgroundColor: color }}
                                    >
                                      {(activePage.overlay_color || '#8cc63f') === color && <Check className="w-4 h-4 text-white mix-blend-difference" />}
                                    </button>
                                  ))}
                                </div>
                                <div className="relative flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50">
                                  <Palette className="w-4 h-4 text-gray-400" />
                                  <span className="text-[9px] font-bold text-gray-500 uppercase">Personalizado</span>
                                  <div className="ml-auto w-6 h-6 rounded-lg border border-gray-200 pointer-events-none" style={{ backgroundColor: activePage.overlay_color || '#8cc63f' }} />
                                  <input
                                    type="color"
                                    value={activePage.overlay_color || '#8cc63f'}
                                    onChange={(e) => {
                                      handleUpdatePage(activePageIndex, 'overlay_color', e.target.value);
                                      setActiveColorPicker(null);
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <FieldLabel>Opacidad del Degradado</FieldLabel>
                        <div className="bg-gray-50 p-4 rounded-3xl">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={activePage.overlay_opacidad ?? 85}
                            onChange={(e) => handleUpdatePage(activePageIndex, 'overlay_opacidad', Number(e.target.value))}
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2">
                            <span>0%</span>
                            <span>{activePage.overlay_opacidad ?? 85}%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-px bg-gray-100"></div>
                      <div className="space-y-4">
                        <FieldLabel>Tamaño de Logos</FieldLabel>
                        <div className="bg-gray-50 p-4 rounded-3xl">
                          <input
                            type="range"
                            min="50"
                            max="200"
                            value={activePage.logos_scale ?? 100}
                            onChange={(e) => handleUpdatePage(activePageIndex, 'logos_scale', Number(e.target.value))}
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2">
                            <span>50%</span>
                            <span>{activePage.logos_scale ?? 100}%</span>
                            <span>200%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Vista de Estructura del Informe (Thumbnails) */
              <>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Estructura del Informe</h3>
                    <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">{pagesData.length} págs</span>
                  </div>
                  
                  {pagesData.map((page, index) => (
                    <div
                      key={page.id}
                      onClick={() => {
                        setActivePageIndex(index);
                        document.getElementById(`page-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className={`relative aspect-[210/297] rounded-[2rem] cursor-pointer transition-all group
                            ${activePageIndex === index ? 'ring-[5px] ring-emerald-500 shadow-xl bg-emerald-500' : 'border border-gray-100 opacity-60 hover:opacity-100 bg-white'}`}
                    >
                      <span className="absolute -top-3 -left-3 w-8 h-8 bg-white border-2 border-gray-100 text-emerald-800 flex justify-center items-center rounded-2xl text-[10px] font-black shadow-lg z-10">{index + 1}</span>
                      
                      {/* Botones de Reordenar */}
                      <div className="absolute top-1/2 -right-3 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
                        <button 
                          onClick={(e) => { e.stopPropagation(); movePage(index, 'up'); }}
                          disabled={index === 0}
                          className="p-1.5 bg-white border-2 border-gray-50 rounded-xl text-gray-400 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-lg transition-all disabled:opacity-0 disabled:pointer-events-none"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); movePage(index, 'down'); }}
                          disabled={index === pagesData.length - 1}
                          className="p-1.5 bg-white border-2 border-gray-50 rounded-xl text-gray-400 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-lg transition-all disabled:opacity-0 disabled:pointer-events-none"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      <button onClick={(e) => { e.stopPropagation(); removePage(index); }} className="absolute -top-3 -right-3 p-2 bg-white border-2 border-red-50 rounded-2xl text-red-400 hover:bg-red-500 hover:text-white shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10">
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <ThumbnailPreview page={page} pageIndex={index} />

                      <div className="absolute bottom-4 inset-x-4 bg-white/90 backdrop-blur-md py-2 px-3 rounded-xl border border-gray-100 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText.trim();
                            handleUpdatePage(index, 'pageTitle', val || page.type);
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                          className="text-[8px] font-black text-gray-400 uppercase tracking-widest outline-none focus:text-emerald-600"
                        >
                          {page.pageTitle || page.type}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={() => setShowPageSelector(true)}
                    className="w-full group relative aspect-[3/4] rounded-3xl border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center gap-3 p-6 text-gray-400 hover:text-emerald-600"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                      <Layout className="w-6 h-6" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest">Añadir Página</div>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white border border-gray-100 rounded-full text-[8px] font-black text-gray-300 group-hover:text-emerald-400 transition-colors uppercase whitespace-nowrap">Fin del Informe</div>
                  </button>
                </div>

              </>
            )}


          </div>
        </div>

        {/* Editor Principal */}
        <div className="flex-1 overflow-auto bg-gray-100 flex flex-col items-center py-20 px-6 gap-20 custom-scrollbar" style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)", backgroundSize: "30px 30px" }}>
          {pagesData.map((page, pageIndex) => (
            <div
              key={page.id}
              id={`page-${pageIndex}`}
              onClickCapture={() => {
                setActivePageIndex(pageIndex);
                setIsEditingPage(true);
                if (page.type === 'UBICACION') {
                  if (page.blocks) {
                    setIsEditingMap(false);
                    setActiveBlockIndex(0);
                  } else {
                    setIsEditingMap(true);
                    setActiveBlockIndex(null);
                  }
                } else if (page.type === 'DINAMICA') {
                  setIsEditingMap(false);
                  setActiveBlockIndex(0);
                } else {
                  setIsEditingMap(false);
                  setActiveBlockIndex(null);
                }
              }}
              className={`bg-white shadow-[0_50px_100px_rgba(0,0,0,0.1)] relative rounded-[2px] overflow-hidden transition-all duration-500 shrink-0
                   ${activePageIndex === pageIndex ? 'scale-100 z-10' : 'scale-[0.98] opacity-80 blur-[1px]'}`}
              style={{ width: '210mm', height: '297mm' }}
            >
              {page.type === 'CARATULA' && <CaratulaPage page={page} pageIndex={pageIndex} updatePage={handleUpdatePage} isEditMode={true} uploadImage={uploadImage} campoMetadata={campoMetadata} settings={settings} acquireLock={acquireLock} releaseLock={releaseLock} isLockedByOther={isLockedByOther} activeLocks={activeLocks} />}
              {page.type === 'UBICACION' && <UbicacionPage page={page} pageIndex={pageIndex} updatePage={handleUpdatePage} isEditMode={true} uploadImage={uploadImage} setIsEditingMap={setIsEditingMap} activeBlockIndex={activeBlockIndex} setActiveBlockIndex={setActiveBlockIndex} settings={settings} acquireLock={acquireLock} releaseLock={releaseLock} isLockedByOther={isLockedByOther} activeLocks={activeLocks} />}
              {page.type === 'SITUACION_ACTUAL' && <SituacionActualPage page={page} pageIndex={pageIndex} updatePage={handleUpdatePage} isEditMode={true} uploadImage={uploadImage} settings={settings} acquireLock={acquireLock} releaseLock={releaseLock} isLockedByOther={isLockedByOther} activeLocks={activeLocks} />}
              {page.type === 'DINAMICA' && <DinamicaPage page={page} pageIndex={pageIndex} updatePage={handleUpdatePage} isEditMode={true} uploadImage={uploadImage} activeBlockIndex={activeBlockIndex} setActiveBlockIndex={setActiveBlockIndex} settings={settings} acquireLock={acquireLock} releaseLock={releaseLock} isLockedByOther={isLockedByOther} activeLocks={activeLocks} />}
              {page.type === 'ANALISIS_SUELO' && <AnalisisSueloPage page={page} pageIndex={pageIndex} updatePage={handleUpdatePage} updatePageSlice={updatePageSlice} addSlice={addSlice} uploadImage={uploadImage} settings={settings} acquireLock={acquireLock} releaseLock={releaseLock} isLockedByOther={isLockedByOther} activeLocks={activeLocks} />}
              {page.type === 'TEXTO_FOTOS' && <TextoFotosPage page={page} pageIndex={pageIndex} updatePage={handleUpdatePage} settings={settings} acquireLock={acquireLock} releaseLock={releaseLock} isLockedByOther={isLockedByOther} activeLocks={activeLocks} />}
            </div>
          ))}
        </div>
      </div>

      {/* Modal Selector */}
      {showPageSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
          <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md" onClick={() => setShowPageSelector(false)}></div>
          <div className="relative w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase">Añadir Página</h2>
                <p className="text-xs font-bold text-gray-400 uppercase mt-1">Selecciona el diseño del nuevo contenido</p>
              </div>
              <button onClick={() => setShowPageSelector(false)} className="p-4 bg-white hover:bg-gray-100 rounded-2xl shadow-sm"><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: 'CARATULA', name: 'Carátula', desc: 'Portada principal con título e imagen destacada.', icon: Layout, color: 'emerald' },
                  { id: 'UBICACION', name: 'Ubicación', desc: 'Mapa detallado con coordenadas y accesos.', icon: MapIcon, color: 'blue' },
                  { id: 'SITUACION_ACTUAL', name: 'Situación Actual', desc: 'Resumen visual con fotos y observaciones.', icon: ImageIcon, color: 'amber' },
                  { id: 'DINAMICA', name: 'Página Dinámica', desc: 'Bloques flexibles de texto e imágenes.', icon: Layers, color: 'purple' },
                  { id: 'TEXTO_FOTOS', name: 'Contenido Mixto', desc: 'Texto clásico con galería de fotos.', icon: Type, color: 'rose' },
                ].filter(item => {
                  // Caratula y Ubicación son siempre obligatorias/visibles
                  if (['CARATULA', 'UBICACION'].includes(item.id)) return true;
                  // Para las demás, verificamos settings. Si no hay settings o el campo no existe, asumimos true
                  return settings?.enabled_pages?.[item.id] !== false;
                }).map((item) => (
                  <button key={item.id} onClick={() => addPage(item.id, campoMetadata)} className="group flex flex-col bg-gray-50 hover:bg-white rounded-[32px] border border-gray-100 hover:border-emerald-200 p-6 transition-all hover:shadow-xl text-left active:scale-[0.98]">
                    <div className={`w-14 h-14 rounded-2xl bg-${item.color}-100 text-${item.color}-600 flex items-center justify-center mb-6`}><item.icon className="w-7 h-7" /></div>
                    <h4 className="text-lg font-black text-gray-900 uppercase mb-2">{item.name}</h4>
                    <p className="text-xs font-medium text-gray-500 leading-relaxed mb-6">{item.desc}</p>
                    <div className="mt-auto w-full aspect-video bg-white rounded-2xl border border-gray-100 flex items-center justify-center"><item.icon className="w-10 h-10 text-gray-100" /></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de Exportación */}
      {searchParams.get('export') === 'true' && (
        <div className="fixed inset-0 z-[999] bg-emerald-950/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl animate-bounce">
              <Download className="w-10 h-10" />
            </div>
            <div className="absolute inset-0 bg-emerald-400 rounded-[2rem] animate-ping opacity-20"></div>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Generando Documento PDF</h2>
          <p className="text-emerald-300 font-bold uppercase tracking-[0.2em] text-sm animate-pulse flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            No cierres esta ventana...
          </p>
          <div className="mt-12 w-64 h-1.5 bg-emerald-900/50 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 animate-progress-indefinite"></div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children, required }) {
  return <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 px-1">{children}{required && <span className="text-emerald-500 ml-0.5">*</span>}</label>;
}
