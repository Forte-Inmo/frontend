import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Camera, GripVertical } from 'lucide-react';
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
  setActiveBlockIndex,
  settings = null
}) {
  const titleRef = useRef(null);
  const hasBlocks = !!page.blocks;
  const blocks = useMemo(() => page.blocks || [], [page.blocks]);

  useEffect(() => {
    if (!hasBlocks && titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [page.titulo, hasBlocks]);

  const [dragState, setDragState] = useState({ isDragging: false, startX: 0, startY: 0, startXOffset: 0, startYOffset: 0, blockIdx: null });

  const handleGrabMouseDown = (e, idx, block) => {
    if (!isEditMode) return;
    e.preventDefault();
    setDragState({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startXOffset: block.xOffset || 0,
      startYOffset: block.yOffset || 0,
      blockIdx: idx
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragState.isDragging) return;
      const container = document.getElementById(`page-${pageIndex}`);
      if (!container) return;

      const scaleFactor = 297 / container.offsetHeight;
      const deltaX = (e.clientX - dragState.startX) * scaleFactor;
      const deltaY = (e.clientY - dragState.startY) * scaleFactor;

      const newBlocks = [...blocks];
      newBlocks[dragState.blockIdx] = {
        ...newBlocks[dragState.blockIdx],
        xOffset: Math.round((dragState.startXOffset + deltaX) * 10) / 10,
        yOffset: Math.round((dragState.startYOffset + deltaY) * 10) / 10,
      };
      updatePage(pageIndex, 'blocks', newBlocks);
    };

    const handleMouseUp = () => {
      if (dragState.isDragging) {
        setDragState({ isDragging: false, startX: 0, startY: 0, startXOffset: 0, startYOffset: 0, blockIdx: null });
      }
    };

    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, pageIndex, updatePage, blocks]);

  const updateBlock = (blockIndex, field, value) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = { ...newBlocks[blockIndex], [field]: value };
    updatePage(pageIndex, 'blocks', newBlocks);
  };

  return (
    <div className="absolute inset-0 w-full h-full font-sans bg-gray-900 text-white" style={{ overflow: 'clip' }}>
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {page.fondo_url ? (
          <img src={page.fondo_url} className="w-full h-full object-cover" alt="fondo" />
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
      <div className="relative z-10 w-full h-full" style={{ overflow: 'clip' }}>
        
        {/* Content Area with bottom padding for footer */}
        <div className="absolute inset-0 flex flex-col px-[15mm] pt-[10mm] pb-[140px]" style={{ overflow: 'clip' }}>

          {hasBlocks ? (
            <>
              {/* Title - full width, fixed */}
              {blocks.filter(b => b.type === 'title').map((block) => (
                <div key={block.id} className="mt-10 w-full relative z-20">
                  <div
                    contentEditable={isEditMode}
                    onBlur={(e) => updateBlock(blocks.indexOf(block), 'title', e.currentTarget.innerText)}
                    suppressContentEditableWarning={true}
                    className="w-full bg-transparent border-none focus:outline-none font-black uppercase tracking-tight drop-shadow-lg leading-none italic p-0 whitespace-pre-wrap"
                    style={{
                      fontSize: typeof block.titleSize === 'number' ? `${block.titleSize}px` : block.titleSize === 'sm' ? '24px' : block.titleSize === 'lg' ? '48px' : block.titleSize === 'xl' ? '64px' : '58px',
                      color: block.textColor || '#ffffff',
                      textShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    }}
                  >{block.title || ''}</div>
                </div>
              ))}

              {/* Draggable text blocks - freely positionable */}
              {blocks.filter(b => b.type !== 'title').map((block) => {
                const realIdx = blocks.indexOf(block);
                return (
                  <div
                    key={block.id || realIdx}
                    className={`group ${dragState.isDragging && dragState.blockIdx === realIdx ? 'z-50' : 'z-20'}`}
                    onClick={(e) => {
                      if (isEditMode && setActiveBlockIndex) {
                        e.stopPropagation();
                        setActiveBlockIndex(realIdx);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: `${block.xOffset || 15}mm`,
                      top: `${block.yOffset || 80}mm`,
                      width: !block.width || block.width === 'full' ? '55%' : block.width === 'half' ? '45%' : block.width === 'quarter' ? '25%' : `${block.width}%`,
                    }}
                  >
                    {isEditMode && (
                      <div
                        className="absolute -left-10 top-1/2 -translate-y-1/2 z-30 p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white/60 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity export-hidden hover:bg-white/40"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleGrabMouseDown(e, realIdx, block);
                        }}
                      >
                        <GripVertical className="w-5 h-5" />
                      </div>
                    )}
                    <div
                      style={{
                        backgroundColor: block.variant === 'transparent' ? 'transparent' : (block.variant === 'fade-top' ? 'transparent' : (block.bgColor || 'transparent')),
                        backgroundImage: block.variant === 'fade-top' ? `linear-gradient(to bottom, ${block.bgColor || '#107549'} 50%, transparent ${block.fadeStop ?? 85}%)` : 'none',
                        borderRadius: (block.variant === 'fade-top' || block.variant === 'transparent') ? '0' : '2rem',
                        padding: block.variant === 'transparent' ? '0' : block.variant === 'fade-top' ? '20px 28px 40px' : '20px 28px',
                        boxShadow: (block.variant === 'fade-top' || block.variant === 'transparent') ? 'none' : '0 15px 45px rgba(0,0,0,0.12)',
                      }}
                    >
                    <RichTextEditor
                      content={block.text || ''}
                      onChange={(html) => updateBlock(realIdx, 'text', html)}
                      isEditMode={isEditMode}
                      className="bg-transparent border-none focus:outline-none font-bold leading-tight drop-shadow-md min-h-[1em] w-full p-0 text-justify outline-none
                           [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-6 [&_ul]:list-disc [&_ol]:m-0 [&_ol]:pl-6 [&_ol]:list-decimal"
                      style={{
                        fontSize: typeof block.textSize === 'number' ? `${block.textSize}px` : block.textSize === 'sm' ? '16px' : block.textSize === 'lg' ? '24px' : block.textSize === 'xl' ? '32px' : '20px',
                        color: block.textColor || '#ffffff'
                      }}
                    />
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              {/* Title - Full Width (legacy) */}
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

              {/* Description - left column (legacy) */}
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
            </>
          )}

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

            {/* Optional Overlay Person (como el del mockup) */}
            {page.overlay_url && (
              <div className="absolute bottom-0 left-0 w-1/3 h-2/3 pointer-events-none select-none">
                 <img src={page.overlay_url} className="w-full h-full object-contain object-bottom" alt="overlay" />
              </div>
            )}
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
        <div className="page-badge absolute bottom-[134px] left-10 bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/20 z-[9999]">
         <span className="text-white text-xs font-black uppercase tracking-widest opacity-80">Pág. {pageIndex + 1}</span>
      </div>
    </div>

  );
}
