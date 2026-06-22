import React from 'react';
import { Type, Image as ImageIcon, Trash2, Plus } from 'lucide-react';

export default function TextoFotosPage({ 
  page, 
  pageIndex, 
  updatePage, 
  acquireLock, 
  releaseLock, 
  isLockedByOther, 
  activeLocks,
  isEditMode = true,
  settings = null
}) {
  const LockBadge = ({ userName }) => (
    <div data-no-print="true" className="absolute -top-8 left-0 bg-amber-500 text-white text-[11px] font-black px-3 py-1.5 rounded-t-lg flex items-center gap-2 shadow-lg z-[100] pointer-events-none uppercase tracking-tight whitespace-nowrap export-hidden">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
      {userName} editando...
    </div>
  );

  return (
    <div className="absolute inset-0 w-full h-full font-sans" style={{ overflow: 'clip' }}>
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {page.fondo_url ? (
          <img src={page.fondo_url} className="w-full h-full object-cover" alt="fondo" />
        ) : (
          <div className="w-full h-full bg-white" />
        )}
      </div>

      <div className="relative z-10 w-full h-full" style={{ overflow: 'clip' }}>
        {/* Content Area */}
        <div className="absolute inset-0 flex flex-col p-[25mm] pb-[140px] gap-10" style={{ overflow: 'clip' }}>
          {/* Header Info */}
          <div className={`flex items-center gap-4 ${page.fondo_url ? 'opacity-60' : 'opacity-30'}`}>
            <div className="p-2 bg-gray-100 rounded-lg shadow-sm">
              <Type className="w-4 h-4 text-gray-500" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${page.fondo_url ? 'text-white drop-shadow-md' : 'text-gray-400'}`}>Contenido del Informe</span>
          </div>

          <div className="flex-1 flex gap-12 min-h-0">
            {/* Main Text Area */}
            <div className={`flex-1 relative group rounded-3xl p-6 transition-all ${page.fondo_url ? 'bg-white/90 backdrop-blur-sm shadow-xl' : ''}`}>
              {isLockedByOther(`page_${page.id}_texto`) && <LockBadge userName={activeLocks[`page_${page.id}_texto`].userName} />}
              <textarea 
                value={page.texto_izquierdo || ''} 
                onChange={(e) => updatePage(pageIndex, 'texto_izquierdo', e.target.value)} 
                onFocus={() => acquireLock(`page_${page.id}_texto`)}
                onBlur={releaseLock}
                disabled={isLockedByOther(`page_${page.id}_texto`) || !isEditMode}
                placeholder="Comienza a escribir la descripción detallada aquí..." 
                className={`w-full h-full text-[18px] leading-[1.8] font-medium resize-none bg-transparent border-none focus:outline-none placeholder:italic ${page.fondo_url ? 'text-gray-900 placeholder:text-gray-400' : 'text-gray-700 placeholder:text-gray-200'}`}
              />
            </div>

            {/* Optional Media Column */}
            {(page.fotos?.length > 0 || isEditMode) && (
              <div className="w-[80mm] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                 {page.fotos?.map((foto, fIdx) => (
                   <div key={fIdx} className="relative group rounded-[2rem] overflow-hidden shadow-xl aspect-square bg-gray-50 border border-gray-100 flex-shrink-0">
                      <img src={foto} className="w-full h-full object-cover" alt={`foto-${fIdx}`} />
                      {isEditMode && (
                        <button data-no-print="true" className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white">
                           <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                   </div>
                 ))}
                 {isEditMode && (
                   <div data-no-print="true" className="aspect-square rounded-[2rem] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 text-gray-300 hover:border-emerald-400 hover:text-emerald-400 transition-all cursor-pointer bg-white/50 backdrop-blur-sm flex-shrink-0">
                      <Plus className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Añadir Imagen</span>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Branding */}
        <div className={`absolute bottom-0 left-0 right-0 pt-5 border-t flex justify-between items-end px-[25mm] pb-4 z-20 ${page.fondo_url ? 'border-white/20' : 'border-gray-100'}`} style={{ background: page.fondo_url ? undefined : 'white' }}>
           <div className={`flex flex-col gap-1 ${page.fondo_url ? 'text-white' : 'opacity-30 grayscale text-black'}`}>
              <div className={`flex gap-3 ${page.fondo_url ? 'text-[10px]' : 'text-[9px]'} font-black uppercase tracking-widest`}>
                 <span>SANTA ROSA <span className="text-[#ccff00]">REAL INMOBILIARIA</span></span>
                  <span className="opacity-80">TEL 2954-311804</span>
              </div>
              <div className={`flex gap-3 ${page.fondo_url ? 'text-[10px]' : 'text-[9px]'} font-black uppercase tracking-widest`}>
                 <span>GENERAL PICO <span className="text-[#ccff00]">FORTE INMOBILIARIA</span></span>
                  <span className="opacity-80">TEL 2302-410798</span>
              </div>
               <div className={`${page.fondo_url ? 'text-[10px]' : 'text-[9px]'} font-black text-white tracking-widest uppercase`}>www.forteinmobiliaria.com.ar</div>
           </div>
           <div className="flex items-center gap-6">
              {settings?.org1_logo_url ? (
                 <img src={settings.org1_logo_url} alt={settings.org1_name || 'Logo'} className="h-16 w-auto object-contain" />
               ) : (
                 <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 border-2 transform rotate-45 ${page.fondo_url ? 'border-white' : 'border-black'}`}></div>
                    <span className="font-black text-sm tracking-tighter">FORTE</span>
                 </div>
               )}
               {settings?.org2_logo_url ? (
                 <img src={settings.org2_logo_url} alt={settings.org2_name || 'Logo'} className="h-16 w-auto object-contain" />
              ) : (
                <span className="font-black text-sm tracking-tighter">REAL</span>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
