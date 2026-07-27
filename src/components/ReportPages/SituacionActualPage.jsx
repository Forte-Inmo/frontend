import React, { useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';

export default function SituacionActualPage({ 
  page, 
  pageIndex, 
  updatePage, 
  isEditMode = true,
  uploadImage,
  settings = null
}) {
  const descripcionRef = useRef(null);
  const destacadoRef = useRef(null);

  useEffect(() => {
    if (descripcionRef.current) {
      descripcionRef.current.style.height = 'auto';
      descripcionRef.current.style.height = descripcionRef.current.scrollHeight + 'px';
    }
  }, [page.descripcion]);

  useEffect(() => {
    if (destacadoRef.current) {
      destacadoRef.current.style.height = 'auto';
      destacadoRef.current.style.height = destacadoRef.current.scrollHeight + 'px';
    }
  }, [page.destacado]);

  return (
    <div className="absolute inset-0 w-full h-full font-sans bg-gray-900 text-white" style={{ overflow: 'clip' }}>
      {/* Main Background Image (Ahora ocupa todo el fondo) */}
      <div className="absolute inset-0 z-0">
        {page.fondo_url ? (
          <img src={page.fondo_url} className="w-full h-full object-cover" alt="fondo" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-blue-900" />
        )}
        {isEditMode && (
          <div className="absolute top-8 right-8 z-20" data-no-print="true">
            <label className="p-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-white cursor-pointer hover:bg-white/40 transition-all flex items-center gap-2">
              <Camera className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-wider">Cambiar Fondo</span>
              <input type="file" className="hidden" onChange={(e) => uploadImage(e, pageIndex, 'fondo_url')} accept="image/*" />
            </label>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full h-full" style={{ overflow: 'clip' }}>
        
        {/* Content Area with bottom padding for footer */}
        <div className="absolute inset-0 flex flex-col p-[15mm] pb-[140px]" style={{ overflow: 'clip' }}>
          {/* Top White Card */}
          <div className="bg-white rounded-[2rem] p-10 shadow-2xl w-[92%] mx-auto mt-4 border border-gray-100">
             <h2 className="text-[#003399] text-[48px] font-black uppercase tracking-tighter mb-4 italic leading-none">
                SITUACIÓN ACTUAL
             </h2>
             <textarea 
               ref={descripcionRef}
               value={page.descripcion || "Actualmente cuenta con 650 vacas madres y 500 terneros/as destetados..."}
               onChange={(e) => updatePage(pageIndex, 'descripcion', e.target.value)}
               disabled={!isEditMode}
               className="bg-transparent border-none focus:outline-none text-[#003399] text-[22px] font-bold leading-tight resize-none w-full h-auto p-0 overflow-hidden"
               onInput={(e) => {
                 e.target.style.height = 'auto';
                 e.target.style.height = e.target.scrollHeight + 'px';
               }}
             />
          </div>

          {/* Big Highlighted Text (Middle) */}
          <div className="my-10 px-12">
             <textarea 
               ref={destacadoRef}
               value={page.destacado || "CABE DESTACAR QUE LA CARGA ANIMAL ACTUAL NO REPRESENTA EL TOPE PRODUCTIVO DEL ESTABLECIMIENTO..."}
               onChange={(e) => updatePage(pageIndex, 'destacado', e.target.value)}
               disabled={!isEditMode}
               className="bg-transparent border-none focus:outline-none text-white text-[28px] font-black leading-[1.2] uppercase text-center italic drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] resize-none w-full h-auto p-0 overflow-hidden"
               onInput={(e) => {
                 e.target.style.height = 'auto';
                 e.target.style.height = e.target.scrollHeight + 'px';
               }}
             />
          </div>

          {/* Detail Image Container (Ahora es la inferior) */}
          <div className="relative w-full h-[35%] rounded-[3rem] overflow-hidden shadow-2xl mt-auto mb-16 border-4 border-white/20">
            {page.imagen_inferior_url ? (
               <img src={page.imagen_inferior_url} className="w-full h-full object-cover" alt="detalle" />
            ) : (
               <label className="w-full h-full bg-white/10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/20 transition-all border-4 border-dashed border-white/20 rounded-[3rem]" data-no-print="true">
                  <ImageIcon className="w-12 h-12 opacity-30" />
                  <span className="font-black uppercase tracking-widest opacity-40">Subir Fotografía de Detalle</span>
                  <input type="file" className="hidden" onChange={(e) => uploadImage(e, pageIndex, 'imagen_inferior_url')} accept="image/*" />
               </label>
            )}
            {isEditMode && page.imagen_inferior_url && (
              <label className="absolute bottom-6 right-6 p-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl text-white cursor-pointer hover:bg-black/60 transition-all flex items-center gap-2" data-no-print="true">
                 <Camera className="w-5 h-5" />
                 <input type="file" className="hidden" onChange={(e) => uploadImage(e, pageIndex, 'imagen_inferior_url')} accept="image/*" />
              </label>
            )}
          </div>
        </div>

        {/* Footer Branding */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-end border-t border-white/20 pt-5 px-[15mm] pb-4 z-20 bg-gray-900">
           <div className="flex flex-col gap-1 text-white opacity-90">
              <div className="flex gap-4 text-[11px] font-black">
                 <span className="uppercase tracking-widest">SANTA ROSA <span className="text-[#ccff00]">REAL INMOBILIARIA</span></span>
                  <span className="uppercase tracking-widest text-white">TEL 2954-311804</span>
              </div>
              <div className="flex gap-4 text-[11px] font-black">
                 <span className="uppercase tracking-widest">GENERAL PICO <span className="text-[#ccff00]">FORTE INMOBILIARIA</span></span>
                  <span className="uppercase tracking-widest text-white">TEL 2302-410798</span>
              </div>
               <div className="text-[11px] font-black text-white tracking-widest mt-1 uppercase">www.forteinmobiliaria.com.ar</div>
           </div>

           <div className="flex items-center gap-10">
              {settings?.org1_logo_url ? (
                <div className="flex flex-col items-center gap-1">
                   <img src={settings.org1_logo_url} alt={settings.org1_name || 'Logo'} className="h-16 w-auto object-contain" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                   <div className="w-8 h-8 bg-white flex items-center justify-center p-1.5 rounded-lg shadow-lg">
                      <div className="w-full h-full border-2 border-[#003399] transform rotate-45 flex items-center justify-center">
                         <div className="w-1.5 h-1.5 bg-[#003399]"></div>
                      </div>
                   </div>
                   <span className="text-[10px] font-black text-white tracking-tighter">FORTE</span>
                </div>
              )}
              {settings?.org2_logo_url ? (
                <div className="flex items-center gap-3">
                   <img src={settings.org2_logo_url} alt={settings.org2_name || 'Logo'} className="h-16 w-auto object-contain" />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                   <div className="flex flex-col items-start gap-0.5 opacity-80">
                      <div className="w-6 h-1 bg-white"></div>
                      <div className="w-4 h-1 bg-white"></div>
                      <div className="w-6 h-1 bg-white"></div>
                   </div>
                   <span className="text-[24px] font-black text-white tracking-widest uppercase">Real</span>
                </div>
              )}
           </div>
        </div>

      </div>

      {/* Page Badge */}
      <div className="absolute bottom-[134px] left-10 bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/20 z-[9999]">
         <span className="text-white text-xs font-black uppercase tracking-widest opacity-80">Pág. {pageIndex + 1}</span>
      </div>
    </div>
  );
}
