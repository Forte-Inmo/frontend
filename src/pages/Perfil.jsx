import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  User, Mail, Shield, Save, Lock, Clock,
  Camera, Smartphone, CheckCircle2, ShieldAlert,
  Trash2, KeyRound, X, AlertCircle,
  Copy, Check, Fingerprint
} from 'lucide-react';

/* ─── UI Primitives ────────────────────────────────────────── */

function FieldLabel({ children, required }) {
  return (
    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">
      {children}{required && <span className="text-emerald-500 ml-0.5">*</span>}
    </label>
  );
}

function SectionCard({ icon: Icon, title, color = 'emerald', children, noPadding = false }) {
  const colorMap = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 px-8 py-6 border-b border-gray-50 bg-gray-50/40 shrink-0">
        <div className={`p-2.5 rounded-2xl ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-black text-gray-900 tracking-tight">{title}</h3>
      </div>
      <div className={`${noPadding ? '' : 'p-8'} space-y-6 flex-1`}>
        {children}
      </div>
    </div>
  );
}

function SecurityItem({ icon: Icon, title, description, actionText, actionColor = 'neutral', onClick, showCheck = false, disabled = false }) {
  const colorMap = {
    neutral: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 border-gray-200',
    red: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 border-transparent',
    soon: 'text-gray-300 border-gray-100 cursor-not-allowed bg-gray-50/50'
  };

  return (
    <div className="flex items-center justify-between gap-6 px-8 py-6 transition-all hover:bg-gray-50/50 group first:pt-8 last:pb-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
            {showCheck && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        onClick={!disabled ? onClick : undefined}
        disabled={disabled}
        className={`px-4 py-2 rounded-xl font-bold text-xs transition-all border shrink-0 ${disabled ? colorMap.soon : (colorMap[actionColor] || colorMap.neutral)} ${!disabled && 'active:scale-95'}`}
      >
        {actionText}
      </button>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────── */

export default function Perfil() {
  const { profile, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // 2FA / MFA State
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [enrollData, setEnrollData] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // UI Helpers
  const [isClosing, setIsClosing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
      });
    }
    checkMfaStatus();
  }, [profile]);

  const checkMfaStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const totpFactor = data.all.find(f => f.factor_type === 'totp' && f.status === 'verified');
      if (totpFactor) {
        setIs2faEnabled(true);
        setMfaFactorId(totpFactor.id);
      } else {
        setIs2faEnabled(false);
        setMfaFactorId(null);
      }
    } catch (err) {
      console.error("Error checking MFA status:", err);
    }
  };

  const handleMfaAction = async () => {
    if (is2faEnabled) {
      if (confirm('¿Estás seguro de que deseas desactivar la autenticación en dos pasos? Tu cuenta será menos segura.')) {
        await disableMfa();
      }
    } else {
      await startMfaEnrollment();
    }
  };

  const startMfaEnrollment = async () => {
    setMfaLoading(true);
    setMfaError('');
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });
      if (error) throw error;
      setEnrollData(data);
      setIsMfaModalOpen(true);
    } catch (err) {
      setMfaError(err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const verifyAndEnableMfa = async () => {
    if (mfaCode.length !== 6) return;
    setMfaLoading(true);
    setMfaError('');
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollData.id
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: challengeData.id,
        code: mfaCode
      });
      if (verifyError) throw verifyError;

      alert("¡Autenticación en dos pasos activada correctamente!");
      setIs2faEnabled(true);
      handleCloseMfaModal();
      await checkMfaStatus();
    } catch (err) {
      setMfaError(err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const disableMfa = async () => {
    if (!mfaFactorId) return;
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: mfaFactorId
      });
      if (error) throw error;
      alert("2FA desactivado");
      setIs2faEnabled(false);
      await checkMfaStatus();
    } catch (err) {
      alert("Error al desactivar 2FA: " + err.message);
    }
  };

  const handleCloseMfaModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsMfaModalOpen(false);
      setIsClosing(false);
      setEnrollData(null);
      setMfaCode('');
      setMfaError('');
    }, 400);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== profile?.email) {
      alert("El correo no coincide.");
      return;
    }

    setLoading(true);
    try {
      alert("Solicitud procesada. Tu cuenta será eliminada en las próximas 24 horas.");
      setIsDeleteModalOpen(false);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshUser();
      alert("Perfil actualizado correctamente");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : profile?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="p-6 sm:p-8 bg-gray-50/50 min-h-full space-y-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-4 tracking-tight">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <User className="w-8 h-8 text-white" />
            </div>
            Mi Perfil
          </h1>
          <p className="text-gray-500 font-medium mt-2">Gestiona tu información personal y seguridad.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Column 1: Profile Summary ── */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm text-center flex flex-col items-center sticky top-8">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-[3rem] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-black text-5xl shadow-2xl shadow-emerald-200">
                {userInitials}
              </div>
              <button className="absolute -bottom-2 -right-2 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 text-emerald-600 hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{profile?.full_name || 'Usuario'}</h2>
            <p className="text-gray-500 font-medium mb-8">{profile?.email}</p>

            <div className="w-full space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Rol</span>
                </div>
                <span className="text-sm font-bold text-gray-700">{profile?.roles?.name || 'Usuario'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Miembro desde</span>
                </div>
                <span className="text-sm font-bold text-gray-700">{new Date(profile?.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Column 2 & 3: Settings & Security ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Personal Information */}
          <form onSubmit={handleSave} className="space-y-6">
            <SectionCard icon={User} title="Información Personal" color="emerald">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <FieldLabel required>Nombre Completo</FieldLabel>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full pl-14 pr-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-bold text-gray-700"
                      placeholder="Ej: Franco Casas"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Correo Electrónico</FieldLabel>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    <input
                      type="email"
                      disabled
                      value={profile?.email || ''}
                      className="w-full pl-14 pr-6 py-4 rounded-2xl bg-gray-100 border-2 border-transparent text-gray-400 font-bold cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Identificador Unico</FieldLabel>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    <input
                      type="text"
                      disabled
                      value={profile?.id?.substring(0, 16) + '...'}
                      className="w-full pl-14 pr-6 py-4 rounded-2xl bg-gray-100 border-2 border-transparent text-gray-400 font-bold cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 text-white font-black px-10 py-4 rounded-2xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Actualizar Perfil
                </button>
              </div>
            </SectionCard>
          </form>

          {/* Unified Security Section */}
          <SectionCard icon={Shield} title="Seguridad y Cuenta" color="amber" noPadding>
            <div className="divide-y divide-gray-50">
              <SecurityItem
                icon={KeyRound}
                title="Contraseña"
                description="Actualiza tu contraseña periódicamente para mantener tu cuenta segura."
                actionText="Restablecer"
                actionColor="neutral"
                onClick={() => alert("Enlace enviado")}
              />

              <SecurityItem
                icon={Fingerprint}
                title="Passkey"
                description="Inicia sesión usando biometría o llaves de seguridad físicas."
                actionText="Próximamente"
                actionColor="neutral"
                disabled={true}
              />

              <SecurityItem
                icon={Smartphone}
                title="Autenticación en dos pasos"
                description="Añade una capa extra de seguridad usando una app de autenticación."
                actionText={is2faEnabled ? 'Desactivar' : 'Configurar'}
                actionColor="neutral"
                showCheck={is2faEnabled}
                onClick={handleMfaAction}
              />

              <SecurityItem
                icon={Trash2}
                title="Eliminar Cuenta"
                description="Borra permanentemente todos tus datos y acceso a la plataforma."
                actionText="Eliminar"
                actionColor="red"
                onClick={() => setIsDeleteModalOpen(true)}
              />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── MFA Setup Modal (Slide-over) ── */}
      {isMfaModalOpen && enrollData && (
        <div className={`fixed inset-0 z-[200] flex justify-end p-4 bg-gray-900/60 backdrop-blur-md transition-all duration-400 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
          <div className={`bg-white w-full max-w-md h-full shadow-2xl rounded-[2.5rem] flex flex-col border border-gray-100 overflow-hidden ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Smartphone className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Configurar 2FA</h3>
              </div>
              <button onClick={handleCloseMfaModal} className="p-2 hover:bg-gray-200 rounded-xl transition text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-600 leading-relaxed">
                  1. Escanea este código QR con tu aplicación de autenticación (Google Authenticator, Authy, etc).
                </p>

                <div className="flex justify-center p-6 bg-white border-2 border-gray-50 rounded-[2.5rem] shadow-sm">
                  <img src={enrollData.totp.qr_code} alt="QR Code" className="w-48 h-48" />
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">O ingresa el código manualmente:</p>
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-sm font-black text-emerald-600 break-all">{enrollData.totp.secret}</code>
                    <button
                      onClick={() => copyToClipboard(enrollData.totp.secret)}
                      className="p-2 hover:bg-white rounded-lg transition text-gray-400 hover:text-emerald-600"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-600">
                  2. Ingresa el código de 6 dígitos generado por tu aplicación:
                </p>

                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-4xl font-black tracking-[0.5em] py-6 rounded-3xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none transition-all text-gray-900"
                  placeholder="000000"
                />

                {mfaError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-xs font-bold">{mfaError}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-gray-50/50 border-t border-gray-100 shrink-0">
              <button
                onClick={verifyAndEnableMfa}
                disabled={mfaCode.length !== 6 || mfaLoading}
                className="w-full bg-emerald-600 text-white font-black py-5 rounded-3xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-500/20 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
              >
                {mfaLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle2 className="w-5 h-5" />}
                Verificar y Activar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md shadow-2xl rounded-[3rem] p-10 border border-gray-100 space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-red-100 rounded-3xl text-red-600">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Acción Irreversible</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">
                Para confirmar la eliminación de tu cuenta, por favor escribe tu correo electrónico:
                <br />
                <strong className="text-gray-900 mt-2 block">{profile?.email}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-red-500 focus:bg-white focus:outline-none transition-all font-bold text-center"
                placeholder="Escribe tu correo aquí"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmText(''); }}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== profile?.email || loading}
                  className="flex-1 bg-red-500 text-white font-black px-6 py-4 rounded-2xl hover:bg-red-600 transition shadow-xl shadow-red-200 disabled:opacity-30 disabled:grayscale active:scale-95"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
