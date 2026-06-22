import { supabase } from '../lib/supabase';

function generateToken() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.getRandomValues(new Uint8Array(16)).reduce(
    (s, b) => s + b.toString(16).padStart(2, '0'), ''
  );
}

export function useExportPDF() {
  const exportPDF = async ({ informeId, filename, onProgress, informeTitle }) => {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    onProgress?.({ stage: 'token', progress: 0, logs: ['Generando token de acceso...'] });

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
    const userEmail = session?.user?.email || '';
    const userId = session?.user?.id || '';
    const renderUrl = `${window.location.origin}/render/${informeId}?token=${token}&access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;

    const baseUrl = import.meta.env.VITE_PDF_SERVICE_URL;

    const response = await fetch(`${baseUrl}/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: renderUrl,
        informeId,
        userId,
        userEmail,
        informeTitle: informeTitle || filename || 'Informe',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error('Error generando PDF: ' + err);
    }

    const { jobId, exportId } = await response.json();
    if (!jobId) throw new Error('No se recibió jobId del servicio PDF');

    let done = false;
    let attempts = 0;
    const maxAttempts = 120;

    while (!done && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;

      const statusRes = await fetch(`${baseUrl}/pdf-status/${jobId}`);
      if (!statusRes.ok) continue;

      const status = await statusRes.json();

      onProgress?.({
        stage: status.stage,
        progress: status.progress,
        logs: status.logs || [],
        error: status.error,
      });

      if (status.stage === 'done') {
        done = true;
        const blobRes = await fetch(`${baseUrl}/pdf-result/${jobId}`);
        if (!blobRes.ok) throw new Error('Error descargando PDF');
        const blob = await blobRes.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'informe.pdf';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return exportId;
      }

      if (status.stage === 'error') {
        throw new Error(status.error || 'Error generando PDF');
      }
    }

    if (!done) throw new Error('Tiempo de espera agotado (120s)');
  };

  const checkExistingExport = async (informeId) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return { exists: false };

    const baseUrl = import.meta.env.VITE_PDF_SERVICE_URL;
    const res = await fetch(`${baseUrl}/check-existing/${informeId}/${userId}`);
    if (!res.ok) return { exists: false };
    return res.json();
  };

  const getExports = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return [];

    const baseUrl = import.meta.env.VITE_PDF_SERVICE_URL;
    const res = await fetch(`${baseUrl}/exports/${userId}`);
    if (!res.ok) return [];
    return res.json();
  };

  return { exportPDF, checkExistingExport, getExports };
}
