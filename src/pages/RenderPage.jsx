import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
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
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const [status, setStatus] = useState('validating');
  const [informe, setInforme] = useState(null);
  const [pagesData, setPagesData] = useState([]);
  const rootRef = useRef(null);

  const { settings } = useSettings();
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const fetched = useRef(false);

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

      const now = new Date();
      if (new Date(tokenData.expires_at) < now) {
        setStatus('error');
        return;
      }

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
    if (status !== 'ready') return;

    let destroyed = false;

    (async () => {
      await document.fonts.ready;
      if (destroyed) return;

      const allImages = new Set();
      const trackImg = (img) => {
        if (allImages.has(img)) return;
        allImages.add(img);
      };

      document.querySelectorAll('#render-root img').forEach(trackImg);

      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeName === 'IMG') trackImg(node);
            if (node.querySelectorAll) {
              node.querySelectorAll('img').forEach(trackImg);
            }
          }
        }
      });
      const rootEl = document.getElementById('render-root');
      if (rootEl) {
        observer.observe(rootEl, { childList: true, subtree: true });
      }

      const waitImages = () => new Promise((resolve) => {
        const check = () => {
          const pending = [...allImages].filter(img => !img.complete);
          if (pending.length === 0) return resolve();
          pending.forEach(img => {
            img.addEventListener('load', check, { once: true });
            img.addEventListener('error', check, { once: true });
          });
        };
        check();
      });

      await waitImages();
      if (destroyed) return;

      await new Promise(r => setTimeout(r, 500));
      if (destroyed) return;

      observer.disconnect();
      rootRef.current?.setAttribute('data-render-complete', 'true');
    })();

    return () => { destroyed = true; };
  }, [status]);

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
  const displayPages = (from != null && to != null)
    ? pagesData.slice(Number(from), Number(to) + 1)
    : pagesData;

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,900;1,400;1,500;1,600;1,700;1,900&display=swap&subset=latin-ext');
        * { font-family: 'Inter', system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; text-shadow: none !important; box-shadow: none !important; }
        [data-no-print="true"], .export-hidden { display: none !important; }
        textarea, input { outline: none !important; box-shadow: none !important; caret-color: transparent !important; }
        [contenteditable] { outline: none !important; box-shadow: none !important; text-shadow: none !important; }
        h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
        .bloque, .seccion { break-inside: avoid; page-break-inside: avoid; }
        @page { size: A4; margin: 0; }
      `}</style>
      {displayPages.map((page, displayIndex) => {
        const realIndex = (from != null && to != null) ? Number(from) + displayIndex : displayIndex;
        return (
        <div
          key={page.id}
          id={`page-${realIndex}`}
          data-page-index={realIndex}
          style={{
            width: '210mm',
            height: '297mm',
            position: 'relative',
            pageBreakAfter: 'always',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
          }}
        >
          {page.type === 'CARATULA' && <CaratulaPage page={page} pageIndex={realIndex} isEditMode={false} isPDFRender={true} campoMetadata={campoMetadata} settings={settings} acquireLock={()=>{}} releaseLock={()=>{}} isLockedByOther={()=>false} activeLocks={{}} />}
          {page.type === 'UBICACION' && <UbicacionPage page={page} pageIndex={realIndex} isEditMode={false} isPDFRender={true} settings={settings} />}
          {page.type === 'SITUACION_ACTUAL' && <SituacionActualPage page={page} pageIndex={realIndex} isEditMode={false} isPDFRender={true} settings={settings} />}
          {page.type === 'DINAMICA' && <DinamicaPage page={page} pageIndex={realIndex} isEditMode={false} isPDFRender={true} settings={settings} />}
          {page.type === 'ANALISIS_SUELO' && <AnalisisSueloPage page={page} pageIndex={realIndex} isEditMode={false} isPDFRender={true} settings={settings} />}
          {page.type === 'TEXTO_FOTOS' && <TextoFotosPage page={page} pageIndex={realIndex} isEditMode={false} isPDFRender={true} settings={settings} acquireLock={()=>{}} releaseLock={()=>{}} isLockedByOther={()=>false} activeLocks={{}} />}
        </div>
        );
      })}
    </div>
  );
}
