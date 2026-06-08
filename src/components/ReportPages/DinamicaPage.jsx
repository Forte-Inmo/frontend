import React, { useRef, useEffect, useState } from 'react';
import { Camera, Plus, Trash2, Palette, Upload, Check, Type, Image as ImageIcon, GripVertical } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { convertShadowForPDF } from '../../utils/pdfShadowUtils';

const RichTextEditor = ({ content, onChange, isEditMode, className, style }) => {
  const editorRef = useRef(null);
  const isFocused = useRef(false);

  // Sync state to DOM only if NOT focused
  useEffect(() => {
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

export default function DinamicaPage({ 
  page, 
  pageIndex, 
  updatePage, 
  isEditMode = true,
  isPDFRender = false,
  uploadImage,
  activeBlockIndex,
  setActiveBlockIndex
}) {
  const { settings } = useSettings();
  const brandColors = settings?.brand_colors || {
    primary: '#107549',
    secondary: '#003399',
    accent: '#ccff00',
    dark: '#001a4d'
  };
  const [dragState, setDragState] = useState({ isDragging: false, startY: 0, startOffset: 0, blockIdx: null });
  const blocks = page.blocks || [];

  const handleMouseDown = (e, idx, initialOffset) => {
    if (!isEditMode) return;
    // Evitar disparar si se hace click en un botón o input interno
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    
    e.preventDefault();
    setDragState({
      isDragging: true,
      startY: e.clientY,
      startOffset: initialOffset || 0,
      blockIdx: idx
    });
    setActiveBlockIndex(idx);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragState.isDragging) return;
      const deltaY = e.clientY - dragState.startY;
      const container = document.getElementById(`page-${pageIndex}`);
      if (!container) return;
      
      const scaleFactor = 297 / container.offsetHeight; // mm por pixel
      const deltaMm = deltaY * scaleFactor;
      
      const newBlocks = [...blocks];
      newBlocks[dragState.blockIdx] = {
        ...newBlocks[dragState.blockIdx],
        yOffset: Math.round((dragState.startOffset + deltaMm) * 10) / 10
      };
      updatePage(pageIndex, 'blocks', newBlocks);
    };

    const handleMouseUp = () => {
      if (dragState.isDragging) {
        setDragState({ isDragging: false, startY: 0, startOffset: 0, blockIdx: null });
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
    const newBlocks = [...(page.blocks || [])];
    newBlocks[blockIndex] = { ...newBlocks[blockIndex], [field]: value };
    updatePage(pageIndex, 'blocks', newBlocks);
  };

  const addBlock = (type = 'text') => {
    const newBlocks = [...(page.blocks || [])];
    const newIndex = newBlocks.length;
    newBlocks.push({
      id: crypto.randomUUID(),
      type: type,
      title: type === 'image' ? 'Nuevo Mapa / Gráfico' : (type === 'title' ? 'TÍTULO' : ''),
      text: type === 'text' ? 'Nuevo bloque de información...' : '',
      url: '',
      bgColor: type === 'title' ? brandColors.primary : '#ffffff',
      textColor: type === 'title' ? '#ffffff' : '#003399'
    });
    updatePage(pageIndex, 'blocks', newBlocks);
    if (isEditMode) setActiveBlockIndex(newIndex);
  };

  const titleSizes = {
    sm: 'text-[24px]',
    md: 'text-[32px]',
    lg: 'text-[48px]',
    xl: 'text-[64px]'
  };

  const textSizes = {
    sm: 'text-[16px]',
    md: 'text-[20px]',
    lg: 'text-[24px]',
    xl: 'text-[32px]'
  };

  return (
    <div className="absolute inset-0 w-full h-full font-sans bg-gray-900 text-white" style={{ overflow: 'clip' }}>
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        {page.fondo_url ? (
          <img src={page.fondo_url} className="w-full h-full object-cover opacity-60" alt="fondo" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black" />
        )}
        {isEditMode && (
          <div data-no-print="true" className="absolute top-8 right-8 z-20">
            <label className="p-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-white cursor-pointer hover:bg-white/40 transition-all flex items-center gap-2">
              <Camera className="w-5 h-5" />
              <input type="file" className="hidden" onChange={(e) => uploadImage(e, pageIndex, 'fondo_url')} accept="image/*" />
            </label>
          </div>
        )}
      </div>

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full" style={{ overflow: 'clip' }}>
        
        {/* Content Area */}
        <div className="absolute inset-0 flex flex-col p-[15mm] pb-[140px]" style={{ overflow: 'clip' }}>
          <div className="flex flex-col gap-6 w-[94%] mx-auto mt-4" style={{ flex: blocks.some(b => b.imageScale === 'full') ? '1 1 0' : '0 0 auto' }}>
            {blocks.map((block, idx) => (
              <div 
                key={block.id || idx} 
                onClick={(e) => {
                  if (isEditMode) {
                    e.stopPropagation();
                    setActiveBlockIndex(idx);
                  }
                }}
                className={`relative group transition-all ${dragState.isDragging && dragState.blockIdx === idx ? 'duration-0 z-50' : 'duration-500'} cursor-pointer
                     ${isEditMode && activeBlockIndex === idx ? 'ring-8 ring-emerald-500 ring-offset-8 ring-offset-transparent' : ''}`}
                onMouseDown={(e) => handleMouseDown(e, idx, block.yOffset)}
                style={(() => { 
                  const s = { 
                    backgroundColor: block.type === 'title' ? 'transparent' 
                      : (block.type === 'image' && block.showImageBg === false) ? 'transparent'
                      : block.variant === 'transparent' ? 'transparent'
                      : (block.variant === 'fade-top' ? 'transparent' : block.bgColor),
                    backgroundImage: block.variant === 'fade-top' 
                      ? `linear-gradient(to bottom, ${block.bgColor} 0%, transparent 100%)` 
                      : 'none',
                    color: block.textColor,
                    borderRadius: (block.variant === 'fade-top' || block.variant === 'transparent' || block.type === 'title' || (block.type === 'image' && block.showImageBg === false)) ? '0' : '2rem',
                    padding: block.variant === 'transparent' ? '0'
                      : block.variant === 'fade-top' ? '1.5rem 1.5rem 3rem' 
                      : (block.type === 'title' || (block.type === 'image' && block.showImageBg === false)) ? '0' 
                      : '1.5rem',
                    boxShadow: (block.variant === 'fade-top' || block.variant === 'transparent' || block.type === 'title' || (block.type === 'image' && block.showImageBg === false)) ? 'none' : '0 15px 45px rgba(0,0,0,0.12)',
                    transform: `translateY(${block.yOffset || 0}mm)`,
                    cursor: isEditMode ? (dragState.isDragging ? 'grabbing' : 'grab') : 'default',
                    width: block.type === 'title' ? 'auto' : (() => {
                      if (!block.width || block.width === 'full') return '100%';
                      if (block.width === 'half') return '50%';
                      if (block.width === 'quarter') return '25%';
                      return `${block.width}%`;
                    })(),
                    marginLeft: block.align === 'center' ? 'auto' : block.align === 'right' ? 'auto' : '0',
                    marginRight: block.align === 'center' ? 'auto' : block.align === 'left' ? 'auto' : '0',
                    flexGrow: block.imageScale === 'full' ? 1 : 0,
                    minHeight: block.imageScale === 'full' ? '200px' : 'auto',
                  };
                  return isPDFRender ? convertShadowForPDF(s) : s;
                })()}
              >
                {isEditMode && (
                  <div data-no-print="true" className="absolute top-4 right-4 text-gray-400 group-hover:text-emerald-500 transition-colors pointer-events-none export-hidden">
                    <GripVertical className="w-5 h-5" />
                  </div>
                )}

                 {block.type === "title" && (
                     <div 
                       style={{ backgroundColor: block.bgColor, color: block.textColor, display: 'inline-block', maxWidth: 'calc(100% - 2rem)' }}
                       className="px-6 py-4 rounded-[1.5rem] shadow-xl"
                    >
                        <div
                          contentEditable={isEditMode}
                          onBlur={(e) => updateBlock(idx, "title", e.currentTarget.innerText)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                            }
                          }}
                          suppressContentEditableWarning={true}
                          className={`font-black uppercase tracking-tighter italic leading-[1.1] outline-none min-w-[40px] ${titleSizes[block.titleSize || "md"]}`}
                          style={{ color: block.textColor, wordBreak: 'break-all', display: 'block', width: 'fit-content', maxWidth: '100%' }}
                        >
                          {block.title || "TÍTULO"}
                        </div>

                    </div>
                 )}

                 {/* Common Title Area (Only for non-title types) */}
                {block.type !== "title" && !block.hideTitle && (
                  <div className="flex items-center justify-between mb-3 pr-10">
                     <textarea 
                        value={block.title}
                        placeholder={block.type === 'image' ? "TÍTULO DEL MAPA / GRÁFICO" : "TÍTULO"}
                        onChange={(e) => updateBlock(idx, 'title', e.target.value)}
                        disabled={!isEditMode}
                        className={`bg-transparent border-none focus:outline-none font-black uppercase tracking-tighter italic leading-none w-full resize-none p-0 ${titleSizes[block.titleSize || 'md']}`}
                        style={{ color: block.textColor }}
                        rows="1"
                     />
                  </div>
                )}

                {/* Specific Content Type */}
                 {block.type === 'image' ? (
                   <div 
                     className={`relative flex items-center justify-center
                       ${block.showImageBg !== false ? 'w-full min-h-[60px] rounded-[1.2rem] bg-black/5 border border-black/5 overflow-hidden' : ''}
                     `}
                     style={block.showImageBg === false ? {
                       marginLeft: 'calc(-3.2% - 15mm)',
                       marginRight: 'calc(-3.2% - 15mm)',
                       width: 'calc(100% + 6.4% + 30mm)',
                     } : {}}
                   >
                      {block.url ? (
                         <img 
                           src={block.url} 
                           alt="mapa"
                           className={block.showImageBg !== false ? 'w-full h-auto object-contain max-h-[700px] rounded-[1rem]' : 'h-auto object-contain mx-auto'}
                           style={block.showImageBg === false ? (() => {
                             const scale = typeof block.imageScale === 'number' ? block.imageScale : 100;
                             if (scale > 100) {
                               return { width: '100%', transform: `scale(${scale / 100})`, transformOrigin: 'center top' };
                             }
                             return { width: `${scale}%` };
                           })() : {}}
                         />
                     ) : (
                        <label data-no-print="true" className="w-full py-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-black/10 transition-all">
                           <div className="p-4 bg-white/20 rounded-full">
                              <Upload className="w-6 h-6 opacity-40" />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Subir Mapa / Imagen</span>
                           <input 
                             type="file" 
                           className="hidden" 
                           onChange={(e) => uploadImage(e, pageIndex, `blocks[${idx}].url`)} 
                           accept="image/*" 
                         />
                      </label>
                   )}
                   {isEditMode && block.url && (
                      <label data-no-print="true" className="absolute bottom-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-xl text-white cursor-pointer hover:bg-black/70 z-30">
                         <Camera className="w-4 h-4" />
                         <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => uploadImage(e, pageIndex, `blocks[${idx}].url`)} 
                            accept="image/*" 
                         />
                      </label>
                   )}
                </div>
              ) : (
                <div className="relative w-full">
                   {block.type !== "title" && (
                     <RichTextEditor 
                    content={block.text}
                    onChange={(html) => updateBlock(idx, 'text', html)}
                    isEditMode={isEditMode}
                    className={`bg-transparent border-none focus:outline-none min-h-[1em] w-full p-0 text-justify outline-none
                         ${textSizes[block.textSize || 'md']} 
                         font-medium
                         leading-tight
                         [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-6 [&_ul]:list-disc [&_ol]:m-0 [&_ol]:pl-6 [&_ol]:list-decimal`}
                    style={{ 
                      color: block.textColor,
                    }}
                  />
                  )}
                </div>
              )}
            </div>
          ))}

          {isEditMode && (
            <div data-no-print="true" className="flex gap-4 mt-4 mb-8">
               <button 
                onClick={() => addBlock('title')}
                className="flex-1 py-6 border-4 border-dashed border-white/20 rounded-[2.5rem] text-white/40 font-black uppercase tracking-widest hover:border-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-4 group"
               >
                 <Type className="w-6 h-6 group-hover:scale-125 transition-transform" /> Título
               </button>
               <button 
                onClick={() => addBlock('text')}
                className="flex-1 py-6 border-4 border-dashed border-white/20 rounded-[2.5rem] text-white/40 font-black uppercase tracking-widest hover:border-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-4 group"
               >
                 <Palette className="w-6 h-6 group-hover:scale-125 transition-transform" /> Bloque
               </button>
               <button 
                onClick={() => addBlock('image')}
                className="flex-1 py-6 border-4 border-dashed border-white/20 rounded-[2.5rem] text-white/40 font-black uppercase tracking-widest hover:border-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-4 group"
               >
                 <ImageIcon className="w-6 h-6 group-hover:scale-125 transition-transform" /> Imagen
               </button>
            </div>
          )}
        </div>
      </div>

        {/* Footer Branding */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-end border-t border-white/20 pt-5 pb-4 px-[15mm] z-20 bg-gray-900">
           <div className="flex flex-col gap-1 text-white opacity-90">
              <div className="flex gap-4 text-[10px] font-black">
                 <span className="uppercase tracking-widest">SANTA ROSA <span className="text-[#ccff00]">REAL INMOBILIARIA</span></span>
                 <span className="uppercase tracking-widest opacity-60">TEL <span className="text-white">2954-311804</span></span>
              </div>
              <div className="flex gap-4 text-[10px] font-black">
                 <span className="uppercase tracking-widest">GENERAL PICO <span className="text-[#ccff00]">FORTE INMOBILIARIA</span></span>
                 <span className="uppercase tracking-widest opacity-60">TEL <span className="text-white">2302-410798</span></span>
              </div>
              <div className="text-[10px] font-black text-[#ccff00] tracking-widest mt-1 uppercase">www.forteinmobiliaria.com.ar</div>
           </div>

           <div className="flex items-center gap-8">
              {settings?.org1_logo_url ? (
                <img src={settings.org1_logo_url} alt={settings.org1_name || 'Logo'} className="h-14 w-auto object-contain" />
              ) : (
                <span className="text-[20px] font-black text-white tracking-widest uppercase">Forte</span>
              )}
              {settings?.org2_logo_url ? (
                <img src={settings.org2_logo_url} alt={settings.org2_name || 'Logo'} className="h-14 w-auto object-contain" />
              ) : (
                <span className="text-[20px] font-black text-white tracking-widest uppercase">Real</span>
              )}
           </div>
        </div>

        {/* Page Badge */}
        <div data-no-print="true" className="absolute bottom-8 left-8 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 export-hidden">
           <span className="text-white text-[10px] font-black uppercase tracking-widest opacity-80">Pág. {pageIndex + 1}</span>
        </div>

      </div>
    </div>
  );
}
