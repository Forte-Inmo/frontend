import { supabase } from '../lib/supabase';

function generateToken() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.getRandomValues(new Uint8Array(16)).reduce(
    (s, b) => s + b.toString(16).padStart(2, '0'), ''
  );
}

export function useExportBooklet() {
  const exportBooklet = async ({ informeId, filename, onProgress, informeTitle }) => {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    onProgress?.({ stage: 'token', progress: 0, logs: ['Generando token de acceso...'] });
    console.log('[ExportBooklet] token generado', { informeId, token: token.slice(0, 8) + '...' });

    const { error: tokenError } = await supabase
      .from('pdf_tokens')
      .insert({
        token,
        informe_id: informeId,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('[ExportBooklet] error insertando pdf_tokens:', tokenError);
      throw new Error('Error generando token de acceso: ' + tokenError.message);
    }
    console.log('[ExportBooklet] pdf_tokens insertado OK');

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';
    const refreshToken = session?.refresh_token || '';
    const userEmail = session?.user?.email || '';
    const userId = session?.user?.id || '';
    console.log('[ExportBooklet] sesión obtenida', { userId, hasAccessToken: !!accessToken, userEmail });
    const renderUrl = `${window.location.origin}/render/${informeId}?token=${token}&access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;

    const baseUrl = import.meta.env.VITE_PDF_SERVICE_URL;
    console.log('[ExportBooklet] llamando /generate-booklet', { baseUrl, informeId, userId });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    let response;
    try {
      response = await fetch(`${baseUrl}/generate-booklet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: renderUrl,
          informeId,
          userId,
          userEmail,
          informeTitle: informeTitle || filename || 'Informe',
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        console.error('[ExportBooklet] timeout esperando /generate-booklet (90s)');
        throw new Error('Timeout esperando respuesta del servicio PDF (90s)');
      }
      console.error('[ExportBooklet] error de red en /generate-booklet:', fetchErr);
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('[ExportBooklet] /generate-booklet respondió', response.status);
    if (!response.ok) {
      const err = await response.text();
      console.error('[ExportBooklet] /generate-booklet error body:', err);
      throw new Error('Error generando booklet A3: ' + err);
    }

    const { jobId } = await response.json();
    if (!jobId) throw new Error('No se recibió jobId del servicio PDF');
    console.log('[ExportBooklet] jobId recibido:', jobId);

    let done = false;
    let attempts = 0;
    const maxAttempts = 120;

    while (!done && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;

      const statusRes = await fetch(`${baseUrl}/pdf-status/${jobId}`);
      if (!statusRes.ok) {
        console.warn(`[ExportBooklet] pdf-status intento ${attempts} no-ok:`, statusRes.status);
        continue;
      }

      const status = await statusRes.json();
      console.log(`[ExportBooklet] poll #${attempts}:`, { stage: status.stage, progress: status.progress, error: status.error, lastLog: (status.logs || []).slice(-1)[0] });

      onProgress?.({
        stage: status.stage,
        progress: status.progress,
        logs: status.logs || [],
        error: status.error,
      });

      if (status.stage === 'done') {
        done = true;
        console.log('[ExportBooklet] job completado, descargando PDF');
        const blobRes = await fetch(`${baseUrl}/pdf-result/${jobId}`);
        if (!blobRes.ok) throw new Error('Error descargando PDF');
        const blob = await blobRes.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'informe-revista.pdf';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      if (status.stage === 'error') {
        console.error('[ExportBooklet] job en error:', status.error);
        throw new Error(status.error || 'Error generando booklet');
      }
    }

    if (!done) throw new Error('Tiempo de espera agotado (120s)');
  };

  return { exportBooklet };
}