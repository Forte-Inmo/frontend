import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import {
  Save, ChevronLeft, Plus, Trash2, Layout, Map as MapIcon,
  Image as ImageIcon, Type, PieChart, Settings, Layers,
  Camera, Upload, X, Bold, Italic, List, MapPin, Check,
  ChevronUp, ChevronDown, LogOut, Loader2
} from 'lucide-react';
import { usePageEditor } from '../hooks/usePageEditor';

import CaratulaPage from '../components/ReportPages/CaratulaPage';
import UbicacionPage from '../components/ReportPages/UbicacionPage';
import SituacionActualPage from '../components/ReportPages/SituacionActualPage';
import DinamicaPage from '../components/ReportPages/DinamicaPage';
import AnalisisSueloPage from '../components/ReportPages/AnalisisSueloPage';
import TextoFotosPage from '../components/ReportPages/TextoFotosPage';

const savePlantilla = async (pagesData, setSaveStatus, id) => {
  setSaveStatus('saving');
  try {
    const { error } = await supabase
      .from('plantillas')
      .update({ pages_data: pagesData })
      .eq('id', id);
    if (error) throw error;
    setSaveStatus('saved');
  } catch (error) {
    console.error('Error saving plantilla:', error);
    setSaveStatus('error');
  }
};

export default function PlantillaBuilder() {
  const { plantillaId: id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [plantilla, setPlantilla] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);

  const brandColors = (settings?.brand_colors && Object.keys(settings.brand_colors).length > 0) ? settings.brand_colors : {
    primary: '#107549', secondary: '#003399', accent: '#ccff00', dark: '#001a4d'
  };

  const handleSave = useCallback((data, setStatus) => savePlantilla(data, setStatus, id), [id]);

  const {
    pagesData, setPagesData,
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
    updatePageSlice, addSlice,
    uploadImage,
  } = usePageEditor({ id, saveFn: handleSave });

  useEffect(() => {
    if (!id || id === 'nueva') {
      setIsNew(true);
      setLoading(false);
      return;
    }
    fetchPlantilla();
  }, [id]);

  const fetchPlantilla = async () => {
    try {
      const { data, error } = await supabase
        .from('plantillas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPlantilla(data);
      if (data.pages_data && data.pages_data.length > 0) {
        setPagesData(data.pages_data);
      }
      setLoading(false);
      setTimeout(() => { isFirstLoad.current = false; }, 1000);
    } catch (error) {
      console.error('Error fetching plantilla:', error);
      setLoading(false);
    }
  };

  const createNewPlantilla = async () => {
    try {
      const nombre = prompt('Nombre de la plantilla:');
      if (!nombre) { navigate('/dashboard/ajustes'); return; }

      const { data, error } = await supabase
        .from('plantillas')
        .insert([{ nombre, pages_data: [] }])
        .select()
        .single();

      if (error) throw error;
      navigate(`/dashboard/plantillas/${data.id}`, { replace: true });
    } catch (error) {
      console.error('Error creating plantilla:', error);
    }
  };

  const saveName = async (e) => {
    const nombre = e.target.value;
    if (!nombre || !id) return;
    try {
      await supabase.from('plantillas').update({ nombre }).eq('id', id);
    } catch (error) {
      console.error('Error saving name:', error);
    }
  };

  useEffect(() => {
    if (isNew) {
      createNewPlantilla();
    }
  }, [isNew]);

  if (isNew || loading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (loading) return <div className="p-10 text-center flex h-screen items-center justify-center text-emerald-800 font-bold text-xl">Cargando Plantilla...</div>;

  const activePage = pagesData[activePageIndex];

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col font-sans">
      <div className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-6">
          {(isEditingMap || activeBlockIndex !== null || isEditingPage) && (
            <button
              onClick={() => { setIsEditingMap(false); setActiveBlockIndex(null); setIsEditingPage(false); }}
              className="p-3 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100 animate-in fade-in slide-in-from-left duration-200"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
          )}
          <div className="h-10 w-[1px] bg-gray-100"></div>
          <div>
            <input
              defaultValue={plantilla?.nombre || 'Plantilla'}
              onBlur={saveName}
              className="text-sm font-black text-gray-900 tracking-tight uppercase bg-transparent border-b-2 border-transparent focus:border-emerald-500 focus:outline-none"
            />
            <div className="text-[10px] text-gray-400 tracking-[0.3em] font-black uppercase mt-0.5">PLANTILLA</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl border bg-gray-50/50">
            {saveStatus === 'saved' && <span className="text-emerald-600 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Sincronizado</span>}
            {saveStatus === 'saving' && <span className="text-amber-600 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Guardando...</span>}
          </div>

          <button
            onClick={() => navigate('/dashboard/ajustes')}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest border border-red-100 hover:border-red-500 shadow-sm group"
          >
            <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" /> Salir
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[380px] shrink-0 bg-white border-r border-gray-200 flex flex-col z-10 shadow-xl shadow-gray-100/50 overflow-hidden">
          <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
            {isEditingPage && isEditingMap && activePage?.type === 'UBICACION' ? (
              <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right duration-300">
                <div className="flex flex-col gap-4">
                  <div className="h-1 w-12 bg-emerald-500 rounded-full"></div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 uppercase">Editar Mapa</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personalizá colores del mapa y marcador</p>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <FieldLabel>Color del Marcador</FieldLabel>
                    <div className="bg-gray-50 p-4 rounded-3xl">
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(brandColors).map(([key, color]) => (
                          <button
                            key={key}
                            onClick={() => updatePage(activePageIndex, 'pin_color', color)}
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

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <FieldLabel>Estilo de Título</FieldLabel>
                      <div className="bg-gray-50 p-4 rounded-[2rem] space-y-4">
                        <div className="flex bg-white p-1.5 rounded-2xl">
                          {[40, 50, 58, 70].map(size => (
                            <button
                              key={size}
                              onClick={() => updatePage(activePageIndex, 'titulo_size', size)}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${(activePage.titulo_size || 58) === size ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(brandColors).map(([key, color]) => (
                            <button
                              key={key}
                              onClick={() => updatePage(activePageIndex, 'titulo_color', color)}
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
                              onClick={() => updatePage(activePageIndex, 'descripcion_size', size)}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${(activePage.descripcion_size || 26) === size ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(brandColors).map(([key, color]) => (
                            <button
                              key={key}
                              onClick={() => updatePage(activePageIndex, 'descripcion_color', color)}
                              className="w-full aspect-square rounded-xl border border-gray-100 flex items-center justify-center transition-transform active:scale-90"
                              style={{ backgroundColor: color }}
                            >
                              {(activePage.descripcion_color || '#ffffff') === color && <Check className="w-3 h-3 text-white mix-blend-difference" />}
                            </button>
                          ))}
                        </div>

                        <div className="h-px bg-gray-200 mx-2"></div>

                        <div className="flex bg-white p-1.5 rounded-2xl gap-1">
                          <button
                            onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false); }}
                            className={`flex-1 py-2 rounded-xl flex items-center justify-center transition-all ${selectionFormat.bold ? 'bg-gray-100 text-emerald-600' : 'text-gray-400 hover:text-emerald-600'}`}
                          >
                            <Bold className="w-4 h-4" />
                          </button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic', false); }}
                            className={`flex-1 py-2 rounded-xl flex items-center justify-center transition-all ${selectionFormat.italic ? 'bg-gray-100 text-emerald-600' : 'text-gray-400 hover:text-emerald-600'}`}
                          >
                            <Italic className="w-4 h-4" />
                          </button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList', false); }}
                            className={`flex-1 py-2 rounded-xl flex items-center justify-center transition-all ${selectionFormat.list ? 'bg-gray-100 text-emerald-600' : 'text-gray-400 hover:text-emerald-600'}`}
                          >
                            <List className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100"></div>

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
                                  updatePage(activePageIndex, 'deptColors', deptColors);
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
                                  updatePage(activePageIndex, 'deptTextColors', deptTextColors);
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
                            onClick={() => updatePage(activePageIndex, activePage.type === 'CARATULA' ? 'portada_url' : 'fondo_url', '')}
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
            ) : isEditingPage && activeBlockIndex !== null && activePage?.type === 'DINAMICA' && activePage.blocks[activeBlockIndex] ? (
              <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right duration-300">
                <div className="flex flex-col gap-4">
                  <div className="h-1 w-12 bg-emerald-500 rounded-full"></div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 uppercase">Editar Bloque</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personaliza el diseño del contenido</p>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <FieldLabel>Paleta de Colores</FieldLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-3xl space-y-3">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block text-center">Fondo</span>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(brandColors).map(([key, color]) => (
                            <button
                              key={key}
                              onClick={() => {
                                const newBlocks = [...activePage.blocks];
                                newBlocks[activeBlockIndex].bgColor = color;
                                updatePage(activePageIndex, 'blocks', newBlocks);
                              }}
                              className="w-full aspect-square rounded-xl border border-gray-100 relative flex items-center justify-center transition-transform active:scale-90"
                              style={{ backgroundColor: color }}
                            >
                              {activePage.blocks[activeBlockIndex].bgColor === color && <Check className="w-4 h-4 text-white mix-blend-difference" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-3xl space-y-3">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block text-center">Texto</span>
                        <div className="grid grid-cols-2 gap-2">
                          {['#ffffff', '#000000', '#ccff00', '#107549'].map((color) => (
                            <button
                              key={color}
                              onClick={() => {
                                const newBlocks = [...activePage.blocks];
                                newBlocks[activeBlockIndex].textColor = color;
                                updatePage(activePageIndex, 'blocks', newBlocks);
                              }}
                              className="w-full aspect-square rounded-xl border border-gray-100 relative flex items-center justify-center transition-transform active:scale-90"
                              style={{ backgroundColor: color }}
                            >
                              {activePage.blocks[activeBlockIndex].textColor === color && <Check className="w-4 h-4 text-white mix-blend-difference" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

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
                            updatePage(activePageIndex, 'blocks', newBlocks);
                          }}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${(activePage.blocks[activeBlockIndex].variant || 'standard') === option.id ? 'bg-emerald-500 shadow-md text-white scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activePage.blocks[activeBlockIndex].type === 'image' && (
                    <>
                      <div className="flex items-center justify-between bg-gray-50 p-5 rounded-3xl">
                        <div>
                          <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest block">Fondo del Bloque</span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase">Contenedor de la imagen</span>
                        </div>
                        <button
                          onClick={() => {
                            const newBlocks = [...activePage.blocks];
                            newBlocks[activeBlockIndex].showImageBg = newBlocks[activeBlockIndex].showImageBg === false ? true : false;
                            updatePage(activePageIndex, 'blocks', newBlocks);
                          }}
                          className={`w-14 h-7 rounded-full transition-all relative ${activePage.blocks[activeBlockIndex].showImageBg !== false ? 'bg-emerald-500' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${activePage.blocks[activeBlockIndex].showImageBg !== false ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

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
                              min="20" max="200" step="5"
                              value={typeof activePage.blocks[activeBlockIndex].imageScale === 'number' ? activePage.blocks[activeBlockIndex].imageScale : 100}
                              onChange={(e) => {
                                const newBlocks = [...activePage.blocks];
                                newBlocks[activeBlockIndex].imageScale = parseInt(e.target.value);
                                updatePage(activePageIndex, 'blocks', newBlocks);
                              }}
                              className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activePage.blocks[activeBlockIndex].type !== 'title' && (
                    <div className="space-y-4">
                      <FieldLabel>Ancho del Bloque</FieldLabel>
                      <div className="flex bg-gray-50 p-1.5 rounded-2xl gap-1">
                        {[
                          { id: 'full', label: '1/1' },
                          { id: 'half', label: '1/2' },
                          { id: 'custom', label: 'Custom' }
                        ].map(option => {
                          const currentW = activePage.blocks[activeBlockIndex].width || 'full';
                          const isActive = option.id === 'custom'
                            ? (typeof currentW === 'number' || currentW === 'quarter')
                            : currentW === option.id;
                          return (
                            <button
                              key={option.id}
                              onClick={() => {
                                const newBlocks = [...activePage.blocks];
                                newBlocks[activeBlockIndex].width = option.id === 'custom' ? 25 : option.id;
                                updatePage(activePageIndex, 'blocks', newBlocks);
                              }}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${isActive ? 'bg-white shadow-md text-emerald-600 scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      {(() => {
                        const w = activePage.blocks[activeBlockIndex].width || 'full';
                        return (typeof w === 'number' || w === 'quarter');
                      })() && (
                        <div className="px-1 mt-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ancho Manual</span>
                            <span className="text-[10px] font-black text-emerald-600">
                              {activePage.blocks[activeBlockIndex].width === 'quarter' ? '25%' : `${activePage.blocks[activeBlockIndex].width}%`}
                            </span>
                          </div>
                          <input type="range" min="10" max="100" step="5"
                            value={activePage.blocks[activeBlockIndex].width === 'quarter' ? 25 : activePage.blocks[activeBlockIndex].width}
                            onChange={(e) => {
                              const newBlocks = [...activePage.blocks];
                              newBlocks[activeBlockIndex].width = parseInt(e.target.value);
                              updatePage(activePageIndex, 'blocks', newBlocks);
                            }}
                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {(activePage.blocks[activeBlockIndex].width && activePage.blocks[activeBlockIndex].width !== 'full') && (
                    <div className="flex bg-gray-50 p-1 rounded-xl gap-1 mt-2">
                      {['left', 'center', 'right'].map(align => (
                        <button
                          key={align}
                          onClick={() => {
                            const newBlocks = [...activePage.blocks];
                            newBlocks[activeBlockIndex].align = align;
                            updatePage(activePageIndex, 'blocks', newBlocks);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${(activePage.blocks[activeBlockIndex].align || 'left') === align ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400'}`}
                        >
                          {align.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="h-px bg-gray-100"></div>

                  {activePage.blocks[activeBlockIndex].type !== 'title' && (
                    <>
                      <div className="flex items-center justify-between bg-gray-50 p-5 rounded-3xl">
                        <div>
                          <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest block">Mostrar Título</span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase">Encabezado del bloque</span>
                        </div>
                        <button
                          onClick={() => {
                            const newBlocks = [...activePage.blocks];
                            newBlocks[activeBlockIndex].hideTitle = !newBlocks[activeBlockIndex].hideTitle;
                            updatePage(activePageIndex, 'blocks', newBlocks);
                          }}
                          className={`w-14 h-7 rounded-full transition-all relative ${!newBlocks[activeBlockIndex].hideTitle ? 'bg-emerald-500' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${!newBlocks[activeBlockIndex].hideTitle ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <FieldLabel>Formato de Texto</FieldLabel>
                        <div className="flex bg-gray-50 p-1.5 rounded-[1.5rem] gap-1">
                          <button
                            onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false); }}
                            className={`flex-1 py-3 rounded-xl flex items-center justify-center transition-all ${selectionFormat.bold ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400 hover:text-emerald-600 hover:bg-white/50'}`}
                          >
                            <Bold className="w-4 h-4" />
                          </button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic', false); }}
                            className={`flex-1 py-3 rounded-xl flex items-center justify-center transition-all ${selectionFormat.italic ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400 hover:text-emerald-600 hover:bg-white/50'}`}
                          >
                            <Italic className="w-4 h-4" />
                          </button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList', false); }}
                            className={`flex-1 py-3 rounded-xl flex items-center justify-center transition-all ${selectionFormat.list ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400 hover:text-emerald-600 hover:bg-white/50'}`}
                          >
                            <List className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="h-px bg-gray-100"></div>

                  <div className="space-y-6">
                    {!activePage.blocks[activeBlockIndex].hideTitle && (
                      <div className="space-y-3">
                        <FieldLabel>Tamaño Título</FieldLabel>
                        <div className="flex bg-gray-50 p-1.5 rounded-[1.5rem]">
                          {['sm', 'md', 'lg', 'xl'].map(size => (
                            <button
                              key={size}
                              onClick={() => {
                                const newBlocks = [...activePage.blocks];
                                newBlocks[activeBlockIndex].titleSize = size;
                                updatePage(activePageIndex, 'blocks', newBlocks);
                              }}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${(activePage.blocks[activeBlockIndex].titleSize || 'md') === size ? 'bg-white shadow-md text-emerald-600 scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              {size.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activePage.blocks[activeBlockIndex].type !== 'title' && (
                      <div className="space-y-3">
                        <FieldLabel>Tamaño Cuerpo de Texto</FieldLabel>
                        <div className="flex bg-gray-50 p-1.5 rounded-[1.5rem]">
                          {['sm', 'md', 'lg', 'xl'].map(size => (
                            <button
                              key={size}
                              onClick={() => {
                                const newBlocks = [...activePage.blocks];
                                newBlocks[activeBlockIndex].textSize = size;
                                updatePage(activePageIndex, 'blocks', newBlocks);
                              }}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${(activePage.blocks[activeBlockIndex].textSize || 'md') === size ? 'bg-white shadow-md text-emerald-600 scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              {size.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-gray-100"></div>

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
                          <button onClick={() => updatePage(activePageIndex, 'fondo_url', '')} className="p-2 bg-white rounded-lg hover:bg-red-50 text-red-600">
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
                          updatePage(activePageIndex, 'blocks', newBlocks);
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
                          <button onClick={() => updatePage(activePageIndex, activePage.type === 'CARATULA' ? 'portada_url' : 'fondo_url', '')} className="p-2 bg-white rounded-lg hover:bg-red-50 text-red-600">
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
            ) : (
              <>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Estructura de la Plantilla</h3>
                    <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">{pagesData.length} págs</span>
                  </div>

                  {pagesData.map((page, index) => (
                    <div
                      key={page.id}
                      onClick={() => {
                        setActivePageIndex(index);
                        setIsEditingPage(true);
                        if (page.type === 'UBICACION') { setIsEditingMap(true); setActiveBlockIndex(null); }
                        else if (page.type === 'DINAMICA') { setIsEditingMap(false); setActiveBlockIndex(0); }
                        else { setIsEditingMap(false); setActiveBlockIndex(null); }
                        document.getElementById(`page-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className={`relative h-[180px] bg-white rounded-[2rem] cursor-pointer transition-all flex flex-col items-center justify-center p-4 group
                        ${activePageIndex === index ? 'ring-4 ring-emerald-500 ring-offset-4 shadow-xl' : 'border border-gray-100 opacity-60 hover:opacity-100'}`}
                    >
                      <span className="absolute -top-3 -left-3 w-8 h-8 bg-white border-2 border-gray-100 text-emerald-800 flex justify-center items-center rounded-2xl text-[10px] font-black shadow-lg z-10">{index + 1}</span>

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

                      <div className="w-full h-full bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden">
                        {page.type === 'CARATULA' && (page.portada_url ? <img src={page.portada_url} className="w-full h-full object-cover" /> : <Layout className="w-8 h-8 text-gray-200" />)}
                        {page.type === 'UBICACION' && (page.mapa_url ? <img src={page.mapa_url} className="w-full h-full object-cover" /> : <MapIcon className="w-8 h-8 text-gray-200" />)}
                        {page.type === 'SITUACION_ACTUAL' && (page.fondo_url ? <img src={page.fondo_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-gray-200" />)}
                        {page.type === 'DINAMICA' && (page.fondo_url ? <img src={page.fondo_url} className="w-full h-full object-cover" /> : <Layout className="w-8 h-8 text-gray-200" />)}
                        {page.type === 'TEXTO_FOTOS' && <Type className="w-8 h-8 text-gray-200" />}
                        {page.type === 'ANALISIS_SUELO' && <PieChart className="w-8 h-8 text-gray-200" />}
                      </div>

                      <div className="absolute bottom-4 inset-x-4 bg-white/90 backdrop-blur-md py-2 px-3 rounded-xl border border-gray-100 text-center">
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{page.type}</div>
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
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white border border-gray-100 rounded-full text-[8px] font-black text-gray-300 group-hover:text-emerald-400 transition-colors uppercase whitespace-nowrap">Fin de la Plantilla</div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100 flex flex-col items-center py-20 px-6 gap-20 custom-scrollbar" style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)", backgroundSize: "30px 30px" }}>
          {pagesData.map((page, pageIndex) => (
            <div
              key={page.id}
              id={`page-${pageIndex}`}
              onClick={() => {
                setActivePageIndex(pageIndex);
                setIsEditingPage(true);
                if (page.type === 'UBICACION') { setIsEditingMap(true); setActiveBlockIndex(null); }
                else if (page.type === 'DINAMICA') { setIsEditingMap(false); setActiveBlockIndex(0); }
                else { setIsEditingMap(false); setActiveBlockIndex(null); }
                document.getElementById(`page-${pageIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className={`bg-white shadow-[0_50px_100px_rgba(0,0,0,0.1)] relative rounded-[2px] overflow-hidden transition-all duration-500 shrink-0
                ${activePageIndex === pageIndex ? 'scale-100 z-10' : 'scale-[0.98] opacity-80 blur-[1px]'}`}
              style={{ width: '210mm', height: '297mm' }}
            >
              {page.type === 'CARATULA' && <CaratulaPage page={page} pageIndex={pageIndex} updatePage={updatePage} isEditMode={true} uploadImage={uploadImage} campoMetadata={null} settings={settings} acquireLock={() => {}} releaseLock={() => {}} isLockedByOther={() => false} activeLocks={{}} />}
              {page.type === 'UBICACION' && <UbicacionPage page={page} pageIndex={pageIndex} updatePage={updatePage} isEditMode={true} uploadImage={uploadImage} setIsEditingMap={setIsEditingMap} settings={settings} acquireLock={() => {}} releaseLock={() => {}} isLockedByOther={() => false} activeLocks={{}} />}
              {page.type === 'SITUACION_ACTUAL' && <SituacionActualPage page={page} pageIndex={pageIndex} updatePage={updatePage} isEditMode={true} uploadImage={uploadImage} settings={settings} acquireLock={() => {}} releaseLock={() => {}} isLockedByOther={() => false} activeLocks={{}} />}
              {page.type === 'DINAMICA' && <DinamicaPage page={page} pageIndex={pageIndex} updatePage={updatePage} isEditMode={true} uploadImage={uploadImage} activeBlockIndex={activeBlockIndex} setActiveBlockIndex={setActiveBlockIndex} settings={settings} acquireLock={() => {}} releaseLock={() => {}} isLockedByOther={() => false} activeLocks={{}} />}
              {page.type === 'ANALISIS_SUELO' && <AnalisisSueloPage page={page} pageIndex={pageIndex} updatePage={updatePage} updatePageSlice={updatePageSlice} addSlice={addSlice} uploadImage={uploadImage} settings={settings} acquireLock={() => {}} releaseLock={() => {}} isLockedByOther={() => false} activeLocks={{}} />}
              {page.type === 'TEXTO_FOTOS' && <TextoFotosPage page={page} pageIndex={pageIndex} updatePage={updatePage} settings={settings} acquireLock={() => {}} releaseLock={() => {}} isLockedByOther={() => false} activeLocks={{}} />}
            </div>
          ))}
        </div>
      </div>

      {showPageSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
          <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md" onClick={() => setShowPageSelector(false)}></div>
          <div className="relative w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900 uppercase">Añadir Página</h2>
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
                  { id: 'ANALISIS_SUELO', name: 'Análisis de Suelo', desc: 'Gráficos técnicos y resultados.', icon: PieChart, color: 'indigo' },
                ].filter(item => {
                  if (['CARATULA', 'UBICACION'].includes(item.id)) return true;
                  return settings?.enabled_pages?.[item.id] !== false;
                }).map((item) => (
                  <button key={item.id} onClick={() => addPage(item.id)} className="group flex flex-col bg-gray-50 hover:bg-white rounded-[32px] border border-gray-100 hover:border-emerald-200 p-6 transition-all hover:shadow-xl text-left active:scale-[0.98]">
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
    </div>
  );
}

function FieldLabel({ children, required }) {
  return <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 px-1">{children}{required && <span className="text-emerald-500 ml-0.5">*</span>}</label>;
}
