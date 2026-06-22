import React, { useRef, useEffect, useState } from 'react';
import { Camera, Plus, Trash2, Palette, Upload, Check, Type, Image as ImageIcon, GripVertical, Table as TableIcon, PieChart, X } from 'lucide-react';
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
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef(null);

  useEffect(() => {
    if (!showAddMenu) return;
    const handleClick = (e) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) {
        setShowAddMenu(false);
      }
    };
    setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => document.removeEventListener('click', handleClick);
  }, [showAddMenu]);
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
    const base = {
      id: crypto.randomUUID(),
      type,
      title: '',
      bgColor: '#ffffff',
      textColor: '#003399'
    };
    const newBlock = { ...base, isNew: true };
    if (type === 'title') {
      Object.assign(newBlock, { title: 'TÍTULO', bgColor: brandColors.primary, textColor: '#ffffff' });
    } else if (type === 'image') {
      Object.assign(newBlock, { title: 'Nuevo Mapa / Gráfico', url: '' });
    } else if (type === 'table') {
      Object.assign(newBlock, {
        title: 'TABLA DE DATOS',
        tableData: {
          columns: [
            { id: 'c1', header: 'Columna 1' },
            { id: 'c2', header: 'Columna 2' },
            { id: 'c3', header: 'Columna 3' },
          ],
          rows: [
            { id: 'r1', cells: { c1: '', c2: '', c3: '' } },
          ],
          headerBgColor: brandColors.primary,
          headerTextColor: '#ffffff',
          borderColor: '#e5e4e7',
          alternateRowColor: '#f4f4f5',
        },
      });
    } else if (type === 'piechart') {
      Object.assign(newBlock, {
        variant: 'transparent',
        title: 'Gráfico',
        showTable: true,
        showCard: true,
        pieTitle: 'MONTE\nLIMPIO\nTOTAL',
        pieStats: ['2.33%', '97.67%', '4495 HAS.'],
        slices: [
          { id: '1', label: 'Monte',  percentage: 56, color: '#ccff00' },
          { id: '2', label: 'Limpio', percentage: 34, color: '#4a8df8' },
          { id: '3', label: 'Otro',   percentage: 10, color: '#003399' },
        ],
        tableData: [
          { calc: '20% - 30%', desc: 'BOSQUE DE CALDÉN ALTO' },
          { calc: '35% - 45%', desc: 'ESTRATO ARBUSTIVO MEDIO-DENSO TRANSICIÓN ENTRE MONTE CERRADO Y ÁREAS ABIERTAS' },
          { calc: '20% - 30%', desc: 'ESTRATO ARBUSTIVO ABIERTO O LAXO ZONAS CON MAYOR APTITUD GANADERA' },
          { calc: '2% - 5%',   desc: 'SECTORES LIMPIO / INTERVENIDOS CLARAMENTE VISIBLES EN LADO DERECHO Y ARRIBA' },
        ],
      });
    } else {
      Object.assign(newBlock, { text: 'Nuevo bloque de información...' });
    }
    newBlocks.push(newBlock);
    updatePage(pageIndex, 'blocks', newBlocks);
    if (isEditMode) setActiveBlockIndex(newBlocks.length - 1);
  };

  const getTextSize = (s) => {
    if (s === 'sm') return 16;
    if (s === 'lg') return 24;
    if (s === 'xl') return 32;
    if (typeof s === 'number') return s;
    return 20;
  };

  return (
    <div className="absolute inset-0 w-full h-full font-sans bg-gray-900 text-white" style={{ overflow: 'clip' }}>
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        {page.fondo_url ? (
          <img src={page.fondo_url} className="w-full h-full object-cover" alt="fondo" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black" />
        )}
      </div>

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full" style={{ overflow: 'clip' }}>
        
        {/* Content Area */}
        <div className="absolute inset-0 flex flex-col p-[15mm] pb-[140px]" style={{ overflow: 'clip' }}>
          <div className="flex flex-col gap-6 w-[94%] mx-auto mt-4 relative" style={{ flex: blocks.some(b => b.imageScale === 'full') ? '1 1 0' : '0 0 auto' }}>
            {blocks.map((block, idx) => (
              <div 
                key={block.id || idx} 
                onClick={(e) => {
                  if (isEditMode) {
                    e.stopPropagation();
                    setActiveBlockIndex(idx);
                  }
                }}
                className={`${block.isNew ? 'absolute' : 'relative'} group transition-all ${dragState.isDragging && dragState.blockIdx === idx ? 'duration-0 z-50' : 'duration-500'} cursor-pointer
                     ${isEditMode && activeBlockIndex === idx ? 'ring-8 ring-emerald-500 ring-offset-8 ring-offset-transparent' : ''}`}
                onMouseDown={(e) => handleMouseDown(e, idx, block.yOffset)}
                style={(() => { 
                  const s = { 
                    backgroundColor: block.type === 'title' ? 'transparent' 
                      : (block.type === 'image' && block.showImageBg === false) ? 'transparent'
                      : block.variant === 'transparent' ? 'transparent'
                      : (block.variant === 'fade-top' ? 'transparent' : block.bgColor),
                    backgroundImage: block.variant === 'fade-top'
                      ? `linear-gradient(to bottom, ${block.bgColor} 50%, transparent ${block.fadeStop ?? 85}%)` 
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
                  if (block.isNew) {
                    s.top = 0;
                    s.left = 0;
                    s.right = 0;
                    s.zIndex = 9999;
                  }
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
                           className="font-black uppercase tracking-tighter italic leading-[1.1] outline-none"
                           style={{
                             color: block.textColor,
                             overflowWrap: 'break-word',
                             wordBreak: 'break-word',
                             fontSize: typeof block.titleSize === 'number' ? block.titleSize : (block.titleSize === 'sm' ? 24 : block.titleSize === 'lg' ? 48 : block.titleSize === 'xl' ? 64 : 32)
                           }}
                         >
                           {block.title || "TÍTULO"}
                         </div>

                     </div>
                  )}

                 {/* Common Title Area (Only for non-title types) */}
                 {block.type !== "title" && !block.hideTitle && (
                   <div className="flex items-center justify-between mb-3 pr-10">
                      <div
                        contentEditable={isEditMode}
                        onBlur={(e) => updateBlock(idx, 'title', e.currentTarget.innerText)}
                        suppressContentEditableWarning={true}
                        className="bg-transparent border-none focus:outline-none font-black uppercase tracking-tighter italic leading-none w-full p-0"
                        style={{
                          color: block.textColor,
                          overflowWrap: 'break-word',
                          wordBreak: 'break-word',
                          fontSize: typeof block.titleSize === 'number' ? block.titleSize : (block.titleSize === 'sm' ? 24 : block.titleSize === 'lg' ? 48 : block.titleSize === 'xl' ? 64 : 32)
                        }}
                      >
                        {block.title || (block.type === 'image' ? "TÍTULO DEL MAPA / GRÁFICO" : "TÍTULO")}
                      </div>
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
               ) : block.type === 'piechart' ? (
                   <div className="w-full">
                     {(() => {
                        const rawSlices = block.slices || [];
                        const slices = rawSlices.filter(s => Number(s.percentage || 0) > 0);
                       const tableData = block.tableData || [];
                       const polarToXY = (deg, radius) => ({
                         x: 100 + radius * Math.cos((deg - 90) * (Math.PI / 180)),
                         y: 100 + radius * Math.sin((deg - 90) * (Math.PI / 180)),
                       });
                       let cum = 0;
                       return (
                          <div className="flex flex-col" style={{ minHeight: '160mm' }}>
                            {/* WHITE CARD with circle + legend inside */}
                            <div
                              className="relative bg-white shadow-2xl flex-none"
                              style={{
                                borderRadius: '1.5rem',
                                padding: '7mm 8mm 0 8mm',
                                minHeight: '80mm',
                              }}
                            >
                              {/* Title + Stats + Legend inline */}
                              {block.showCard !== false && (
                                <div className="relative" style={{ paddingBottom: '42mm' }}>
                                  <div className="flex flex-col gap-1" style={{ paddingRight: '180px' }}>
                                    {(block.pieTitle || 'MONTE\nLIMPIO\nTOTAL').split('\n').map((line, i) => (
                                      <div key={i} className="flex items-baseline gap-4">
                                        <div
                                          contentEditable={isEditMode}
                                          suppressContentEditableWarning
                                          onBlur={(e) => {
                                            const lines = (block.pieTitle || 'MONTE\nLIMPIO\nTOTAL').split('\n');
                                            lines[i] = e.currentTarget.innerText;
                                            updateBlock(idx, 'pieTitle', lines.join('\n'));
                                          }}
                                          className="font-black italic uppercase outline-none"
                                          style={{ color: '#003399', fontSize: '36px', lineHeight: 1.1, whiteSpace: 'pre-wrap' }}
                                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                        >
                                          {line}
                                        </div>
                                        <div
                                          contentEditable={isEditMode}
                                          suppressContentEditableWarning
                                          onBlur={(e) => {
                                            const stats = [...(block.pieStats || ['2.33%', '97.67%', '4495 HAS.'])];
                                            stats[i] = e.currentTarget.innerText;
                                            updateBlock(idx, 'pieStats', stats);
                                          }}
                                          className="font-black italic outline-none"
                                          style={{ color: '#003399', fontSize: '34px', lineHeight: 1 }}
                                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                        >
                                          {(block.pieStats || ['2.33%', '97.67%', '4495 HAS.'])[i] || ''}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="absolute flex flex-col gap-1" style={{ top: 0, left: '400px' }}>
                                    {slices.map((s, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full flex-none" style={{ backgroundColor: s.color }} />
                                        <span className="font-black text-[12px] italic uppercase tracking-wider whitespace-nowrap" style={{ color: '#003399' }}>{s.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Circle - absolute at bottom-left, extends below card */}
                              <div className="absolute" style={{ bottom: '-37.5mm', left: 0, zIndex: 10 }}>
                                <div className="bg-white rounded-full overflow-hidden shadow-sm" style={{ width: '75mm', height: '75mm' }}>
                                  <div className="w-full h-full p-0 flex items-center justify-center">
                                    <svg viewBox="0 0 200 200" className="w-full h-full block">
                                      <circle cx="100" cy="100" r="100" fill="white" />
                                      {(slices.map((slice, i) => {
                                        const startDeg = (cum / 100) * 360;
                                        const currentPercentage = Number(slice.percentage);
                                        cum += currentPercentage;
                                        const endDeg = (cum / 100) * 360;
                                        if (currentPercentage >= 99.99) {
                                          return <circle key={slice.id || i} cx="100" cy="100" r="92" fill={slice.color} />;
                                        }
                                        const large = currentPercentage > 50 ? 1 : 0;
                                        const start = polarToXY(startDeg, 92);
                                        const end = polarToXY(endDeg, 92);
                                        const midDeg = startDeg + (currentPercentage / 2 / 100) * 360;
                                        const lx = 100 + 92 * 0.6 * Math.cos((midDeg - 90) * (Math.PI / 180));
                                        const ly = 100 + 92 * 0.6 * Math.sin((midDeg - 90) * (Math.PI / 180));
                                        return (
                                          <g key={slice.id || i}>
                                            <path d={`M 100 100 L ${start.x} ${start.y} A 92 92 0 ${large} 1 ${end.x} ${end.y} Z`} fill={slice.color} stroke="white" strokeWidth="1" />
                                            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={slice.color === '#ccff00' ? '#003399' : 'white'} fontSize="18" fontWeight="900" style={{ pointerEvents: 'none' }}>{Math.round(currentPercentage)}%</text>
                                          </g>
                                        );
                                      }))}
                                    </svg>
                                  </div>
                                </div>
                              </div>

                            </div>

                             {block.showTable !== false && (
                             <>
                             {/* RANGES TABLE */}
                             <div className="flex-1 flex flex-col justify-start gap-5" style={{ paddingLeft: '6mm', paddingRight: '6mm', marginTop: '42mm' }}>
                               {tableData.map((row, i) => (
                                 <div key={i} className="flex items-start gap-8">
                                   <div
                                     className="font-black italic whitespace-nowrap flex-none"
                                     style={{ color: '#ccff00', fontSize: '26px', lineHeight: 1, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
                                   >
                                     {row.calc}
                                   </div>
                                   <div
                                     className="font-bold uppercase leading-tight"
                                     style={{ color: block.textColor, fontSize: '11px', letterSpacing: '0.05em', paddingTop: '4px' }}
                                   >
                                     {row.desc}
                                   </div>
                                 </div>
                               ))}
                             </div>
                             </>
                             )}
                          </div>
                       );
                     })()}
                   </div>
               ) : block.type === 'table' ? (
                <div className="overflow-x-auto w-full">
                  <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 14, color: block.textColor, backgroundColor: block.variant === 'transparent' ? 'transparent' : (block.bgColor || '#ffffff') }}>
                    <thead>
                      <tr>
                        {/* spacer columna para botón eliminar fila (siempre presente para alinear con tbody) */}
                        <th
                          style={{
                            border: `1px solid ${block.tableData.borderColor || '#e5e4e7'}`,
                            padding: isEditMode ? '4px' : 0,
                            width: 32,
                            backgroundColor: block.tableData.headerBgColor || brandColors.primary,
                          }}
                        >
                          {isEditMode && (
                            <button
                              onClick={() => {
                                const td = { ...block.tableData, columns: [...block.tableData.columns], rows: [...block.tableData.rows] };
                                const newId = `c${Date.now()}`;
                                td.columns.push({ id: newId, header: `Columna ${td.columns.length + 1}` });
                                td.rows = td.rows.map(r => ({
                                  ...r,
                                  cells: { ...r.cells, [newId]: '' },
                                }));
                                updateBlock(idx, 'tableData', td);
                              }}
                              className="text-white/80 hover:text-white transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </th>
                        {block.tableData.columns.map((col, ci) => (
                          <th
                            key={col.id}
                            style={{
                              backgroundColor: block.tableData.headerBgColor || brandColors.primary,
                              color: block.tableData.headerTextColor || '#ffffff',
                              border: `1px solid ${block.tableData.borderColor || '#e5e4e7'}`,
                              padding: '10px 12px',
                              fontWeight: 900,
                              fontSize: 13,
                              textAlign: 'left',
                              position: 'relative',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                contentEditable={isEditMode}
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const td = { ...block.tableData, columns: [...block.tableData.columns], rows: [...block.tableData.rows] };
                                  td.columns[ci] = { ...td.columns[ci], header: e.currentTarget.innerText };
                                  updateBlock(idx, 'tableData', td);
                                }}
                                className="outline-none flex-1"
                              >
                                {col.header}
                              </span>
                              {isEditMode && (
                                <button
                                  onClick={() => {
                                    const td = { ...block.tableData, columns: [...block.tableData.columns], rows: [...block.tableData.rows] };
                                    td.columns.splice(ci, 1);
                                    td.rows = td.rows.map(r => {
                                      const c = { ...r.cells };
                                      delete c[col.id];
                                      return { ...r, cells: c };
                                    });
                                    updateBlock(idx, 'tableData', td);
                                  }}
                                  className="text-white/60 hover:text-red-300 transition-colors shrink-0"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.tableData.rows.map((row, ri) => (
                        <tr
                          key={row.id}
                          style={{
                            backgroundColor: block.variant === 'transparent' ? 'transparent' : (ri % 2 === 1 ? (block.tableData.alternateRowColor || '#f4f4f5') : (block.bgColor || '#ffffff')),
                          }}
                        >
                          <td
                            style={{
                              border: `1px solid ${block.tableData.borderColor || '#e5e4e7'}`,
                              padding: 0,
                              width: 32,
                              textAlign: 'center',
                              verticalAlign: 'middle',
                            }}
                          >
                            {isEditMode && (
                              <button
                                onClick={() => {
                                  const td = { ...block.tableData, columns: [...block.tableData.columns], rows: [...block.tableData.rows] };
                                  td.rows.splice(ri, 1);
                                  updateBlock(idx, 'tableData', td);
                                }}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                          {block.tableData.columns.map((col) => (
                            <td
                              key={col.id}
                              style={{
                                border: `1px solid ${block.tableData.borderColor || '#e5e4e7'}`,
                                padding: '8px 12px',
                                fontWeight: 500,
                              }}
                            >
                              <span
                                contentEditable={isEditMode}
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const td = { ...block.tableData, columns: [...block.tableData.columns], rows: [...block.tableData.rows] };
                                  td.rows[ri] = { ...td.rows[ri], cells: { ...td.rows[ri].cells, [col.id]: e.currentTarget.innerText } };
                                  updateBlock(idx, 'tableData', td);
                                }}
                                className="outline-none block min-h-[1em]"
                              >
                                {row.cells[col.id] || ''}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                      {isEditMode && (
                        <tr>
                          <td
                            colSpan={block.tableData.columns.length + 1}
                            style={{
                              border: `1px solid ${block.tableData.borderColor || '#e5e4e7'}`,
                              padding: 4,
                            }}
                          >
                            <button
                              onClick={() => {
                                const td = { ...block.tableData, columns: [...block.tableData.columns], rows: [...block.tableData.rows] };
                                const newId = `r${Date.now()}`;
                                const cells = {};
                                td.columns.forEach(c => { cells[c.id] = ''; });
                                td.rows.push({ id: newId, cells });
                                updateBlock(idx, 'tableData', td);
                              }}
                              className="w-full py-2 text-gray-400 hover:text-emerald-500 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                            >
                              <Plus className="w-4 h-4" /> Añadir Fila
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="relative w-full">
                   {block.type !== "title" && (
                     <RichTextEditor 
                    content={block.text}
                    onChange={(html) => updateBlock(idx, 'text', html)}
                    isEditMode={isEditMode}
                     className={`bg-transparent border-none focus:outline-none min-h-[1em] w-full p-0 text-justify outline-none
                          font-medium
                          leading-tight
                          [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-6 [&_ul]:list-disc [&_ol]:m-0 [&_ol]:pl-6 [&_ol]:list-decimal`}
                     style={{ color: block.textColor, fontSize: getTextSize(block.textSize) }}
                  />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {isEditMode && (
        <div data-no-print="true" className="absolute top-8 right-8 z-20">
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="p-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-white cursor-pointer hover:bg-white/40 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
            </button>
            {showAddMenu && (
              <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-white/10 rounded-2xl shadow-xl p-2 z-40 min-w-[170px]">
                <button
                  onClick={() => { addBlock('title'); setShowAddMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  <Type className="w-4 h-4" /> Título
                </button>
                <button
                  onClick={() => { addBlock('text'); setShowAddMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  <Palette className="w-4 h-4" /> Bloque
                </button>
                <button
                  onClick={() => { addBlock('image'); setShowAddMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  <ImageIcon className="w-4 h-4" /> Imagen
                </button>
                <button
                  onClick={() => { addBlock('table'); setShowAddMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  <TableIcon className="w-4 h-4" /> Tabla
                </button>
                <button
                  onClick={() => { addBlock('piechart'); setShowAddMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  <PieChart className="w-4 h-4" /> Gráfico
                </button>
                <div className="h-px bg-white/10 my-1" />
                <label className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer">
                  <Camera className="w-4 h-4" /> Cambiar Fondo
                  <input type="file" className="hidden" onChange={(e) => { uploadImage(e, pageIndex, 'fondo_url'); setShowAddMenu(false); }} accept="image/*" />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Footer Branding */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-end border-t border-white/20 pt-5 pb-4 px-[15mm] z-20 bg-gray-900">
           <div className="flex flex-col gap-1 text-white opacity-90">
              <div className="flex gap-4 text-[10px] font-black">
                 <span className="uppercase tracking-widest">SANTA ROSA <span className="text-[#ccff00]">REAL INMOBILIARIA</span></span>
                  <span className="uppercase tracking-widest text-white">TEL 2954-311804</span>
              </div>
              <div className="flex gap-4 text-[10px] font-black">
                 <span className="uppercase tracking-widest">GENERAL PICO <span className="text-[#ccff00]">FORTE INMOBILIARIA</span></span>
                  <span className="uppercase tracking-widest text-white">TEL 2302-410798</span>
              </div>
               <div className="text-[10px] font-black text-white tracking-widest mt-1 uppercase">www.forteinmobiliaria.com.ar</div>
           </div>

           <div className="flex items-center gap-8">
              {settings?.org1_logo_url ? (
                 <img src={settings.org1_logo_url} alt={settings.org1_name || 'Logo'} className="h-16 w-auto object-contain" />
               ) : (
                 <span className="text-[22px] font-black text-white tracking-widest uppercase">Forte</span>
               )}
               {settings?.org2_logo_url ? (
                 <img src={settings.org2_logo_url} alt={settings.org2_name || 'Logo'} className="h-16 w-auto object-contain" />
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
