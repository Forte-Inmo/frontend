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
  isEditMode = true 
}) {
  const LockBadge = ({ userName }) => (
    <div className="absolute -top-8 left-0 bg-amber-500 text-white text-[11px] font-black px-3 py-1.5 rounded-t-lg flex items-center gap-2 shadow-lg z-[100] pointer-events-none uppercase tracking-tight whitespace-nowrap">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
      {userName} editando...
    </div>
  );

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden font-sans">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {page.fondo_url ? (
          <img src={page.fondo_url} className="w-full h-full object-cover" alt="fondo" />
        ) : (
          <div className="w-full h-full bg-white" />
        )}
      </div>

      <div className="relative z-10 w-full h-full flex flex-col p-[25mm] gap-10">
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
                      <button className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white">
                         <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                 </div>
               ))}
               {isEditMode && (
                 <div className="aspect-square rounded-[2rem] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 text-gray-300 hover:border-emerald-400 hover:text-emerald-400 transition-all cursor-pointer bg-white/50 backdrop-blur-sm flex-shrink-0">
                    <Plus className="w-8 h-8" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Añadir Imagen</span>
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Footer Branding */}
        <div className={`mt-auto pt-10 border-t flex justify-between items-end ${page.fondo_url ? 'border-white/20' : 'border-gray-100'}`}>
           <div className={`flex gap-8 ${page.fondo_url ? 'text-white' : 'opacity-30 grayscale text-black'}`}>
              <div className="flex items-center gap-2">
                 <div className={`w-5 h-5 border-2 transform rotate-45 ${page.fondo_url ? 'border-white' : 'border-black'}`}></div>
                 <span className="font-black text-sm tracking-tighter">FORTE</span>
              </div>
           </div>
           <div className={`${page.fondo_url ? 'bg-white/20 backdrop-blur-md border border-white/20' : 'bg-gray-100'} px-4 py-1.5 rounded-xl`}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${page.fondo_url ? 'text-white' : 'text-gray-400'}`}>Página {pageIndex + 1}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
