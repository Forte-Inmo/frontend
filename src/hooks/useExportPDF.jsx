import { supabase } from '../lib/supabase';

function generateToken() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.getRandomValues(new Uint8Array(16)).reduce(
    (s, b) => s + b.toString(16).padStart(2, '0'), ''
  );
}

export function useExportPDF() {
  const exportPDF = async ({ informeId, filename }) => {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const { error: tokenError } = await supabase
      .from('pdf_tokens')
      .insert({
        token,
        informe_id: informeId,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      throw new Error('Error generando token de acceso: ' + tokenError.message);
    }

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';
    const refreshToken = session?.refresh_token || '';
    const renderUrl = `${window.location.origin}/render/${informeId}?token=${token}&access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;

    const response = await fetch(`${import.meta.env.VITE_PDF_SERVICE_URL}/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: renderUrl }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error('Error generando PDF: ' + err);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'informe.pdf';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return { exportPDF };
}
