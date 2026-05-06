import React, { useRef } from 'react';

const SHAPES = [
  { type: 'path', id: 'Rancul', d: 'M1566.157,416.937l268,0l0,495l-269,0l1,-495Z', cx: 1700, cy: 664, fontSize: 45 },
  { type: 'path', id: 'Santa-Rosa', name: 'Santa Rosa', d: 'M1824.157,1409.937l101,0l0,46l41,0l0,63.937l104,0l0,-339.937l-246,0l0,230Z', cx: 1890, cy: 1250, fontSize: 30 },
  { type: 'path', id: 'Toay', d: 'M1590.157,1179.937l0,427l376,0l0,-150l-40,0l0,-47l-102,0l0,-230l-234,0Z', cx: 1770, cy: 1390, fontSize: 45 },
  { type: 'path', id: 'Loventúe', d: 'M1168.157,1017.937l0,546l254,0l0,43l168,0l0,-589l-422,0Z', cx: 1370, cy: 1300, fontSize: 45 },
  { type: 'path', id: 'Hucal', d: 'M2312.157,2405.937l-494.5,0l0,-334l494.5,10l0,324Z', cx: 2060, cy: 2240, fontSize: 45 },
  { type: 'path', id: 'Caleu-Caleu', name: 'Caleu Caleu', d: 'M1817.657,2787.937l0,-382l494.5,0l0,685c0,0 -74.021,-7.552 -144,-92c-69.979,-84.448 -259.078,-186.396 -350.5,-211Z', cx: 2060, cy: 2740, fontSize: 45 },
  { type: 'path', id: 'Lihuel-Calel', name: 'Lihuel Calel', d: 'M1324.157,2061.937l0,716c0,0 14.626,-39.281 43,-22c28.374,17.281 46,21 46,21c0,0 49.057,6.171 63,-18c13.943,-24.171 341.5,29 341.5,29l0,-716l-493.5,-10Z', cx: 1570, cy: 2400, fontSize: 45 },
  { type: 'rect', id: 'Realicó', x: '1834.157', y: '416.937', width: '236', height: '274', cx: 1952, cy: 553, fontSize: 40 },
  { type: 'rect', id: 'Chapaleufú', x: '2070.157', y: '416.937', width: '242', height: '274', cx: 2191, cy: 553, fontSize: 35 },
  { type: 'rect', id: 'Trenel', x: '1834.157', y: '690.937', width: '236', height: '221', cx: 1952, cy: 801, fontSize: 40 },
  { type: 'rect', id: 'Maracó', x: '2070.157', y: '690.937', width: '242', height: '293', cx: 2191, cy: 837, fontSize: 40 },
  { type: 'rect', id: 'Quemú-Quemú', name: 'Quemú Quemú', x: '2070.157', y: '983.937', width: '242', height: '309', cx: 2191, cy: 1138, fontSize: 35 },
  { type: 'rect', id: 'Catriló', x: '2070.157', y: '1292.937', width: '242', height: '226.937', cx: 2191, cy: 1406, fontSize: 35 },
  { type: 'rect', id: 'Atreucó', x: '1966.157', y: '1519.874', width: '346', height: '331.063', cx: 2139, cy: 1685, fontSize: 45 },
  { type: 'path', id: 'Guatraché', d: 'M2312.157,2081.937l-346,-7l0,-224l346,0l0,231Z', cx: 2140, cy: 1970, fontSize: 45 },
  { type: 'rect', id: 'Chalileo', x: '679.157', y: '1017.937', width: '489', height: '489', cx: 923, cy: 1262, fontSize: 50 },
  { type: 'path', id: 'Chical-Có', name: 'Chical Có', d: 'M169.157,1017.937l510,0l0,489l-474,0l0,-393l-37,0l0,-96', cx: 430, cy: 1260, fontSize: 50 },
  { type: 'path', id: 'Limay-Mahuida', name: 'Limay Mahuida', d: 'M679.157,2074.937l492,-17l-3,-551l-489,0l0,568Z', cx: 925, cy: 1790, fontSize: 50 },
  { type: 'path', id: 'Puelén', d: 'M205.157,1506.937l0,508c0,0 154.5,1.167 193,10c18.644,4.278 32.167,26.833 38,43c5.833,16.167 -4.667,36.667 -3,54c1.648,17.142 19.55,34.074 13,50c-8.5,20.667 -7.154,17.336 -64,74c-56.846,56.664 33,79 33,79c0,0 28.678,-1.297 55,69c26.322,70.297 124.167,47.5 159,52c18.48,2.387 50,-25 50,-25l0,-914l-474,0Z', cx: 450, cy: 1800, fontSize: 50 },
  { type: 'path', id: 'Curacó', d: 'M679.157,2074.937l0,425c0,0 27.768,61.894 139,83c111.232,21.106 87,109 87,109c0,0 -17.771,49.208 95,56c112.771,6.792 192.135,-18.301 237,10c44.865,28.301 87,22 87,22l0,-718l-153,-5l-492,18Z', cx: 925, cy: 2290, fontSize: 50 },
  { type: 'path', id: 'Ultracan', name: 'Ultracán', d: 'M1171.157,2057.937l795,17l0,-467l-545,0l0,-44l-253,0l3,494Z', cx: 1570, cy: 1820, fontSize: 50 },
  { type: 'path', id: 'Conhelo', d: 'M1565.157,1017.937l25,0l0,162l480,0l0,-268l-505,0l0,106Z', cx: 1800, cy: 1090, fontSize: 45 }
];

export default function MapaLaPampa({ 
  selectedDept, 
  onSelectDept, 
  isEditMode, 
  pinX, 
  pinY, 
  onPinChange,
  pinColor = '#003399',
  deptColors = {},
  deptTextColors = {}
}) {
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleSelect = (id, e) => {
    if (isEditMode && onSelectDept) {
      // Si ya está seleccionado, lo deseleccionamos (toggle)
      const nextDept = selectedDept === id ? null : id;
      onSelectDept(nextDept);
    }
  };

  const getSVGCoords = (e) => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  const handleSvgClick = (e) => {
    if (!isEditMode || !onPinChange || isDragging) return;
    const cursorPt = getSVGCoords(e);
    if (cursorPt) {
      onPinChange(cursorPt.x, cursorPt.y);
    }
  };

  const handleMouseDown = (e) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !isEditMode || !onPinChange) return;
    const cursorPt = getSVGCoords(e);
    if (cursorPt) {
      onPinChange(cursorPt.x, cursorPt.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Sort shapes so the selected one renders last (on top)
  const sortedShapes = [...SHAPES].sort((a, b) => {
    if (a.id === selectedDept) return 1;
    if (b.id === selectedDept) return -1;
    return 0;
  });

  return (
    <svg 
      ref={svgRef}
      width="100%" 
      height="100%" 
      viewBox="0 0 2481 3508" 
      version="1.1" 
      xmlns="http://www.w3.org/2000/svg" 
      onClick={handleSvgClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeMiterlimit: 1.5,
        filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
        cursor: isDragging ? 'grabbing' : (isEditMode ? 'crosshair' : 'default')
      }}
    >
      <defs>
        <filter id="pop-out" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="15" dy="25" stdDeviation="15" floodColor="#000000" floodOpacity="0.6" />
        </filter>
      </defs>

      {sortedShapes.map(shape => {
        const isSelected = selectedDept === shape.id;
        const customColor = deptColors[shape.id] || (isSelected ? '#ccff00' : '#ffffff');
        const textColor = deptTextColors[shape.id] || '#001a4d';
        
        const shapeStyle = {
          fill: customColor,
          stroke: '#c8c8c8',
          strokeWidth: '6px',
          cursor: isEditMode ? 'pointer' : 'default',
          transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isSelected ? 'scale(1.06)' : 'scale(1)',
          transformOrigin: `${shape.cx}px ${shape.cy}px`,
          filter: isSelected ? 'url(#pop-out)' : 'none',
        };

        const labelParts = (shape.name || shape.id).split(' ');
        
        return (
          <g key={shape.id} onClick={(e) => handleSelect(shape.id, e)} style={{ cursor: isEditMode ? 'pointer' : 'default' }}>
            {shape.type === 'path' ? (
              <path id={shape.id} d={shape.d} style={shapeStyle} />
            ) : (
              <rect id={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} style={shapeStyle} />
            )}
            
            <text 
              x={shape.cx} 
              y={shape.cy} 
              textAnchor="middle" 
              dominantBaseline="middle"
              fill={textColor}
              fontWeight="900"
              fontSize={shape.fontSize}
              fontFamily="sans-serif"
              style={{ 
                pointerEvents: 'none',
                transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                transformOrigin: `${shape.cx}px ${shape.cy}px`,
              }}
            >
              {labelParts.map((part, i) => (
                <tspan x={shape.cx} dy={i === 0 ? `-${(labelParts.length - 1) * 0.5}em` : '1.2em'} key={i}>
                  {part}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}

      {pinX != null && pinY != null && (
        <g 
          transform={`translate(${pinX}, ${pinY}) scale(8)`} 
          onMouseDown={handleMouseDown}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab', 
            pointerEvents: 'auto',
            transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
          }}
        >
          <path 
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" 
            fill={pinColor} 
            stroke="#ffffff"
            strokeWidth="1"
            transform="translate(-12, -24)"
          />
        </g>
      )}
    </svg>
  );
}
