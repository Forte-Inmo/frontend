import React from 'react';
import { Leaf, MapPin, Camera } from 'lucide-react';

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
  isEditMode = true
}) {
  const LockBadge = ({ userName }) => (
    <div className="absolute -top-8 left-0 bg-amber-500 text-white text-[11px] font-black px-3 py-1.5 rounded-t-lg flex items-center gap-2 z-[100] pointer-events-none uppercase tracking-tight whitespace-nowrap export-hidden" data-no-print="true">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
      {userName} editando...
    </div>
  );

  // Formatear el tipo de explotación del campo
  const getSubtitulo = () => {
    const uso = campoMetadata?.uso?.toLowerCase();
    if (uso === 'agricultura') return 'AGRÍCOLA';
    if (uso === 'ganaderia') return 'GANADERO';
    if (uso === 'ambos') return 'AGRÍCOLA - GANADERO';
    return page.subtitulo || 'EXPLOTACIÓN AGROPECUARIA';
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
      <div className="absolute inset-x-0 bottom-0 h-[85%] bg-gradient-to-t from-[#8cc63f] via-[#8cc63f]/80 to-transparent z-[1]"></div>

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-[15mm]">

        {/* Top Header */}
        <div className="flex flex-col items-center mt-[10mm] w-full px-[20mm]">
          <div className="p-4 bg-white/10 backdrop-blur-sm rounded-3xl mb-6">
            <Leaf className="w-12 h-12 text-[#ccff00]" fill="currentColor" />
          </div>

          <div className="relative w-full">
            {isLockedByOther(`page_${page.id}_titulo`) && <LockBadge userName={activeLocks[`page_${page.id}_titulo`].userName} />}
            <textarea
              value={page.titulo || 'CAMPO EN VENTA'}
              onChange={(e) => updatePage(pageIndex, 'titulo', e.target.value)}
              onFocus={() => acquireLock(`page_${page.id}_titulo`)}
              onBlur={releaseLock}
              disabled={isLockedByOther(`page_${page.id}_titulo`) || !isEditMode}
              className="w-full text-[75px] leading-[1.1] font-black text-center resize-none bg-transparent border border-transparent focus:border-[#ccff00]/30 focus:outline-none p-2 rounded-2xl transition uppercase text-[#ccff00] placeholder:opacity-50"
              rows="2"
            />
          </div>

          {/* Subtitulo (No editable - Viene del Campo) */}
          <div className="w-full mt-2">
            <div
              className="w-full text-[24px] font-bold text-center p-2 uppercase text-white tracking-[0.2em]"
            >
              {getSubtitulo()}
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
          <div className="w-full flex items-center justify-center gap-[15mm] pt-12 border-t border-white/20">
            <div className="flex flex-col items-center gap-1 opacity-90">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 border-4 border-white transform rotate-45 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white"></div>
                </div>
                <span className="text-2xl font-black text-white tracking-tighter">FORTE</span>
              </div>
              <span className="text-[8px] font-black tracking-[0.3em] text-white/70">INMOBILIARIA</span>
            </div>

            <div className="flex flex-col items-center gap-1 opacity-90">
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-start gap-0.5">
                  <div className="w-6 h-1 bg-white"></div>
                  <div className="w-4 h-1 bg-white"></div>
                  <div className="w-6 h-1 bg-white"></div>
                </div>
                <span className="text-2xl font-black text-white tracking-widest">REAL</span>
              </div>
              <span className="text-[8px] font-black tracking-[0.3em] text-white/70">INMOBILIARIA</span>
            </div>
          </div>
        </div>

        {/* Page Badge */}
        <div className="absolute bottom-10 left-10 bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/20 export-hidden" data-no-print="true">
          <span className="text-white text-xs font-black uppercase tracking-widest opacity-80">Pág. {pageIndex + 1}</span>
        </div>

      </div>
    </div>
  );
}
