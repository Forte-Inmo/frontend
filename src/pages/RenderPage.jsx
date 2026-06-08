import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CaratulaPage from '../components/ReportPages/CaratulaPage';
import UbicacionPage from '../components/ReportPages/UbicacionPage';
import SituacionActualPage from '../components/ReportPages/SituacionActualPage';
import DinamicaPage from '../components/ReportPages/DinamicaPage';
import AnalisisSueloPage from '../components/ReportPages/AnalisisSueloPage';
import TextoFotosPage from '../components/ReportPages/TextoFotosPage';

export default function RenderPage() {
  const { informeId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('validating');
  const [informe, setInforme] = useState(null);
  const [pagesData, setPagesData] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const rootRef = useRef(null);

  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const fetched = useRef(false);

  useEffect(() => {
    document.fonts.ready.then(() => setFontReady(true));
  }, []);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    (async () => {
      if (!token || !informeId) {
        setStatus('error');
        return;
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setStatus('error');
          return;
        }
      }

      const { data: tokenData, error: tokenError } = await supabase
        .from('pdf_tokens')
        .select('*')
        .eq('token', token)
        .eq('informe_id', informeId)
        .single();

      if (tokenError || !tokenData) {
        setStatus('error');
        return;
      }

      if (tokenData.used) {
        setStatus('error');
        return;
      }

      const now = new Date();
      if (new Date(tokenData.expires_at) < now) {
        setStatus('error');
        return;
      }

      await supabase
        .from('pdf_tokens')
        .update({ used: true })
        .eq('id', tokenData.id);

      const { data: informeData, error: informeError } = await supabase
        .from('informes')
        .select(`*, campo:campos(nombre, latitud, longitud, superficie_total, provincia, departamento)`)
        .eq('id', informeId)
        .single();

      if (informeError || !informeData) {
        setStatus('error');
        return;
      }

      setInforme(informeData);
      setPagesData(informeData.pages_data?.length > 0
        ? informeData.pages_data
        : [{ id: crypto.randomUUID(), type: 'CARATULA', titulo: 'INFORME TÉCNICO', subtitulo: informeData.campo?.nombre || 'TERRENO' }]
      );
      setStatus('ready');
    })();
  }, [token, informeId]);

  useEffect(() => {
    if (status !== 'ready' || !fontReady) return;

    const images = document.querySelectorAll('#render-root img');
    if (images.length === 0) {
      setImagesLoaded(true);
      return;
    }

    let loaded = 0;
    const total = images.length;

    const onDone = () => {
      loaded++;
      if (loaded >= total) setImagesLoaded(true);
    };

    images.forEach((img) => {
      if (img.complete) {
        onDone();
      } else {
        img.addEventListener('load', onDone);
        img.addEventListener('error', onDone);
      }
    });
  }, [status, fontReady, pagesData]);

  useEffect(() => {
    if (status === 'ready' && imagesLoaded && fontReady && rootRef.current) {
      rootRef.current.setAttribute('data-render-complete', 'true');
    }
  }, [status, imagesLoaded, fontReady]);

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#dc2626' }}>Acceso Denegado</h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>El token es inválido o ha expirado.</p>
        </div>
      </div>
    );
  }

  if (status !== 'ready') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <p style={{ color: '#6b7280' }}>Cargando...</p>
      </div>
    );
  }

  const campoMetadata = informe?.campo;

  return (
    <div
      id="render-root"
      ref={rootRef}
      style={{
        width: '100%',
        background: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap&subset=latin-ext');
        * { font-family: 'Inter', system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        [data-no-print="true"], .export-hidden { display: none !important; }
        textarea, input { outline: none !important; box-shadow: none !important; caret-color: transparent !important; }
        h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
        .bloque, .seccion { break-inside: avoid; page-break-inside: avoid; }
        @page { size: A4; margin: 0; }
      `}</style>
      {pagesData.map((page, pageIndex) => (
        <div
          key={page.id}
          id={`page-${pageIndex}`}
          style={{
            width: '210mm',
            height: '297mm',
            position: 'relative',
            pageBreakAfter: 'always',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
          }}
        >
          {page.type === 'CARATULA' && <CaratulaPage page={page} pageIndex={pageIndex} isEditMode={false} isPDFRender={true} campoMetadata={campoMetadata} acquireLock={()=>{}} releaseLock={()=>{}} isLockedByOther={()=>false} activeLocks={{}} />}
          {page.type === 'UBICACION' && <UbicacionPage page={page} pageIndex={pageIndex} isEditMode={false} isPDFRender={true} />}
          {page.type === 'SITUACION_ACTUAL' && <SituacionActualPage page={page} pageIndex={pageIndex} isEditMode={false} isPDFRender={true} />}
          {page.type === 'DINAMICA' && <DinamicaPage page={page} pageIndex={pageIndex} isEditMode={false} isPDFRender={true} />}
          {page.type === 'ANALISIS_SUELO' && <AnalisisSueloPage page={page} pageIndex={pageIndex} isEditMode={false} isPDFRender={true} />}
          {page.type === 'TEXTO_FOTOS' && <TextoFotosPage page={page} pageIndex={pageIndex} isEditMode={false} isPDFRender={true} acquireLock={()=>{}} releaseLock={()=>{}} isLockedByOther={()=>false} activeLocks={{}} />}
        </div>
      ))}
    </div>
  );
}
