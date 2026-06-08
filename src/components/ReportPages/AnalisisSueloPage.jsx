import React from 'react';
import { Camera } from 'lucide-react';

export default function AnalisisSueloPage({ 
  page, 
  pageIndex, 
  updatePage, 
  updatePageSlice,
  addSlice,
  isEditMode = true,
  uploadImage,
  settings = null
}) {

  const slices = page.slices || [
    { id: '1', label: 'Monte',  percentage: 56, color: '#ccff00' },
    { id: '2', label: 'Limpio', percentage: 34, color: '#4a8df8' },
    { id: '3', label: 'Otro',   percentage: 10, color: '#003399' }
  ];

  const tableData = page.tableData || [
    { calc: '20% - 30%', desc: 'BOSQUE DE CALDÉN ALTO' },
    { calc: '35% - 45%', desc: 'ESTRATO ARBUSTIVO MEDIO-DENSO TRANSICIÓN ENTRE MONTE CERRADO Y ÁREAS ABIERTAS' },
    { calc: '20% - 30%', desc: 'ESTRATO ARBUSTIVO ABIERTO O LAXO ZONAS CON MAYOR APTITUD GANADERA' },
    { calc: '2% - 5%',   desc: 'SECTORES LIMPIO / INTERVENIDOS CLARAMENTE VISIBLES EN LADO DERECHO Y ARRIBA' },
  ];

  /* ——— Pie chart SVG ——— */
  const renderPieChart = () => {
    // Asegurarnos de que los porcentajes sean números y normalizarlos
    const rawSlices = (page.slices && page.slices.length > 0) ? page.slices : [
      { id: '1', label: 'Monte',  percentage: 56, color: '#ccff00' },
      { id: '2', label: 'Limpio', percentage: 34, color: '#4a8df8' },
      { id: '3', label: 'Otro',   percentage: 10, color: '#003399' }
    ];

    const total = rawSlices.reduce((sum, s) => sum + Number(s.percentage || 0), 0);
    const slices = rawSlices.map(s => ({
      ...s,
      percentage: total > 0 ? (Number(s.percentage || 0) / total) * 100 : 0
    })).filter(s => s.percentage > 0);

    let cum = 0;
    const cx = 100, cy = 100;
    const rOuter = 100; // Radio del fondo blanco
    const rInner = 92;  // Radio de las porciones de color (crea el borde blanco)

    const polarToXY = (deg, radius) => ({
      x: cx + radius * Math.cos((deg - 90) * (Math.PI / 180)),
      y: cy + radius * Math.sin((deg - 90) * (Math.PI / 180)),
    });

    return (
      <svg viewBox="0 0 200 200" className="w-full h-full block">
        {/* Fondo blanco circular */}
        <circle cx={cx} cy={cy} r={rOuter} fill="white" />
        
        {slices.map((slice, i) => {
          const startDeg = (cum / 100) * 360;
          const currentPercentage = Number(slice.percentage);
          cum += currentPercentage;
          const endDeg = (cum / 100) * 360;
          
          // Caso especial: 100%
          if (currentPercentage >= 99.99) {
            return (
              <circle key={slice.id || i} cx={cx} cy={cy} r={rInner} fill={slice.color} />
            );
          }

          const large = currentPercentage > 50 ? 1 : 0;
          const start = polarToXY(startDeg, rInner);
          const end   = polarToXY(endDeg, rInner);

          // Label position at 60% of inner radius
          const midDeg = startDeg + (currentPercentage / 2 / 100) * 360;
          const lx = cx + rInner * 0.6 * Math.cos((midDeg - 90) * (Math.PI / 180));
          const ly = cy + rInner * 0.6 * Math.sin((midDeg - 90) * (Math.PI / 180));

          return (
            <g key={slice.id || i}>
              <path
                d={`M ${cx} ${cy} L ${start.x} ${start.y} A ${rInner} ${rInner} 0 ${large} 1 ${end.x} ${end.y} Z`}
                fill={slice.color}
                stroke="white"
                strokeWidth="1"
              />
              <text
                x={lx} y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={slice.color === '#ccff00' ? '#003399' : 'white'}
                fontSize="18"
                fontWeight="900"
                style={{ pointerEvents: 'none' }}
              >
                {Math.round(currentPercentage)}%
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="absolute inset-0 w-full h-full font-sans" style={{ overflow: 'clip' }}>

      {/* ── Background ── */}
      <div className="absolute inset-0 z-0">
        {page.fondo_url ? (
          <img src={page.fondo_url} className="w-full h-full object-cover" alt="fondo" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-500 via-slate-400 to-green-700" />
        )}
        {isEditMode && (
          <div className="absolute top-6 right-6 z-30" data-no-print="true">
            <label className="p-2.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-white cursor-pointer hover:bg-white/40 transition-all flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-wider">Fondo</span>
              <input type="file" className="hidden" onChange={(e) => uploadImage(e, pageIndex, 'fondo_url')} accept="image/*" />
            </label>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 w-full h-full flex flex-col" style={{ padding: '10mm 12mm 6mm 12mm' }}>

        {/* ── TOP WHITE CARD ── */}
        <div
          className="relative bg-white shadow-2xl overflow-hidden flex flex-col"
          style={{
            borderRadius: '1.5rem 4rem 1.5rem 0', 
            padding: '7mm 8mm 0 8mm', // Quitamos el padding inferior de aquí
            marginBottom: '0',
            minHeight: '80mm' // Altura suficiente para cubrir el círculo hasta la mitad
          }}
        >
          {/* Row for Content */}
          <div className="flex items-start">
            {/* Left: Title */}
            <div className="flex-none pr-8 border-r border-gray-100 flex flex-col justify-center" style={{ minHeight: '35mm' }}>
              <div className="text-[#003399] font-black italic uppercase leading-[1.1]" style={{ fontSize: '42px' }}>
                MONTE<br />LIMPIO<br />TOTAL
              </div>
            </div>

            {/* Right stats */}
            <div className="flex-1 flex flex-col justify-center gap-1 pl-8" style={{ minHeight: '35mm' }}>
              {['2.33%', '97.67%', '4495 HAS.'].map((v, i) => (
                <div key={i} className="text-[#003399] font-black italic" style={{ fontSize: '36px', lineHeight: 1 }}>
                  {v}
                </div>
              ))}

              {/* Legend */}
              <div className="flex flex-col gap-1 mt-2">
                {slices.slice(0, 2).map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-none" style={{ backgroundColor: s.color }} />
                    <span className="text-[#003399] font-black text-[11px] italic uppercase tracking-wider">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Space for the pie chart overlap */}
          <div style={{ height: '35mm' }} />
        </div>

        {/* ── PIE CHART (overflows card bottom-left) ── */}
        <div
          className="relative z-30"
          style={{ height: '37.5mm', marginTop: '-37.5mm', paddingLeft: '0' }} // Centramos el gráfico en el borde inferior
        >
          <div
            className="absolute bg-white rounded-full overflow-hidden shadow-sm"
            style={{ width: '75mm', height: '75mm', top: 0, left: '0' }}
          >
            <div className="w-full h-full p-0 flex items-center justify-center">
              {renderPieChart()}
            </div>
          </div>
        </div>

        {/* ── RANGES TABLE ── */}
        <div className="flex-1 flex flex-col justify-center gap-5" style={{ paddingLeft: '6mm', paddingRight: '6mm', marginTop: '-4mm' }}>
          {tableData.map((row, i) => (
            <div key={i} className="flex items-start gap-8">
              <div
                className="font-black italic whitespace-nowrap flex-none"
                style={{ color: '#ccff00', fontSize: '26px', lineHeight: 1, minWidth: '130px', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
              >
                {row.calc}
              </div>
              <div
                className="text-white font-bold uppercase leading-tight"
                style={{ fontSize: '11px', letterSpacing: '0.05em', paddingTop: '4px' }}
              >
                {row.desc}
              </div>
            </div>
          ))}
        </div>

        {/* ── FOOTER ── */}
        <div className="flex justify-between items-end pt-4 border-t border-white/30" style={{ paddingBottom: '2mm' }}>
          {/* Left info */}
          <div className="flex flex-col gap-0.5 text-white">
            <div className="flex gap-3 text-[9px] font-black uppercase tracking-widest">
              <span>SANTA ROSA <span className="text-[#ccff00]">REAL INMOBILIARIA</span></span>
              <span className="opacity-70">TEL <span className="text-white opacity-100">2954-311804</span></span>
            </div>
            <div className="flex gap-3 text-[9px] font-black uppercase tracking-widest">
              <span>GENERAL PICO <span className="text-[#ccff00]">FORTE INMOBILIARIA</span></span>
              <span className="opacity-70">TEL <span className="text-white opacity-100">2302-410798</span></span>
            </div>
            <div className="text-[9px] font-black text-[#ccff00] tracking-widest">www.forteinmobiliaria.com.ar</div>
            <div className="text-[9px] font-bold text-white/60 tracking-widest">La Pampa</div>
          </div>

          {/* Logos */}
          <div className="flex items-center gap-6">
            {settings?.org1_logo_url ? (
              <div className="flex flex-col items-center gap-0.5">
                <img src={settings.org1_logo_url} alt={settings.org1_name || 'Logo'} className="h-8 w-auto object-contain" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                <div className="bg-white rounded-lg p-1.5 shadow-md">
                  <div className="w-6 h-6 border-2 border-[#003399] rotate-45 flex items-center justify-center">
                    <div className="w-1 h-1 bg-[#003399]" />
                  </div>
                </div>
                <span className="text-[8px] font-black text-white uppercase tracking-widest">FORTE</span>
                <span className="text-[7px] font-bold text-white/60 uppercase tracking-wider">INMOBILIARIA</span>
              </div>
            )}
            {settings?.org2_logo_url ? (
              <div className="flex items-center gap-2">
                <img src={settings.org2_logo_url} alt={settings.org2_name || 'Logo'} className="h-8 w-auto object-contain" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <div className="h-1 bg-white rounded" style={{ width: '22px' }} />
                  <div className="h-1 bg-white rounded" style={{ width: '14px' }} />
                  <div className="h-1 bg-white rounded" style={{ width: '22px' }} />
                </div>
                <span className="text-[18px] font-black text-white uppercase tracking-widest">REAL</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Page Badge ── */}
      <div className="absolute bottom-8 left-8 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/20 export-hidden" data-no-print="true">
        <span className="text-white text-[9px] font-black uppercase tracking-widest">Pág. {pageIndex + 1}</span>
      </div>
    </div>
  );
}
