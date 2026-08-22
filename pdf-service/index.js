const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const nodemailer = require('nodemailer');
const { PDFDocument } = require('pdf-lib');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: ws },
});

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const SMTP_FROM = process.env.SMTP_FROM || 'noreply@forteinmo.com';

const APP_URL = process.env.APP_URL || 'https://app.forteinmo.com';

const jobs = new Map();
const JOB_TIMEOUT = parseInt(process.env.JOB_TIMEOUT || '600', 10) * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || '1', 10);
let activeJobs = 0;
const jobQueue = [];

async function runExclusive(job, worker) {
  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    jobQueue.push({ job, worker });
    console.log(`Job ${job.id} encolado (${activeJobs}/${MAX_CONCURRENT_JOBS} activos, ${jobQueue.length} en cola)`);
    updateJob(job, { progress: 1, logs: [...job.logs, `En cola de espera (${jobQueue.length} delante)...`] });
    return;
  }
  activeJobs++;
  try {
    await worker(job);
  } finally {
    activeJobs--;
    const next = jobQueue.shift();
    if (next) runExclusive(next.job, next.worker);
  }
}

function runCommand(cmd, timeoutMs) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs, maxBuffer: 100 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const detail = (stderr || '').trim().split('\n').pop();
        reject(new Error(`Comando falló (${detail || err.message})`));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function runCommandWithProgress(job, label, cmd, timeoutMs, { startProgress = 65, endProgress = 70 } = {}) {
  const startedAt = Date.now();
  let progress = startProgress;
  const heartbeat = setInterval(() => {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
    progress = Math.min(endProgress, progress + 1);
    const msg = `[${((Date.now() - job.createdAt) / 1000).toFixed(1)}s] ${label} (${elapsed}s)... ${progress}%`;
    console.log(msg);
    updateJob(job, { logs: [...job.logs, msg], progress });
  }, 5000);

  try {
    return await runCommand(cmd, timeoutMs);
  } finally {
    clearInterval(heartbeat);
  }
}

async function updatePdfExport(exportId, updates) {
  if (!exportId) return;
  const { error } = await supabase
    .from('pdf_exports')
    .update(updates)
    .eq('id', exportId);
  if (error) {
    console.error(`Error updating pdf_export ${exportId}:`, error.message);
  }
}

async function uploadToStorage(userId, informeId, pdfBuffer) {
  const timestamp = Date.now();
  const storagePath = `${userId}/${informeId}_${timestamp}.pdf`;
  const result = await Promise.race([
    supabase.storage.from('pdf-exports').upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timeout (15s)')), 15000)
    ),
  ]);
  if (result.error) throw new Error(`Storage upload failed: ${result.error.message}`);
  return storagePath;
}

async function getSignedUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('pdf-exports')
    .createSignedUrl(storagePath, 604800);
  if (error) return null;
  return data.signedUrl;
}

async function getDownloadUrl(storagePath) {
  const { data } = supabase.storage
    .from('pdf-exports')
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

async function sendEmail(recipientEmail, downloadUrl, informeTitle) {
  if (!transporter) {
    console.log('SMTP not configured, skipping email');
    return;
  }
  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: recipientEmail,
      subject: `PDF exportado: ${informeTitle || 'Informe'}`,
      html: `<p>Tu PDF <strong>${informeTitle || 'Informe'}</strong> está listo para descargar.</p>
<p><a href="${downloadUrl}">Hacé clic acá para descargarlo</a></p>
<p>El enlace expira en 7 días.</p>`,
    });
    console.log(`Email sent to ${recipientEmail}`);
  } catch (err) {
    console.error(`Failed to send email: ${err.message}`);
  }
}

async function renderChunk(job, { from, to }) {
  const chunkUrl = `${job.url}${job.url.includes('?') ? '&' : '?'}from=${from}&to=${to}`;

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
      '--force-color-profile=srgb',
      '--disable-lcd-text',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
    headless: true,
  });

  const page = await browser.newPage();
  page.on('console', (msg) => {
    const label = `[browser chunk ${from}-${to}] ${msg.text()}`;
    const s = ((Date.now() - job.createdAt) / 1000).toFixed(1);
    console.log(`[${s}s] ${label}`);
    updateJob(job, { logs: [...job.logs, `[${s}s] ${label}`] });
  });
  page.on('pageerror', (err) => {
    const label = `[browser error chunk ${from}-${to}] ${err.message}`;
    const s = ((Date.now() - job.createdAt) / 1000).toFixed(1);
    console.log(`[${s}s] ${label}`);
    updateJob(job, { logs: [...job.logs, `[${s}s] ${label}`] });
  });

  await page.setViewport({ width: 794, height: 1123 });
  await page.emulateMediaType('screen');

  const tChunk = (label) => {
    const s = ((Date.now() - job.createdAt) / 1000).toFixed(1);
    const msg = `[${s}s] ${label}`;
    console.log(msg);
    updateJob(job, { logs: [...job.logs, msg] });
  };

  tChunk(`Navegando chunk ${from}-${to}...`);
  await page.goto(chunkUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  tChunk(`Chunk ${from}-${to} cargado, esperando fuentes...`);

  await page.waitForFunction('document.fonts.ready', { timeout: 10000 });
  tChunk(`Chunk ${from}-${to} fuentes listas, esperando render...`);

  await page.waitForSelector('[data-render-complete="true"]', { timeout: 45000 });
  tChunk(`Chunk ${from}-${to} render completo, generando PDF...`);

  await page.waitForNetworkIdle({ idleTime: 500 });

  const pdf = await Promise.race([
    page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('PDF generation timeout (60s)')), 60000)
    ),
  ]);

  await browser.close();

  const tmpPath = path.join('/tmp', `chunk-${job.id}-${from}-${to}.pdf`);
  fs.writeFileSync(tmpPath, pdf);
  tChunk(`Chunk ${from}-${to} PDF generado (${(pdf.length / 1024).toFixed(0)} KB)`);
  return tmpPath;
}

async function processJob(job) {
  const t = (label) => {
    const s = ((Date.now() - job.createdAt) / 1000).toFixed(1);
    const msg = `[${s}s] ${label}`;
    console.log(msg);
    updateJob(job, { logs: [...job.logs, msg] });
  };

  updateJob(job, { stage: 'counting', progress: 3 });
  t('Iniciando renderizado paralelo...');

  const CHUNK_SIZE = 7;
  let browser;
  let pageCount = 0;

  try {
    // Paso 1: Browser liviano solo para contar páginas
    t('Lanzando browser para conteo de páginas...');
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none',
        '--force-color-profile=srgb',
        '--disable-lcd-text',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      headless: true,
    });

    const countPage = await browser.newPage();
    await countPage.setViewport({ width: 794, height: 1123 });
    await countPage.emulateMediaType('screen');
    t('Navegando para conteo...');
    const countUrl = `${job.url}${job.url.includes('?') ? '&' : '?'}count=1`;
    await countPage.goto(countUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await countPage.waitForFunction('document.fonts.ready', { timeout: 10000 });
    await countPage.waitForSelector('[data-render-complete="true"]', { timeout: 45000 });
    await countPage.waitForNetworkIdle({ idleTime: 500 });

    pageCount = await countPage.evaluate(() =>
      document.querySelectorAll('[data-page-index]').length
    );
    await browser.close();
    browser = null;
    t(`Total páginas detectadas: ${pageCount}`);

    if (pageCount === 0) {
      updateJob(job, { stage: 'error', error: 'No se encontraron páginas en el informe' });
      return;
    }

    updateJob(job, { stage: 'rendering', progress: 5 });

    // Paso 2: Dividir en chunks
    const chunks = [];
    for (let i = 0; i < pageCount; i += CHUNK_SIZE) {
      chunks.push({ from: i, to: Math.min(i + CHUNK_SIZE - 1, pageCount - 1) });
    }
    t(`Dividido en ${chunks.length} chunks de hasta ${CHUNK_SIZE} páginas cada uno: ${chunks.map(c => `${c.from}-${c.to}`).join(', ')}`);

    // Paso 3: Lanzar todos los chunks en paralelo
    const chunkPaths = await Promise.all(chunks.map((chunk, idx) =>
      (async () => {
        const tmpPath = await renderChunk(job, chunk);
        const progress = 10 + ((idx + 1) / chunks.length) * 75;
        updateJob(job, { progress: Math.round(progress) });
        return tmpPath;
      })()
    ));
    t('Todos los chunks generados, mergeando con Ghostscript...');
    updateJob(job, { stage: 'merging', progress: 88 });

    // Paso 4: Mergear todos los chunks con Ghostscript + CMYK
    const mergedPath = path.join('/tmp', `merged-${job.id}.pdf`);
    await runCommandWithProgress(job, 'Mergeando con Ghostscript', 
      `gs -dNOPAUSE -dBATCH -sDEVICE=pdfwrite ` +
      `-sProcessColorModel=DeviceCMYK ` +
      `-sColorConversionStrategy=CMYK ` +
      `-sColorConversionStrategyForImages=CMYK ` +
      `-dOverrideICC -o ${mergedPath} ${chunkPaths.join(' ')}`,
      300000,
      { startProgress: 88, endProgress: 92 }
    );

    const finalPdf = fs.readFileSync(mergedPath);
    updateJob(job, { progress: 92 });
    t(`PDF mergeado (${(finalPdf.length / 1024).toFixed(0)} KB)`);

    // Limpiar archivos temporales de chunks
    for (const cp of chunkPaths) {
      try { fs.unlinkSync(cp); } catch (_) {}
    }
    try { fs.unlinkSync(mergedPath); } catch (_) {}

    // Paso 5: Subir a Storage
    t('Subiendo PDF a Storage...');
    updateJob(job, { progress: 95 });

    try {
      const storagePath = await uploadToStorage(job.userId, job.informeId, finalPdf);
      await updatePdfExport(job.exportId, {
        status: 'done',
        storage_path: storagePath,
        completed_at: new Date().toISOString(),
      });
      t('PDF subido a Storage');

      const downloadUrl = `${APP_URL}/pdf-download/${job.exportId}`;
      await Promise.race([
        sendEmail(job.userEmail, downloadUrl, job.informeTitle),
        new Promise(r => setTimeout(r, 10000)),
      ]);

      t('PDF listo para descargar. Email enviado.');
      updateJob(job, {
        stage: 'done',
        progress: 100,
        pdf: finalPdf,
      });
    } catch (storageErr) {
      t(`Storage subida falló, sirviendo directo: ${storageErr.message}`);
      await updatePdfExport(job.exportId, { status: 'done', completed_at: new Date().toISOString() });
      t('PDF listo para descargar (sin storage)');
      updateJob(job, {
        stage: 'done',
        progress: 100,
        pdf: finalPdf,
      });
    }
  } catch (err) {
    try {
      if (browser) {
        const page = await browser.newPage();
        await page.screenshot({ path: '/tmp/pdf-error.png', fullPage: true });
        t('Screenshot guardado en /tmp/pdf-error.png');
      }
    } catch (_) {}
    t(`ERROR: ${err.message}`);
    updateJob(job, { stage: 'error', progress: 0, error: err.message });
    await updatePdfExport(job.exportId, { status: 'error', error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}

async function imposeBooklet(a4PdfBuffer) {
  const a4Doc = await PDFDocument.load(a4PdfBuffer);
  const totalPages = a4Doc.getPageCount();
  if (totalPages === 0) return a4PdfBuffer;

  const paddedPages = Math.ceil(totalPages / 4) * 4;
  const numSheets = paddedPages / 4;
  const A3_W = 1190.55;
  const A3_H = 841.89;
  const A4_W = 595.28;
  const A4_H = 841.89;

  const a3Doc = await PDFDocument.create();

  for (let sheet = 0; sheet < numSheets; sheet++) {
    const frontLeft = paddedPages - 2 * sheet;
    const frontRight = 2 * sheet + 1;
    const backLeft = 2 * sheet + 2;
    const backRight = paddedPages - 2 * sheet - 1;

    const frontPage = a3Doc.addPage([A3_W, A3_H]);
    if (frontLeft <= totalPages) {
      const [cp] = await a3Doc.copyPages(a4Doc, [frontLeft - 1]);
      const emb = await a3Doc.embedPage(cp);
      frontPage.drawPage(emb, { x: 0, y: 0, width: A4_W, height: A4_H });
    }
    if (frontRight <= totalPages) {
      const [cp] = await a3Doc.copyPages(a4Doc, [frontRight - 1]);
      const emb = await a3Doc.embedPage(cp);
      frontPage.drawPage(emb, { x: A4_W, y: 0, width: A4_W, height: A4_H });
    }

    const backPage = a3Doc.addPage([A3_W, A3_H]);
    if (backLeft <= totalPages) {
      const [cp] = await a3Doc.copyPages(a4Doc, [backLeft - 1]);
      const emb = await a3Doc.embedPage(cp);
      backPage.drawPage(emb, { x: 0, y: 0, width: A4_W, height: A4_H });
    }
    if (backRight <= totalPages) {
      const [cp] = await a3Doc.copyPages(a4Doc, [backRight - 1]);
      const emb = await a3Doc.embedPage(cp);
      backPage.drawPage(emb, { x: A4_W, y: 0, width: A4_W, height: A4_H });
    }
  }

  return Buffer.from(await a3Doc.save());
}

async function processBookletJob(job) {
  const t = (label) => {
    const s = ((Date.now() - job.createdAt) / 1000).toFixed(1);
    const msg = `[${s}s] ${label}`;
    console.log(msg);
    updateJob(job, { logs: [...job.logs, msg] });
  };

  job.url += `${job.url.includes('?') ? '&' : '?'}booklet=1`;
  updateJob(job, { stage: 'counting', progress: 3 });
  t('Iniciando renderizado para booklet A3...');

  const CHUNK_SIZE = 7;
  let browser;
  let pageCount = 0;

  try {
    t('Lanzando browser para conteo de páginas...');
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--font-render-hinting=none', '--force-color-profile=srgb',
        '--disable-lcd-text', '--disable-gpu', '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      headless: true,
    });

    const countPage = await browser.newPage();
    await countPage.setViewport({ width: 794, height: 1123 });
    await countPage.emulateMediaType('screen');
    t('Navegando para conteo...');
    const countUrl = `${job.url}${job.url.includes('?') ? '&' : '?'}count=1`;
    await countPage.goto(countUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await countPage.waitForFunction('document.fonts.ready', { timeout: 10000 });
    await countPage.waitForSelector('[data-render-complete="true"]', { timeout: 45000 });
    await countPage.waitForNetworkIdle({ idleTime: 500 });

    pageCount = await countPage.evaluate(() =>
      document.querySelectorAll('[data-page-index]').length
    );
    await browser.close();
    browser = null;
    t(`Total páginas detectadas: ${pageCount}`);

    if (pageCount === 0) {
      updateJob(job, { stage: 'error', error: 'No se encontraron páginas en el informe' });
      return;
    }

    updateJob(job, { stage: 'rendering', progress: 5 });

    const chunks = [];
    for (let i = 0; i < pageCount; i += CHUNK_SIZE) {
      chunks.push({ from: i, to: Math.min(i + CHUNK_SIZE - 1, pageCount - 1) });
    }
    t(`Dividido en ${chunks.length} chunks de hasta ${CHUNK_SIZE} páginas: ${chunks.map(c => `${c.from}-${c.to}`).join(', ')}`);

    const chunkPaths = await Promise.all(chunks.map((chunk, idx) =>
      (async () => {
        const tmpPath = await renderChunk(job, chunk);
        const progress = 10 + ((idx + 1) / chunks.length) * 55;
        updateJob(job, { progress: Math.round(progress) });
        return tmpPath;
      })()
    ));
    t('Todos los chunks generados, mergeando con Ghostscript...');
    updateJob(job, { stage: 'merging', progress: 65 });

    const mergedPath = path.join('/tmp', `merged-${job.id}.pdf`);
    await runCommandWithProgress(job, 'Mergeando con Ghostscript', 
      `gs -dNOPAUSE -dBATCH -sDEVICE=pdfwrite ` +
      `-sProcessColorModel=DeviceCMYK ` +
      `-sColorConversionStrategy=CMYK ` +
      `-sColorConversionStrategyForImages=CMYK ` +
      `-dOverrideICC -o ${mergedPath} ${chunkPaths.join(' ')}`,
      300000,
      { startProgress: 65, endProgress: 68 }
    );

    const mergedPdf = fs.readFileSync(mergedPath);
    updateJob(job, { progress: 68 });
    t(`PDF mergeado (${(mergedPdf.length / 1024).toFixed(0)} KB)`);

    for (const cp of chunkPaths) {
      try { fs.unlinkSync(cp); } catch (_) {}
    }

    // Impose into A3 booklet
    t('Imprimiendo en formato revista A3...');
    updateJob(job, { stage: 'imposing', progress: 75 });

    const bookletPdf = await imposeBooklet(mergedPdf);
    t(`Booklet A3 generado (${(bookletPdf.length / 1024).toFixed(0)} KB, ${Math.ceil(pageCount / 4)} hojas)`);

    try { fs.unlinkSync(mergedPath); } catch (_) {}

    // Upload to Storage
    t('Subiendo PDF a Storage...');
    updateJob(job, { progress: 90 });

    try {
      const storagePath = await uploadToStorage(job.userId, job.informeId, bookletPdf);
      await updatePdfExport(job.exportId, {
        status: 'done',
        storage_path: storagePath,
        completed_at: new Date().toISOString(),
      });
      t('PDF subido a Storage');

      const downloadUrl = `${APP_URL}/pdf-download/${job.exportId}`;
      await Promise.race([
        sendEmail(job.userEmail, downloadUrl, `[Revista A3] ${job.informeTitle}`),
        new Promise(r => setTimeout(r, 10000)),
      ]);

      t('Booklet A3 listo para descargar. Email enviado.');
      updateJob(job, { stage: 'done', progress: 100, pdf: bookletPdf });
    } catch (storageErr) {
      t(`Storage falló, sirviendo directo: ${storageErr.message}`);
      await updatePdfExport(job.exportId, { status: 'done', completed_at: new Date().toISOString() });
      t('Booklet A3 listo para descargar (sin storage)');
      updateJob(job, { stage: 'done', progress: 100, pdf: bookletPdf });
    }
  } catch (err) {
    try {
      if (browser) {
        const page = await browser.newPage();
        await page.screenshot({ path: '/tmp/pdf-error.png', fullPage: true });
        t('Screenshot guardado en /tmp/pdf-error.png');
      }
    } catch (_) {}
    t(`ERROR: ${err.message}`);
    updateJob(job, { stage: 'error', progress: 0, error: err.message });
    await updatePdfExport(job.exportId, { status: 'error', error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}

function updateJob(job, updates) {
  Object.assign(job, updates);
  jobs.set(job.id, job);
}

app.post('/generate-pdf', (req, res) => {
  const { url, informeId, userId, userEmail, informeTitle } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!informeId) return res.status(400).json({ error: 'informeId is required' });
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const jobId = crypto.randomUUID();
  const job = {
    id: jobId,
    exportId: null,
    url,
    informeId,
    userId,
    userEmail: userEmail || '',
    informeTitle: informeTitle || '',
    stage: 'pending',
    progress: 0,
    logs: [],
    pdf: null,
    error: null,
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);

  supabase
    .from('pdf_exports')
    .insert({ informe_id: informeId, user_id: userId, status: 'pending' })
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) {
        console.error('Failed to create export record:', error.message);
        updateJob(job, { stage: 'error', error: 'Failed to create export record: ' + error.message });
        return;
      }
      updateJob(job, { exportId: data.id });
    });

  res.json({ jobId });
  runExclusive(job, processJob);
});

app.post('/generate-booklet', (req, res) => {
  const { url, informeId, userId, userEmail, informeTitle } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!informeId) return res.status(400).json({ error: 'informeId is required' });
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const jobId = crypto.randomUUID();
  const job = {
    id: jobId,
    exportId: null,
    url,
    informeId,
    userId,
    userEmail: userEmail || '',
    informeTitle: informeTitle || '',
    stage: 'pending',
    progress: 0,
    logs: [],
    pdf: null,
    error: null,
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);

  supabase
    .from('pdf_exports')
    .insert({ informe_id: informeId, user_id: userId, status: 'pending' })
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) {
        console.error('Failed to create export record:', error.message);
        updateJob(job, { stage: 'error', error: 'Failed to create export record: ' + error.message });
        return;
      }
      updateJob(job, { exportId: data.id });
    });

  res.json({ jobId });
  runExclusive(job, processBookletJob);
});

app.get('/pdf-status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const elapsed = Date.now() - job.createdAt;
  const timedOut = elapsed > JOB_TIMEOUT && job.stage !== 'done' && job.stage !== 'error';
  if (timedOut) {
    updateJob(job, { stage: 'error', error: 'Timeout excedido (120s)', logs: [...job.logs, 'ERROR: Timeout excedido'] });
    updatePdfExport(job.exportId, { status: 'error', error: 'Timeout excedido' });
  }
  res.json({
    stage: job.stage,
    progress: job.progress,
    logs: job.logs,
    error: job.error,
  });
});

app.get('/pdf-result/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.stage !== 'done' || !job.pdf) return res.status(400).json({ error: 'PDF not ready yet' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="informe.pdf"');
  res.send(job.pdf);
});

app.get('/check-existing/:informeId/:userId', async (req, res) => {
  const { informeId, userId } = req.params;
  const { data, error } = await supabase
    .from('pdf_exports')
    .select('id, storage_path, created_at, completed_at, status')
    .eq('informe_id', informeId)
    .eq('user_id', userId)
    .eq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ error: error.message });

  if (data && data.length > 0) {
    const exportRecord = data[0];
    let signedUrl = null;
    if (exportRecord.storage_path) {
      signedUrl = await getSignedUrl(exportRecord.storage_path);
    }
    return res.json({
      exists: true,
      exportId: exportRecord.id,
      storagePath: exportRecord.storage_path,
      signedUrl,
      createdAt: exportRecord.created_at,
      completedAt: exportRecord.completed_at,
    });
  }

  res.json({ exists: false });
});

app.get('/exports/:userId', async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from('pdf_exports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });

  const exportsWithUrls = await Promise.all(
    (data || []).map(async (exp) => {
      let signedUrl = null;
      if (exp.storage_path && exp.status === 'done') {
        signedUrl = await getSignedUrl(exp.storage_path);
      }
      return { ...exp, signedUrl };
    })
  );

  res.json(exportsWithUrls);
});

app.get('/download/:exportId', async (req, res) => {
  const { exportId } = req.params;
  const { data, error } = await supabase
    .from('pdf_exports')
    .select('storage_path, informe_id')
    .eq('id', exportId)
    .single();

  if (error || !data || !data.storage_path) {
    return res.status(404).json({ error: 'Export not found' });
  }

  const { data: fileData, error: dlError } = await supabase.storage
    .from('pdf-exports')
    .download(data.storage_path);

  if (dlError) return res.status(500).json({ error: 'Failed to download PDF from storage' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="informe.pdf"`);
  res.send(Buffer.from(await fileData.arrayBuffer()));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > CLEANUP_INTERVAL) {
      jobs.delete(id);
    }
  }
}, CLEANUP_INTERVAL);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`PDF service running on port ${PORT}`));
