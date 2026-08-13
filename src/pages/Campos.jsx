import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Plus,
  MapPin,
  Layers,
  Search,
  Edit3,
  Trash2,
  ChevronRight,
  Compass,
  Save,
  X,
  Tag,
  Ruler,
  Tractor,
  Navigation,
  FileText,
  Map,
  RefreshCw
} from 'lucide-react';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/* ─── Shared UI primitives ───────────────── */

function FieldLabel({ children, required }) {
  return (
    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">
      {children}{required && <span className="text-emerald-500 ml-0.5">*</span>}
    </label>
  );
}

function TextInput({ icon: Icon, as: Tag = 'input', ...props }) {
  const baseClass = `w-full ${Icon ? 'pl-11' : 'pl-5'} pr-5 py-3.5 rounded-2xl bg-gray-50 border-2 border-transparent
    focus:border-emerald-500 focus:bg-white focus:outline-none
    transition-all duration-200 font-semibold text-gray-700
    placeholder:text-gray-300 placeholder:font-normal
    disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className="relative">
      {Icon && (
        <Icon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      )}
      <Tag {...props} className={baseClass} />
    </div>
  );
}

function SelectInput({ icon: Icon, children, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
      )}
      <select
        {...props}
        className={`w-full ${Icon ? 'pl-11' : 'pl-5'} pr-5 py-3.5 rounded-2xl bg-gray-50 border-2 border-transparent
          focus:border-emerald-500 focus:bg-white focus:outline-none
          transition-all duration-200 font-semibold text-gray-700
          appearance-none cursor-pointer`}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, color = 'emerald', children }) {
  const colorMap = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 bg-gray-50/60">
        <div className={`p-2 rounded-xl ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-black text-gray-700 tracking-tight">{title}</h3>
      </div>
      <div className="p-6 space-y-4">
        {children}
      </div>
    </div>
  );
}

/* ─── Map Components ───────────────────────────────────────── */

function MapPicker({ point, setPoint, coords, setCoords, isDelimiting }) {
  useMapEvents({
    click(e) {
      const newCoord = [e.latlng.lat, e.latlng.lng];
      if (isDelimiting) {
        setCoords([...coords, newCoord]);
      } else {
        setPoint(newCoord);
      }
    },
  });

  return (
    <>
      {point && <Marker position={point} />}
      {coords.length > 0 && (
        <Polygon
          positions={coords}
          pathOptions={{ fillColor: '#107549', fillOpacity: 0.3, color: '#107549', weight: 2 }}
        />
      )}
      {coords.map((c, i) => (
        <Marker key={`poly-${i}`} position={c} opacity={0.6} />
      ))}
    </>
  );
}

function ChangeView({ center, zoom = 13 }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom);
    }
  }, [center, map, zoom]);
  return null;
}

/* ─── Main Component ────────────────────────────────────────── */

export default function Campos() {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission('campos:manage');
  const [campos, setCampos] = useState(() => {
    try {
      const cached = localStorage.getItem('forte_campos_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(!localStorage.getItem('forte_campos_cache'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDelimiting, setIsDelimiting] = useState(false);
  const [mapCenter, setMapCenter] = useState([-36.62, -64.29]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
      setEditingId(null);
      setFormData(initialFormState);
    }, 400); // Duración de la animación slide-out
  };

  const initialFormState = {
    nombre: '',
    alias_comercial: '',
    superficie_total: '',
    uso: 'ambos',
    tipo: '',
    tipo_personalizado: '',
    operacion: '',
    provincia: '',
    departamento: '',
    descripcion: '',
    latitud: '',
    longitud: '',
    coordenadas_poligono: [],
  };

  const [formData, setFormData] = useState(initialFormState);

  const set = (field) => (e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  useEffect(() => {
    fetchCampos();

    // Suscripción Realtime
    const channel = supabase
      .channel('public:campos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campos' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setCampos(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setCampos(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
        } else if (payload.eventType === 'DELETE') {
          setCampos(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCampos = async () => {
    // Si ya tenemos datos de cache, no mostramos el skeleton para que no "parpadee"
    if (campos.length === 0) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const result = data || [];
      setCampos(result);
      localStorage.setItem('forte_campos_cache', JSON.stringify(result));
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: formData.nombre,
        superficie_total: formData.superficie_total,
        tipo: formData.tipo || null,
        tipo_personalizado: formData.tipo_personalizado || null,
        operacion: formData.operacion || null,
        provincia: formData.provincia,
        departamento: formData.departamento,
        latitud: formData.latitud,
        longitud: formData.longitud,
        coordenadas_poligono: formData.coordenadas_poligono,
        created_by: user?.id,
      };

      if (editingId) {
        const { data, error } = await supabase
          .from('campos')
          .update(payload)
          .eq('id', editingId)
          .select()
          .single();
        if (error) throw error;
        // Actualización local inmediata
        if (data) setCampos(prev => prev.map(c => c.id === editingId ? data : c));
      } else {
        const { data, error } = await supabase
          .from('campos')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        // Actualización local inmediata
        if (data) setCampos(prev => [data, ...prev]);
      }

      handleClose();
    } catch (error) {

      alert('Error al guardar: ' + error.message);
    }
  };

  const handleEdit = (campo) => {
    setEditingId(campo.id);
    setFormData({
      ...campo,
      coordenadas_poligono: campo.coordenadas_poligono || [],
    });
    setIsDelimiting(false);
    if (campo.latitud && campo.longitud) {
      setMapCenter([parseFloat(campo.latitud), parseFloat(campo.longitud)]);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este terreno?')) return;
    try {
      const { error } = await supabase
        .from('campos')
        .delete()
        .eq('id', id);
      if (error) throw error;

      // Actualización local inmediata
      setCampos(prev => prev.filter(c => c.id !== id));
    } catch (error) {

    }
  };

  const openNew = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsDelimiting(false);
    setIsModalOpen(true);
  };

  const filteredCampos = campos.filter(
    (c) =>
      c.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 sm:p-8 bg-gray-50/50 min-h-full">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-4 tracking-tight">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <Compass className="w-8 h-8 text-white" />
            </div>
            Camposs
          </h1>
          <p className="text-gray-500 font-medium mt-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            {campos.length} lotes registrados
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              className="w-full pl-12 pr-5 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {canManage && (
            <button
              onClick={openNew}
              className="shrink-0 bg-gray-900 text-white px-5 sm:px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nuevo Campo</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Cards Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white h-[350px] rounded-[2.5rem] animate-pulse border border-gray-100 shadow-sm" />
          ))}
        </div>
      ) : filteredCampos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampos.map((campo) => (
            <div
              key={campo.id}
              className="group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col relative"
            >
              <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-50 relative overflow-hidden">
                {(campo.coordenadas_poligono?.length > 0 || (campo.latitud && campo.longitud)) ? (
                  <MapContainer
                    center={
                      campo.latitud && campo.longitud
                        ? [parseFloat(campo.latitud), parseFloat(campo.longitud)]
                        : campo.coordenadas_poligono[0]
                    }
                    zoom={12}
                    className="h-full w-full z-0"
                    zoomControl={false}
                    dragging={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                    touchZoom={false}
                    keyboard={false}
                  >
                    <TileLayer
                      url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
                      subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                    />
                    {campo.latitud && campo.longitud && (
                      <Marker position={[parseFloat(campo.latitud), parseFloat(campo.longitud)]} />
                    )}
                    {campo.coordenadas_poligono?.length > 0 && (
                      <Polygon
                        positions={campo.coordenadas_poligono}
                        pathOptions={{ fillColor: '#107549', fillOpacity: 0.3, color: '#107549', weight: 2 }}
                      />
                    )}
                  </MapContainer>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 to-blue-500/8 z-0" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-700 z-0">
                      <Compass className="w-28 h-28 text-emerald-600 rotate-12" />
                    </div>
                  </>
                )}

                {canManage && (
                  <div className="absolute top-4 right-4 z-[10] flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <button onClick={() => handleEdit(campo)} className="p-2.5 bg-white/95 backdrop-blur-sm text-gray-600 rounded-xl hover:bg-emerald-600 hover:text-white transition shadow-md">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(campo.id)} className="p-2.5 bg-white/95 backdrop-blur-sm text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition shadow-md">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-5">
                  <h3 className="text-xl font-black text-gray-900 leading-tight group-hover:text-emerald-700 transition-colors">
                    {campo.nombre}
                  </h3>
                </div>

                <div className="space-y-2.5 mb-6 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold">Superficie</span>
                    <span className="text-sm font-black text-emerald-700">
                      {campo.superficie_total ? `${campo.superficie_total} ha` : '—'}
                    </span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold">Provincia</span>
                    <span className="text-sm font-black text-gray-800 truncate max-w-[140px] text-right">
                      {campo.provincia || '—'}
                    </span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold">Departamento</span>
                    <span className="text-sm font-black text-gray-800 truncate max-w-[120px] text-right">
                      {campo.departamento || '—'}
                    </span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold">Tipo</span>
                    <span className="text-sm font-black text-gray-800 truncate max-w-[120px] text-right capitalize">
                      {campo.tipo === 'otro'
                        ? (campo.tipo_personalizado || 'Otro')
                        : (campo.tipo || '—')}
                    </span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold">Operación</span>
                    <span className="text-sm font-black text-gray-800 truncate max-w-[120px] text-right capitalize">
                      {campo.operacion === 'venta' ? 'Venta' : campo.operacion === 'alquiler' ? 'Alquiler' : '—'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleEdit(campo)}
                  className="w-full py-3.5 bg-gray-50 text-gray-500 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300"
                >
                  Ver Detalles <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border-2 border-dashed border-gray-100 p-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
            <Compass className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">No se encontraron campos</h3>
          <p className="text-gray-500 font-medium max-w-sm mb-8">Comienza registrando tu primer campo.</p>
          {canManage && (
            <button
              onClick={openNew}
              className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition shadow-xl shadow-emerald-100"
            >
              Crear Primer Campo
            </button>
          )}
        </div>
      )}

      {/* ── Slide-over Panel (Floating Style) ── */}
      {isModalOpen && (
        <div
          className={`fixed inset-0 z-[100] flex justify-end p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-400 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        >
          <div
            className={`bg-white w-full max-w-xl h-full shadow-2xl rounded-[2.5rem] flex flex-col border border-gray-100 overflow-hidden
              ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
          >
            <div className="p-6 sm:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/60 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-emerald-100 rounded-2xl">
                  <Compass className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {editingId ? 'Editar Terreno' : 'Registrar Nuevo Terreno'}
                  </h2>
                </div>
              </div>
              <button onClick={handleClose} className="p-2.5 hover:bg-gray-200 rounded-2xl transition text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
              <SectionCard icon={Tag} title="Identificación">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Nombre del Establecimiento</FieldLabel>
                    <TextInput
                      type="text"
                      value={formData.nombre}
                      onChange={set('nombre')}
                      placeholder="Ej: La Posta"
                    />
                  </div>
                  <div>
                    <FieldLabel>Superficie (Hectáreas)</FieldLabel>
                    <TextInput
                      icon={Ruler}
                      type="number"
                      step="any"
                      value={formData.superficie_total}
                      onChange={set('superficie_total')}
                      placeholder="Ej: 500"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Tipo</FieldLabel>
                  <SelectInput
                    icon={Tractor}
                    value={formData.tipo}
                    onChange={set('tipo')}
                  >
                    <option value="">Seleccionar tipo...</option>
                    <option value="agricola">Agrícola</option>
                    <option value="ganadero">Ganadero</option>
                    <option value="mixto">Mixto</option>
                    <option value="coto de caza">Coto de Caza</option>
                    <option value="otro">Otro</option>
                  </SelectInput>
                  {formData.tipo === 'otro' && (
                    <div className="mt-3">
                      <TextInput
                        type="text"
                        value={formData.tipo_personalizado}
                        onChange={set('tipo_personalizado')}
                        placeholder="Especificar tipo..."
                      />
                    </div>
                  )}
                </div>
                <div>
                  <FieldLabel>Tipo de Operación</FieldLabel>
                  <SelectInput
                    value={formData.operacion}
                    onChange={set('operacion')}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="venta">Venta</option>
                    <option value="alquiler">Alquiler</option>
                  </SelectInput>
                </div>
              </SectionCard>

              <SectionCard icon={Map} title="Ubicación y Delimitación" color="blue">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Provincia</FieldLabel>
                    <TextInput
                      icon={MapPin}
                      type="text"
                      value={formData.provincia}
                      onChange={set('provincia')}
                      placeholder="La Pampa"
                    />
                  </div>
                  <div>
                    <FieldLabel>Departamento</FieldLabel>
                    <TextInput
                      type="text"
                      value={formData.departamento}
                      onChange={set('departamento')}
                      placeholder="Capital"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Latitud</FieldLabel>
                    <TextInput
                      icon={MapPin}
                      type="number"
                      step="any"
                      value={formData.latitud}
                      onChange={set('latitud')}
                      placeholder="-36.6200"
                    />
                  </div>
                  <div>
                    <FieldLabel>Longitud</FieldLabel>
                    <TextInput
                      icon={MapPin}
                      type="number"
                      step="any"
                      value={formData.longitud}
                      onChange={set('longitud')}
                      placeholder="-64.2900"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <FieldLabel>Ubicación y Delimitación del Lote</FieldLabel>
                    <div className="text-[10px] text-gray-400 font-medium bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                      {isDelimiting ? 'Modo Polígono: Haz clic para dibujar' : 'Modo Punto: Haz clic para fijar ubicación'}
                    </div>
                  </div>
                  <div className="h-[300px] rounded-2xl overflow-hidden border-2 border-gray-100 shadow-inner relative">
                    <MapContainer
                      center={mapCenter}
                      zoom={13}
                      className="h-full w-full z-0"
                    >
                      <TileLayer
                        url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
                        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        attribution="&copy; Google Maps"
                      />
                      <MapPicker
                        point={formData.latitud && formData.longitud ? [parseFloat(formData.latitud), parseFloat(formData.longitud)] : null}
                        setPoint={(coord) => {
                          setFormData(prev => ({ ...prev, latitud: coord[0].toString(), longitud: coord[1].toString() }));
                          // Eliminamos setMapCenter(coord) para evitar el zoom molesto
                        }}
                        coords={formData.coordenadas_poligono}
                        setCoords={(newCoords) => setFormData(prev => ({ ...prev, coordenadas_poligono: newCoords }))}
                        isDelimiting={isDelimiting}
                      />
                      <ChangeView center={mapCenter} />
                    </MapContainer>
                    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDelimiting(!isDelimiting)}
                        className={`p-2 rounded-xl text-sm font-bold shadow-lg border transition-all px-4 flex items-center gap-2 ${isDelimiting
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-white/90 backdrop-blur-md text-emerald-700 border-emerald-100 hover:bg-emerald-50'
                          }`}
                      >
                        <Layers className="w-4 h-4" /> {isDelimiting ? 'Terminar Delimitación' : 'Delimitar Límite'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, coordenadas_poligono: [], latitud: '', longitud: '' }));
                          setIsDelimiting(false);
                        }}
                        className="bg-white/90 backdrop-blur-md p-2 rounded-xl text-red-500 shadow-lg border border-red-50 hover:bg-red-50 transition-all px-4 text-sm font-bold flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Limpiar Mapa
                      </button>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <div className="pt-2 pb-2 flex gap-3">
                <button type="button" onClick={handleClose} className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition text-sm rounded-2xl">
                  Cancelar
                </button>
                <button type="submit" className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3">
                  <Save className="w-5 h-5" /> Guardar Establecimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
