import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

// Restaurar fixes para pines de Leaflet en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function DrawPolygonEvents({ polygon, setPolygon, isInteractive }) {
  const map = useMapEvents({
    click(e) {
      if (!isInteractive || !setPolygon) return;
      setPolygon((prev) => [...prev, e.latlng]);
    },
  });

  useEffect(() => {
    if (polygon && polygon.length > 0 && map && !isInteractive) {
      const bounds = L.latLngBounds(polygon);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [polygon, map, isInteractive]);

  return null;
}

export default function MapPicker({ polygon = [], setPolygon, isInteractive = true }) {
  const defaultCenter = [-34.6037, -58.3816]; 
  const center = polygon && polygon.length > 0 ? [polygon[0].lat, polygon[0].lng] : defaultCenter;

  const handleUndo = (e) => {
    e.preventDefault();
    if(setPolygon) setPolygon(prev => prev.slice(0, -1));
  };

  const handleClear = (e) => {
    e.preventDefault();
    if(setPolygon) setPolygon([]);
  };

  return (
    <div className="h-full min-h-[150px] w-full rounded-xl overflow-hidden border border-gray-300 shadow-sm relative z-0 bg-gray-100">
      
      {/* Botones de Control Dibujo Dinámico */}
      {isInteractive && polygon.length > 0 && (
        <div className="absolute top-3 right-3 z-[1000] flex gap-2">
          <button type="button" onClick={handleUndo} className="bg-white text-gray-700 px-3 py-1.5 rounded-lg shadow-md text-xs font-bold hover:bg-gray-50 border border-gray-200 transition">
            Deshacer Punto
          </button>
          <button type="button" onClick={handleClear} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg shadow-md text-xs font-bold hover:bg-red-100 border border-red-200 transition">
            Reiniciar Todo
          </button>
        </div>
      )}

      {/* Crosshair cursor when interactive */}
      <div className={isInteractive ? "cursor-crosshair h-full" : "h-full"}>
        <MapContainer 
          center={center} 
          zoom={polygon && polygon.length > 0 ? 14 : 5} 
          scrollWheelZoom={isInteractive}
          dragging={isInteractive}
          zoomControl={isInteractive}
          doubleClickZoom={isInteractive}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <DrawPolygonEvents polygon={polygon} setPolygon={setPolygon} isInteractive={isInteractive} />

          {polygon && polygon.length > 0 && (
            <Polygon 
              positions={polygon.map(p => [p.lat, p.lng])} 
              pathOptions={{ color: '#107549', fillColor: '#107549', fillOpacity: 0.35, weight: 3 }} 
            />
          )}
          
          {/* Marcador solo en el punto Origen */}
          {polygon && polygon.length > 0 && (
              <Marker position={[polygon[0].lat, polygon[0].lng]}></Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
