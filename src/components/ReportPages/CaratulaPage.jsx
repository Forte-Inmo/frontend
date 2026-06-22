import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Camera, GripHorizontal } from 'lucide-react';

export default function CaratulaPage({
  page,
  pageIndex,
  updatePage,
  acquireLock,
  releaseLock,
  isLockedByOther,
  activeLocks,
  uploadImage,
  campoMetadata,
  isEditMode = true,
  settings = null
}) {
  const titleRef = useRef(null);
  const [dragState, setDragState] = useState({ isDragging: false, startY: 0, startOffset: 0 });

  const handleLogosMouseDown = (e) => {
    if (!isEditMode) return;
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    e.preventDefault();
    setDragState({ isDragging: true, startY: e.clientY, startOffset: page.logos_offset || 0 });
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragState.isDragging) return;
      const container = document.getElementById(`page-${pageIndex}`);
      if (!container) return;
      const scaleFactor = 297 / container.offsetHeight;
      const deltaMm = (e.clientY - dragState.startY) * scaleFactor;
      updatePage(pageIndex, 'logos_offset', Math.round((dragState.startOffset + deltaMm) * 10) / 10);
    };
    const handleUp = () => {
      if (dragState.isDragging) {
        setDragState({ isDragging: false, startY: 0, startOffset: 0 });
      }
    };
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState, pageIndex, updatePage]);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [page.titulo]);

  const LockBadge = ({ userName }) => (
    <div className="absolute -top-8 left-0 bg-amber-500 text-white text-[11px] font-black px-3 py-1.5 rounded-t-lg flex items-center gap-2 z-[100] pointer-events-none uppercase tracking-tight whitespace-nowrap export-hidden" data-no-print="true">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
      {userName} editando...
    </div>
  );

  // Formatear el tipo de explotación del campo
  const getSubtituloAuto = () => {
    const partes = [];
    const tipo = campoMetadata?.tipo?.toLowerCase();
    if (tipo === 'agricola') partes.push('AGRÍCOLA');
    else if (tipo === 'ganadero') partes.push('GANADERO');
    else if (tipo === 'mixto') partes.push('MIXTO');
    else if (tipo === 'coto de caza') partes.push('COTO DE CAZA');
    else if (tipo === 'otro' && campoMetadata?.tipo_personalizado) partes.push(campoMetadata.tipo_personalizado.toUpperCase());
    else {
      const uso = campoMetadata?.uso?.toLowerCase();
      if (uso === 'agricultura') partes.push('AGRÍCOLA');
      else if (uso === 'ganaderia') partes.push('GANADERO');
      else if (uso === 'ambos') partes.push('AGRÍCOLA - GANADERO');
    }
    const operacion = campoMetadata?.operacion;
    if (operacion === 'venta') partes.push('EN VENTA');
    else if (operacion === 'alquiler') partes.push('EN ALQUILER');
    return partes.join(' • ') || 'EXPLOTACIÓN AGROPECUARIA';
  };



  return (
    <div className="absolute inset-0 flex flex-col justify-between w-full h-full text-center bg-gray-900 font-sans" style={{ overflow: 'clip' }}>
      {/* Background Image */}
      {page.portada_url ? (
        <>
          <img src={page.portada_url} className="absolute inset-0 w-full h-full object-cover object-top z-0" alt="cover" />
          {isEditMode && (
            <div className="absolute top-8 right-8 z-20" data-no-print="true">
              <label className="p-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-white cursor-pointer hover:bg-white/40 transition-all flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Cambiar Portada</span>
                <input type="file" className="hidden" onChange={(e) => uploadImage(e, pageIndex, 'portada_url')} accept="image/*" />
              </label>
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gray-800 z-0" data-no-print="true">
          <label className="bg-white/10 px-10 py-5 rounded-[2rem] border border-white/20 text-white font-black cursor-pointer hover:bg-white/20 transition-all flex flex-col items-center gap-4">
            <div className="p-4 bg-white/10 rounded-2xl">
              <Camera className="w-8 h-8" />
            </div>
            <span>SUBIR FOTOGRAFÍA DE PORTADA</span>
            <input type="file" className="hidden" onChange={(e) => uploadImage(e, pageIndex, 'portada_url')} accept="image/*" />
          </label>
        </div>
      )}

      {/* Bottom Gradient Overlay */}
      <div className="absolute inset-x-0 bottom-0 h-[85%] z-[1]" style={{ background: `linear-gradient(to top, ${page.overlay_color || '#8cc63f'}, ${page.overlay_color || '#8cc63f'}80 50%, transparent)`, opacity: (page.overlay_opacidad ?? 85) / 100 }}></div>

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-[15mm]">

        {/* Top Header */}
        <div className="flex flex-col items-center mt-[10mm] w-full px-[20mm]">
          <div className="relative w-full">
            {isLockedByOther(`page_${page.id}_titulo`) && <LockBadge userName={activeLocks[`page_${page.id}_titulo`].userName} />}
            <textarea
              ref={titleRef}
              value={page.titulo || (campoMetadata?.operacion === 'alquiler' ? 'CAMPO EN ALQUILER' : 'CAMPO EN VENTA')}
              onChange={(e) => updatePage(pageIndex, 'titulo', e.target.value)}
              onFocus={() => acquireLock(`page_${page.id}_titulo`)}
              onBlur={releaseLock}
              disabled={isLockedByOther(`page_${page.id}_titulo`) || !isEditMode}
              className="w-full text-[75px] leading-[1.1] font-black text-center resize-none bg-transparent border border-transparent focus:border-[#ccff00]/30 focus:outline-none p-2 rounded-2xl transition uppercase text-[#ccff00] placeholder:opacity-50 overflow-hidden"
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
          </div>

          {/* Subtitulo */}
          <div className="w-full mt-2">
            <div
              contentEditable={isEditMode}
              suppressContentEditableWarning
              onBlur={(e) => {
                const val = e.currentTarget.innerText;
                if (val === getSubtituloAuto()) {
                  if (page.subtitulo) updatePage(pageIndex, 'subtitulo', '');
                } else {
                  updatePage(pageIndex, 'subtitulo', val);
                }
              }}
              className="w-full text-[24px] font-bold text-center p-2 uppercase text-white tracking-[0.2em] outline-none"
            >
              {page.subtitulo || getSubtituloAuto()}
            </div>
          </div>
        </div>

        {/* Middle Stats */}
        <div className="flex flex-col items-center justify-center my-auto">
          {/* Superficie (No editable - Viene del Campo) */}
          <div className="w-full text-[130px] leading-[1] font-black text-[#ccff00] text-center px-4 select-none">
            {campoMetadata?.superficie_total || '000'}
          </div>
          <div className="relative mt-4">
            <div className="bg-[#4a8df8] text-white font-black text-[36px] px-20 py-3" style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)' }}>
              HAS.
            </div>
          </div>
        </div>

        {/* Location & Footer */}
        <div className="w-full px-[20mm] flex flex-col items-center gap-12 mb-[5mm]">

          {/* Location Pin */}
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-2xl">
              <MapPin className="w-8 h-8 text-[#ccff00]" fill="currentColor" />
            </div>
            <div className="text-center">
              <input
                value={page.ubicacion_linea1 || campoMetadata?.departamento || 'DPTO. CONHELO'}
                onChange={(e) => updatePage(pageIndex, 'ubicacion_linea1', e.target.value)}
                className="block w-full bg-transparent text-white text-[28px] font-bold text-center focus:outline-none uppercase tracking-wide"
                placeholder="DEPARTAMENTO"
              />
              <input
                value={page.ubicacion_linea2 || campoMetadata?.provincia || 'LA PAMPA'}
                onChange={(e) => updatePage(pageIndex, 'ubicacion_linea2', e.target.value)}
                className="block w-full bg-transparent text-white text-[32px] font-black text-center focus:outline-none uppercase tracking-widest mt-1"
                placeholder="PROVINCIA"
              />
            </div>
          </div>

          {/* Logos Area */}
          <div className="w-full">
            <div className="border-t border-white/20"></div>
            <div className={`pt-12 relative select-none ${dragState.isDragging ? 'duration-0' : 'duration-500'} ${isEditMode ? 'cursor-grab' : ''}`}
              style={{ transform: `translateY(${(page.logos_offset ?? 0)}mm)`, cursor: isEditMode ? (dragState.isDragging ? 'grabbing' : 'grab') : 'default' }}
              onMouseDown={handleLogosMouseDown}>
              {isEditMode && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md text-white/80 rounded-full px-3 py-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider pointer-events-none">
                  <GripHorizontal className="w-3 h-3" />
                  Arrastrar
                  {dragState.isDragging && <span className="text-[#ccff00] ml-1">{Math.round(page.logos_offset ?? 0)}mm</span>}
                </div>
              )}
              <div className="w-full flex items-center justify-center gap-[15mm]" style={{ transform: `scale(${(page.logos_scale ?? 100) / 100})`, transformOrigin: 'bottom center' }}>
              {settings?.org1_logo_url ? (
                <div className="flex flex-col items-center gap-1 opacity-90">
                  <img src={settings.org1_logo_url} alt={settings.org1_name || 'Logo'} className="h-20 w-auto object-contain" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-90">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border-[5px] border-white transform rotate-45 flex items-center justify-center">
                      <div className="w-4 h-4 bg-white"></div>
                    </div>
                    <span className="text-3xl font-black text-white tracking-tighter">FORTE</span>
                  </div>
                  <span className="text-[10px] font-black tracking-[0.3em] text-white/70">INMOBILIARIA</span>
                </div>
              )}
              {settings?.org2_logo_url ? (
                <div className="flex flex-col items-center gap-1 opacity-90">
                  <img src={settings.org2_logo_url} alt={settings.org2_name || 'Logo'} className="h-20 w-auto object-contain" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-90">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-start gap-1">
                      <div className="w-8 h-1.5 bg-white"></div>
                      <div className="w-6 h-1.5 bg-white"></div>
                      <div className="w-8 h-1.5 bg-white"></div>
                    </div>
                    <span className="text-3xl font-black text-white tracking-widest">REAL</span>
                  </div>
                  <span className="text-[10px] font-black tracking-[0.3em] text-white/70">INMOBILIARIA</span>
                </div>
              )}
            </div>
            </div>
          </div>

        {/* Page Badge */}
        <div className="absolute bottom-10 left-10 bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/20 export-hidden" data-no-print="true">
          <span className="text-white text-xs font-black uppercase tracking-widest opacity-80">Pág. {pageIndex + 1}</span>
        </div>

          </div>
          </div>
        </div>
  );
}
