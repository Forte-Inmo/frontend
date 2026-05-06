import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock, Settings, Building2, Upload, Globe, Image, Phone, MapPin, CheckCircle2, Loader2, Palette } from 'lucide-react';

/* ─── Reusable field components ─────────────────────────── */

function FieldLabel({ children, required }) {
  return (
    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">
      {children}{required && <span className="text-emerald-500 ml-0.5">*</span>}
    </label>
  );
}

function TextInput({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      )}
      <input
        {...props}
        className={`w-full ${Icon ? 'pl-11' : 'pl-5'} pr-5 py-3.5 rounded-2xl bg-gray-50 border-2 border-transparent
          focus:border-emerald-500 focus:bg-white focus:outline-none
          transition-all duration-200 font-semibold text-gray-700
          placeholder:text-gray-300 placeholder:font-normal
          disabled:opacity-50 disabled:cursor-not-allowed`}
      />
    </div>
  );
}

function FileUploadZone({ label, value, onChange, disabled, uploading }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <label className={`
        flex flex-col items-center justify-center gap-3 w-full min-h-[120px]
        rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' :
          uploading ? 'border-emerald-300 bg-emerald-50/50 animate-pulse' :
          'border-gray-200 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50/30'}
      `}>
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          disabled={disabled || uploading}
          className="hidden"
        />
        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Subiendo...</span>
          </>
        ) : value ? (
          <div className="flex flex-col items-center gap-3 p-4 w-full">
            <img src={value} alt="preview" className="h-14 w-auto object-contain rounded-xl shadow-sm" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Imagen cargada · Clic para reemplazar
            </span>
          </div>
        ) : (
          <>
            <div className="p-3 bg-gray-100 rounded-xl">
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-bold text-gray-500">Arrastrá o hacé clic para subir</p>
              <p className="text-xs text-gray-300 mt-0.5">PNG, JPG, SVG · Máx. 5 MB</p>
            </div>
          </>
        )}
      </label>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-8 py-5 border-b border-gray-50 bg-gray-50/60">
        <div className="p-2 bg-emerald-100 rounded-xl">
          <Icon className="w-4 h-4 text-emerald-700" />
        </div>
        <h2 className="text-base font-black text-gray-800 tracking-tight">{title}</h2>
      </div>
      <div className="p-8">
        {children}
      </div>
    </section>
  );
}

/* ─── Main Component ─────────────────────────────────────── */

export default function Ajustes() {
  const { settings, refetchSettings } = useSettings();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('settings:manage');
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (settings) setFormData(settings);
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const uploadFile = async (event, fieldName) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `brand/${fieldName}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, [fieldName]: publicUrl }));
    } catch (error) {
      console.error('Supabase Upload Error:', error);
      alert('Error subiendo la imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        website_name: formData.website_name,
        background_url: formData.background_url,
        org1_name: formData.org1_name,
        org1_logo_url: formData.org1_logo_url,
        org1_address: formData.org1_address,
        org1_phone: formData.org1_phone,
        org2_name: formData.org2_name,
        org2_logo_url: formData.org2_logo_url,
        org2_address: formData.org2_address,
        org2_phone: formData.org2_phone,
        brand_colors: formData.brand_colors || {},
      };

      const { error } = await supabase
        .from('settings')
        .upsert({ id: formData.id || 1, ...payload });

      if (error) throw error;

      await refetchSettings();
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } catch (error) {
      console.error('Supabase Save Error:', error);
      alert('Error guardando los ajustes: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 bg-gray-50/50 min-h-full">

      {/* ── Page Header ── */}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-gray-900 flex items-center gap-4 tracking-tight">
          <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
            <Settings className="w-8 h-8 text-white" />
          </div>
          Ajustes Globales
        </h1>
        <p className="text-gray-500 font-medium mt-2 ml-1">
          Configurá la identidad visual de Forte en Supabase.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        <SectionCard icon={Globe} title="Visual del Entorno">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <FieldLabel>Nombre de la Plataforma</FieldLabel>
              <TextInput
                icon={Globe}
                type="text"
                name="website_name"
                value={formData.website_name || ''}
                onChange={handleChange}
                placeholder="Ej: Forte Agro"
                disabled={!canManage}
              />
            </div>
            <FileUploadZone
              label="Fondo del Login"
              value={formData.background_url}
              onChange={(e) => uploadFile(e, 'background_url')}
              disabled={!canManage}
              uploading={uploading}
            />
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Org 1 */}
          <SectionCard icon={Building2} title="Organización Principal">
            <div className="space-y-5">
              <div>
                <FieldLabel>Nombre</FieldLabel>
                <TextInput
                  type="text"
                  name="org1_name"
                  value={formData.org1_name || ''}
                  onChange={handleChange}
                  placeholder="Ej: Forte Inmobiliaria"
                  disabled={!canManage}
                />
              </div>
              <FileUploadZone
                label="Logotipo"
                value={formData.org1_logo_url}
                onChange={(e) => uploadFile(e, 'org1_logo_url')}
                disabled={!canManage}
                uploading={uploading}
              />
            </div>
          </SectionCard>

          {/* Org 2 */}
          <SectionCard icon={Building2} title="Organización Asociada">
            <div className="space-y-5">
              <div>
                <FieldLabel>Nombre</FieldLabel>
                <TextInput
                  type="text"
                  name="org2_name"
                  value={formData.org2_name || ''}
                  onChange={handleChange}
                  placeholder="Ej: Forte Agropecuaria"
                  disabled={!canManage}
                />
              </div>
              <FileUploadZone
                label="Logotipo"
                value={formData.org2_logo_url}
                onChange={(e) => uploadFile(e, 'org2_logo_url')}
                disabled={!canManage}
                uploading={uploading}
              />
            </div>
          </SectionCard>
        </div>

        <SectionCard icon={Palette} title="Paleta de Colores de Marca">
          <p className="text-xs text-gray-400 mb-6 -mt-2 px-1">Definí los colores institucionales para que el editor de informes los use automáticamente.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 flex flex-col items-center gap-3">
              <FieldLabel>Primario</FieldLabel>
              <input 
                type="color" 
                value={formData.brand_colors?.primary || '#107549'} 
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  brand_colors: { ...(prev.brand_colors || {}), primary: e.target.value } 
                }))}
                className="w-16 h-16 rounded-2xl cursor-pointer border-none bg-transparent p-0"
              />
              <span className="text-[10px] font-black text-gray-400 uppercase">{formData.brand_colors?.primary || '#107549'}</span>
            </div>

            <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 flex flex-col items-center gap-3">
              <FieldLabel>Secundario</FieldLabel>
              <input 
                type="color" 
                value={formData.brand_colors?.secondary || '#003399'} 
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  brand_colors: { ...(prev.brand_colors || {}), secondary: e.target.value } 
                }))}
                className="w-16 h-16 rounded-2xl cursor-pointer border-none bg-transparent p-0"
              />
              <span className="text-[10px] font-black text-gray-400 uppercase">{formData.brand_colors?.secondary || '#003399'}</span>
            </div>

            <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 flex flex-col items-center gap-3">
              <FieldLabel>Acento</FieldLabel>
              <input 
                type="color" 
                value={formData.brand_colors?.accent || '#ccff00'} 
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  brand_colors: { ...(prev.brand_colors || {}), accent: e.target.value } 
                }))}
                className="w-16 h-16 rounded-2xl cursor-pointer border-none bg-transparent p-0"
              />
              <span className="text-[10px] font-black text-gray-400 uppercase">{formData.brand_colors?.accent || '#ccff00'}</span>
            </div>

            <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 flex flex-col items-center gap-3">
              <FieldLabel>Oscuro / Fondo</FieldLabel>
              <input 
                type="color" 
                value={formData.brand_colors?.dark || '#001a4d'} 
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  brand_colors: { ...(prev.brand_colors || {}), dark: e.target.value } 
                }))}
                className="w-16 h-16 rounded-2xl cursor-pointer border-none bg-transparent p-0"
              />
              <span className="text-[10px] font-black text-gray-400 uppercase">{formData.brand_colors?.dark || '#001a4d'}</span>
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 pb-4">
          {!canManage && (
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100">
              <Lock className="w-4 h-4" />
              Modo visualización
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving || uploading || !canManage}
            className={`
              ml-auto flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95
              ${!canManage
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                : savedOk
                  ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'}
            `}
          >
            {isSaving ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
            ) : savedOk ? (
              <><CheckCircle2 className="w-5 h-5" /> ¡Guardado!</>
            ) : (
              'Guardar Ajustes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
