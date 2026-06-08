import React, { useRef, useEffect } from 'react';
import { Camera, Map as MapIcon, Upload } from 'lucide-react';
import MapaLaPampa from './MapaLaPampa';

const RichTextEditor = ({ content, onChange, isEditMode, className, style }) => {
  const editorRef = React.useRef(null);
  const isFocused = React.useRef(false);

  React.useEffect(() => {
    if (editorRef.current && !isFocused.current) {
      if (editorRef.current.innerHTML !== content) {
        editorRef.current.innerHTML = content || '';
      }
    }
  }, [content]);

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div
      ref={editorRef}
      contentEditable={isEditMode}
      onFocus={() => { isFocused.current = true; }}
      onBlur={(e) => { 
        isFocused.current = false; 
        onChange(e.target.innerHTML); 
      }}
      onInput={(e) => {
        onChange(e.target.innerHTML);
      }}
      onPaste={handlePaste}
      className={className}
      style={style}
      spellCheck={false}
    />
  );
};

export default function UbicacionPage({ 
  page, 
  pageIndex, 
  updatePage, 
  isEditMode = true,
  uploadImage,
  setIsEditingMap,
  settings = null
}) {
  const titleRef = useRef(null);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [page.titulo]);

  return (
    <div className="absolute inset-0 w-full h-full font-sans bg-gray-900 text-white" style={{ overflow: 'clip' }}>
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {page.fondo_url ? (
          <img src={page.fondo_url} className="w-full h-full object-cover brightness-90" alt="fondo" />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-blue-500 to-emerald-600" />
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
      <div className="relative z-10 w-full h-full flex flex-col px-[15mm] pt-[10mm] pb-[15mm]">
        
        {/* Title - Full Width */}
        <div className="mt-10 w-full relative z-20">
          <textarea 
            ref={titleRef}
            value={page.titulo || "UBICACIÓN Y DISTRIBUCIÓN"}
            onChange={(e) => updatePage(pageIndex, 'titulo', e.target.value)}
            disabled={!isEditMode}
            className="bg-transparent border-none focus:outline-none font-black uppercase tracking-tight drop-shadow-lg leading-none italic resize-none w-full h-auto p-0 overflow-hidden"
            style={{ 
              fontSize: `${page.titulo_size || 58}px`,
              color: page.titulo_color || '#ffffff',
              textShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
        </div>

        {/* Map - original large size, absolute bottom-right */}
        <div className="absolute right-[-10mm] bottom-[30mm] w-[180mm] h-[190mm] z-10 flex items-center justify-center">
          <MapaLaPampa
            selectedDept={page.departamento}
            onSelectDept={(dept) => {
              updatePage(pageIndex, 'departamento', dept);
              if (setIsEditingMap) setIsEditingMap(true);
            }}
            isEditMode={isEditMode}
            pinX={page.pin_x}
            pinY={page.pin_y}
            onPinChange={(x, y) => {
              updatePage(pageIndex, 'pin_x', x);
              updatePage(pageIndex, 'pin_y', y);
              if (setIsEditingMap) setIsEditingMap(true);
            }}
            pinColor={page.pin_color || '#003399'}
            deptColors={page.deptColors || {}}
            deptTextColors={page.deptTextColors || {}}
          />
        </div>

        {/* Description - left column, clears the map */}
        <div className="mt-4 flex-1 w-[55%] relative z-20">
          <RichTextEditor 
            content={page.descripcion || "Establecimiento agropecuario de 5000 hectáreas. Ubicado en el departamento Conhelo Provincia de La Pampa."}
            onChange={(html) => updatePage(pageIndex, 'descripcion', html)}
            isEditMode={isEditMode}
            className="bg-transparent border-none focus:outline-none font-bold leading-tight drop-shadow-md min-h-[1em] w-full p-0 text-justify outline-none
                 [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-6 [&_ul]:list-disc [&_ol]:m-0 [&_ol]:pl-6 [&_ol]:list-decimal"
            style={{ 
              fontSize: `${page.descripcion_size || 26}px`,
              color: page.descripcion_color || '#ffffff'
            }}
          />
        </div>

          {/* Optional Overlay Person (como el del mockup) */}
          {page.overlay_url && (
            <div className="absolute bottom-0 left-0 w-1/3 h-2/3 pointer-events-none select-none">
               <img src={page.overlay_url} className="w-full h-full object-contain object-bottom" alt="overlay" />
            </div>
          )}

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
              {settings?.org1_logo_url ? (
                <div className="flex flex-col items-center gap-1">
                  <img src={settings.org1_logo_url} alt={settings.org1_name || 'Logo'} className="h-10 w-auto object-contain" />
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
                  <img src={settings.org2_logo_url} alt={settings.org2_name || 'Logo'} className="h-10 w-auto object-contain" />
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

        {/* Page Badge */}
        <div className="absolute bottom-10 left-10 bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/20 export-hidden" data-no-print="true">
           <span className="text-white text-xs font-black uppercase tracking-widest opacity-80">Pág. {pageIndex + 1}</span>
        </div>

      </div>
    </div>
  );
}
