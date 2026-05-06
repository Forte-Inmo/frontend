import { MousePointer2 } from 'lucide-react';

export const Cursor = ({ className, style, color, name }) => {
  return (
    <div className={`pointer-events-none ${className || ''}`} style={style}>
      <MousePointer2 color={color} fill={color} size={28} className="drop-shadow-lg filter" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.4))' }} />

      <div
        className="mt-1 px-2.5 py-1 rounded-full text-[11px] font-black text-white text-center shadow-lg whitespace-nowrap inline-block"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  );
};
