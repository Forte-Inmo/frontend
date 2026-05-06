import React from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';

export default function SituacionActualPage({ 
  page, 
  pageIndex, 
  updatePage, 
  isEditMode = true,
  uploadImage 
}) {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden font-sans bg-gray-900 text-white">
      {/* Main Background Image (Ahora ocupa todo el fondo) */}
      <div className="absolute inset-0 z-0">
        {page.fondo_url ? (
          <img src={page.fondo_url} className="w-full h-full object-cover" alt="fondo" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-blue-900" />
        )}
        <div className="absolute inset-0 bg-black/20" /> {/* Sutil overlay */}
        {isEditMode && (
          <div className="absolute top-8 right-8 z-20">
            <label className="p-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-white cursor-pointer hover:bg-white/40 transition-all flex items-center gap-2">
              <Camera className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-wider">Cambiar Fondo</span>
              <input type="file" className="hidden" onChange={(e) => uploadImage(e, pageIndex, 'fondo_url')} accept="image/*" />
            </label>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full h-full flex flex-col p-[15mm]">
        
        {/* Top White Card */}
        <div className="bg-white rounded-[2rem] p-10 shadow-2xl w-[92%] mx-auto mt-4 border border-gray-100">
           <h2 className="text-[#003399] text-[48px] font-black uppercase tracking-tighter mb-4 italic leading-none">
              SITUACIÓN ACTUAL
           </h2>
           <textarea 
             value={page.descripcion || "Actualmente cuenta con 650 vacas madres y 500 terneros/as destetados..."}
             onChange={(e) => updatePage(pageIndex, 'descripcion', e.target.value)}
             disabled={!isEditMode}
             className="bg-transparent border-none focus:outline-none text-[#003399] text-[22px] font-bold leading-tight resize-none w-full h-auto p-0"
             rows="4"
           />
        </div>

        {/* Big Highlighted Text (Middle) */}
        <div className="my-10 px-12">
           <textarea 
             value={page.destacado || "CABE DESTACAR QUE LA CARGA ANIMAL ACTUAL NO REPRESENTA EL TOPE PRODUCTIVO DEL ESTABLECIMIENTO..."}
             onChange={(e) => updatePage(pageIndex, 'destacado', e.target.value)}
             disabled={!isEditMode}
             className="bg-transparent border-none focus:outline-none text-white text-[28px] font-black leading-[1.2] uppercase text-center italic drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] resize-none w-full h-auto p-0"
             rows="4"
           />
        </div>

        {/* Detail Image Container (Ahora es la inferior) */}
        <div className="relative w-full h-[35%] rounded-[3rem] overflow-hidden shadow-2xl mt-auto mb-16 border-4 border-white/20">
          {page.imagen_inferior_url ? (
             <img src={page.imagen_inferior_url} className="w-full h-full object-cover" alt="detalle" />
          ) : (
             <label className="w-full h-full bg-white/10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/20 transition-all border-4 border-dashed border-white/20 rounded-[3rem]">
                <ImageIcon className="w-12 h-12 opacity-30" />
                <span className="font-black uppercase tracking-widest opacity-40">Subir Fotografía de Detalle</span>
                <input type="file" className="hidden" onChange={(e) => uploadImage(e, pageIndex, 'imagen_inferior_url')} accept="image/*" />
             </label>
          )}
          {isEditMode && page.imagen_inferior_url && (
            <label className="absolute bottom-6 right-6 p-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl text-white cursor-pointer hover:bg-black/60 transition-all flex items-center gap-2">
               <Camera className="w-5 h-5" />
               <input type="file" className="hidden" onChange={(e) => uploadImage(e, pageIndex, 'imagen_inferior_url')} accept="image/*" />
            </label>
          )}
        </div>

        {/* Footer Branding */}
        <div className="mt-auto flex justify-between items-end border-t border-white/20 pt-10">
           <div className="flex flex-col gap-1 text-white opacity-90">
              <div className="flex gap-4 text-[11px] font-black">
                 <span className="uppercase tracking-widest">SANTA ROSA <span className="text-[#ccff00]">REAL INMOBILIARIA</span></span>
                 <span className="uppercase tracking-widest opacity-60">TEL <span className="text-white">2954-311804</span></span>
              </div>
              <div className="flex gap-4 text-[11px] font-black">
                 <span className="uppercase tracking-widest">GENERAL PICO <span className="text-[#ccff00]">FORTE INMOBILIARIA</span></span>
                 <span className="uppercase tracking-widest opacity-60">TEL <span className="text-white">2302-410798</span></span>
              </div>
              <div className="text-[11px] font-black text-[#ccff00] tracking-widest mt-1 uppercase">www.forteinmobiliaria.com.ar</div>
           </div>

           <div className="flex items-center gap-10">
              <div className="flex flex-col items-center gap-1">
                 <div className="w-8 h-8 bg-white flex items-center justify-center p-1.5 rounded-lg shadow-lg">
                    <div className="w-full h-full border-2 border-[#003399] transform rotate-45 flex items-center justify-center">
                       <div className="w-1.5 h-1.5 bg-[#003399]"></div>
                    </div>
                 </div>
                 <span className="text-[10px] font-black text-white tracking-tighter">FORTE</span>
              </div>
              
              <div className="flex items-center gap-3">
                 <div className="flex flex-col items-start gap-0.5 opacity-80">
                    <div className="w-6 h-1 bg-white"></div>
                    <div className="w-4 h-1 bg-white"></div>
                    <div className="w-6 h-1 bg-white"></div>
                 </div>
                 <span className="text-[24px] font-black text-white tracking-widest uppercase">Real</span>
              </div>
           </div>
        </div>

        {/* Page Badge */}
        <div className="absolute bottom-10 left-10 bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/20">
           <span className="text-white text-xs font-black uppercase tracking-widest opacity-80">Pág. {pageIndex + 1}</span>
        </div>

      </div>
    </div>
  );
}
