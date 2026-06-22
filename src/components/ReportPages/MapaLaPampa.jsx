import React, { useRef } from 'react';

const SCALE = 2481 / 500;
const pinCompat = (v) => (v != null && v > 500 ? Math.round(v / SCALE) : v);

const SHAPES = [
  { type: 'path', id: 'Rancul', d: 'M315.6,84.0l54.0,0.0l0.0,99.8l-54.2,0.0l0.2,-99.8Z', cx: 343, cy: 134, fontSize: 9 },
  { type: 'path', id: 'Santa-Rosa', name: 'Santa Rosa', d: 'M367.6,284.1l20.4,0.0l0.0,9.3l8.3,0.0l0.0,12.9l21.0,0.0l0.0,-68.5l-49.6,0.0l0.0,46.4Z', cx: 381, cy: 252, fontSize: 6 },
  { type: 'path', id: 'Toay', d: 'M320.5,237.8l0.0,86.1l75.8,0.0l0.0,-30.2l-8.1,0.0l0.0,-9.5l-20.6,0.0l0.0,-46.4l-47.2,0.0Z', cx: 357, cy: 280, fontSize: 9 },
  { type: 'path', id: 'Loventúe', d: 'M235.4,205.1l0.0,110.0l51.2,0.0l0.0,8.7l33.9,0.0l0.0,-118.7l-85.0,0.0Z', cx: 276, cy: 262, fontSize: 9 },
  { type: 'path', id: 'Hucal', d: 'M466.0,484.9l-99.7,0.0l0.0,-67.3l99.7,2.0l0.0,65.3Z', cx: 415, cy: 451, fontSize: 9 },
  { type: 'path', id: 'Caleu-Caleu', name: 'Caleu Caleu', d: 'M366.3,561.9l0.0,-77.0l99.7,0.0l0.0,138.0c0.0,0.0 -14.9,-1.5 -29.0,-18.5c-14.1,-17.0 -52.2,-37.6 -70.6,-42.5Z', cx: 415, cy: 552, fontSize: 9 },
  { type: 'path', id: 'Lihuel-Calel', name: 'Lihuel Calel', d: 'M266.9,415.5l0.0,144.3c0.0,0.0 2.9,-7.9 8.7,-4.4c5.7,3.5 9.3,4.2 9.3,4.2c0.0,0.0 9.9,1.2 12.7,-3.6c2.8,-4.9 68.8,5.8 68.8,5.8l0.0,-144.3l-99.5,-2.0Z', cx: 316, cy: 484, fontSize: 9 },
  { type: 'rect', id: 'Realicó', x: '369.6', y: '84', width: '47.6', height: '55.2', cx: 393, cy: 111, fontSize: 8 },
  { type: 'rect', id: 'Chapaleufú', x: '417.2', y: '84', width: '48.8', height: '55.2', cx: 442, cy: 111, fontSize: 7 },
  { type: 'rect', id: 'Trenel', x: '369.6', y: '139.2', width: '47.6', height: '44.5', cx: 393, cy: 161, fontSize: 8 },
  { type: 'rect', id: 'Maracó', x: '417.2', y: '139.2', width: '48.8', height: '59', cx: 442, cy: 169, fontSize: 8 },
  { type: 'rect', id: 'Quemú-Quemú', name: 'Quemú Quemú', x: '417.2', y: '198.3', width: '48.8', height: '62.3', cx: 442, cy: 229, fontSize: 7 },
  { type: 'rect', id: 'Catriló', x: '417.2', y: '260.6', width: '48.8', height: '45.7', cx: 442, cy: 283, fontSize: 7 },
  { type: 'rect', id: 'Atreucó', x: '396.2', y: '306.3', width: '69.7', height: '66.7', cx: 431, cy: 340, fontSize: 9 },
  { type: 'path', id: 'Guatraché', d: 'M466.0,419.6l-69.7,-1.4l0.0,-45.1l69.7,0.0l0.0,46.6Z', cx: 431, cy: 397, fontSize: 9 },
  { type: 'rect', id: 'Chalileo', x: '136.9', y: '205.1', width: '98.5', height: '98.5', cx: 186, cy: 254, fontSize: 10 },
  { type: 'path', id: 'Chical-Có', name: 'Chical Có', d: 'M34.1,205.1l102.8,0.0l0.0,98.5l-95.5,0.0l0.0,-79.2l-7.5,0.0l0.0,-19.3', cx: 87, cy: 254, fontSize: 10 },
  { type: 'path', id: 'Limay-Mahuida', name: 'Limay Mahuida', d: 'M136.9,418.2l99.2,-3.4l-0.6,-111.0l-98.5,0.0l0.0,114.5Z', cx: 186, cy: 361, fontSize: 10 },
  { type: 'path', id: 'Puelén', d: 'M41.3,303.7l0.0,102.4c0.0,0.0 31.1,0.2 38.9,2.0c3.8,0.9 6.5,5.4 7.7,8.7c1.2,3.3 -0.9,7.4 -0.6,10.9c0.3,3.5 3.9,6.9 2.6,10.1c-1.7,4.2 -1.4,3.5 -12.9,14.9c-11.5,11.4 6.7,15.9 6.7,15.9c0.0,0.0 5.8,-0.3 11.1,13.9c5.3,14.2 25.0,9.6 32.0,10.5c3.7,0.5 10.1,-5.0 10.1,-5.0l0.0,-184.2l-95.5,0.0Z', cx: 91, cy: 363, fontSize: 10 },
  { type: 'path', id: 'Curacó', d: 'M136.9,418.2l0.0,85.7c0.0,0.0 5.6,12.5 28.0,16.7c22.4,4.3 17.5,22.0 17.5,22.0c0.0,0.0 -3.6,9.9 19.1,11.3c22.7,1.4 38.7,-3.7 47.8,2.0c9.0,5.7 17.5,4.4 17.5,4.4l0.0,-144.7l-30.8,-1.0l-99.2,3.6Z', cx: 186, cy: 462, fontSize: 10 },
  { type: 'path', id: 'Ultracan', name: 'Ultracán', d: 'M236.0,414.7l160.2,3.4l0.0,-94.1l-109.8,0.0l0.0,-8.9l-51.0,0.0l0.6,99.6Z', cx: 316, cy: 367, fontSize: 10 },
  { type: 'path', id: 'Conhelo', d: 'M315.4,205.1l5.0,0.0l0.0,32.6l96.7,0.0l0.0,-54.0l-101.8,0.0l0.0,21.4Z', cx: 363, cy: 220, fontSize: 9 }
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
      viewBox="0 0 500 707" 
      preserveAspectRatio="xMidYMid meet"
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
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
        cursor: isDragging ? 'grabbing' : (isEditMode ? 'crosshair' : 'default')
      }}
    >

      {sortedShapes.map(shape => {
        const isSelected = selectedDept === shape.id;
        const customColor = deptColors[shape.id] || (isSelected ? '#ccff00' : '#ffffff');
        const textColor = deptTextColors[shape.id] || '#001a4d';
        
        const shapeStyle = {
          fill: customColor,
          stroke: '#c8c8c8',
          strokeWidth: '1.2px',
          cursor: isEditMode ? 'pointer' : 'default',
          transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isSelected ? 'scale(1.06)' : 'scale(1)',
          transformOrigin: `${shape.cx}px ${shape.cy}px`,
          filter: isSelected ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.6))' : 'none',
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
          transform={`translate(${pinCompat(pinX)}, ${pinCompat(pinY)}) scale(1.6)`} 
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
