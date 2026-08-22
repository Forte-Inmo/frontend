import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function ZoomHandler({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [bounds, map]);
  return null;
}

export default function MapWidget() {
  const [campos, setCampos] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);

  useEffect(() => {
    fetchCampos();
  }, []);

  const fetchCampos = async () => {
    try {
      const { data, error } = await supabase
        .from('campos')
        .select('*');
      
      if (error) throw error;
      
      setCampos(data || []);
      
      const allCoords = (data || [])
        .filter(c => c.coordenadas_poligono)
        .flatMap(c => c.coordenadas_poligono);
      
      if (allCoords.length > 0) {
        setMapBounds(allCoords);
      }
    } catch (error) {

    }
  };

  return (
    <div className="w-full h-full bg-gray-100 rounded-[2rem] overflow-hidden shadow-inner border border-gray-100 relative group isolate">
      <MapContainer 
        center={[-36.62, -64.29]} 
        zoom={13} 
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          attribution="&copy; Google Maps"
        />
        
        {campos.map(campo => {
          if (!campo.coordenadas_poligono) return null;
          const positions = campo.coordenadas_poligono;
          if (positions.length === 0) return null;
          
          return (
            <Polygon 
              key={campo.id}
              positions={positions}
              pathOptions={{ 
                fillColor: '#ccff00',
                fillOpacity: 0.4,
                weight: 2,
                color: 'white',
              }}
            />
          );
        })}

        <ZoomHandler bounds={mapBounds} />
      </MapContainer>
      
      {/* Overlay info */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-lg">
        <div className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">GeoForte</div>
        <div className="text-sm font-bold text-gray-900">{campos.length} Campos Activos</div>
      </div>
    </div>
  );
}
