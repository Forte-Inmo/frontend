const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const jobs = new Map();
const JOB_TIMEOUT = 120 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function createJob(url) {
  const id = crypto.randomUUID();
  const job = {
    id,
    url,
    stage: 'pending',
    progress: 0,
    logs: [],
    pdf: null,
    error: null,
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  processJob(job);
  return id;
}

async function processJob(job) {
  updateJob(job, { stage: 'rendering', progress: 5, logs: [...job.logs, 'Iniciando renderizado...'] });
  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none',
        '--force-color-profile=srgb',
        '--disable-lcd-text',
        '--disable-gpu',
      ],
      headless: 'new',
    });

    const page = await browser.newPage();
    page.on('console', (msg) => {
      updateJob(job, { logs: [...job.logs, `[browser] ${msg.text()}`] });
    });
    page.on('pageerror', (err) => {
      updateJob(job, { logs: [...job.logs, `[browser error] ${err.message}`] });
    });

    await page.setViewport({ width: 794, height: 1123 });
    await page.emulateMediaType('screen');

    updateJob(job, { progress: 10, logs: [...job.logs, 'Navegando a la URL del informe...'] });
    await page.goto(job.url, { waitUntil: 'networkidle0', timeout: 30000 });
    updateJob(job, { progress: 30, logs: [...job.logs, 'Página cargada, esperando fuentes...'] });

    await page.waitForFunction('document.fonts.ready', { timeout: 10000 });
    updateJob(job, { progress: 40, logs: [...job.logs, 'Fuentes listas, esperando render completo...'] });

    await page.waitForSelector('[data-render-complete="true"]', { timeout: 15000 });
    updateJob(job, { progress: 50, logs: [...job.logs, 'Render completo, generando PDF...'] });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    updateJob(job, { progress: 70, logs: [...job.logs, `PDF generado (${(pdf.length / 1024).toFixed(0)} KB)`] });

    updateJob(job, { stage: 'cmyk', progress: 80, logs: [...job.logs, 'Convirtiendo a CMYK con Ghostscript...'] });
    const tmpInput = path.join('/tmp', `pdf-input-${Date.now()}.pdf`);
    const tmpOutput = path.join('/tmp', `pdf-output-${Date.now()}.pdf`);
    fs.writeFileSync(tmpInput, pdf);

    try {
      execSync(
        `gs -q -dNOPAUSE -dBATCH -sDEVICE=pdfwrite ` +
        `-sProcessColorModel=DeviceCMYK ` +
        `-sColorConversionStrategy=CMYK ` +
        `-sColorConversionStrategyForImages=CMYK ` +
        `-dOverrideICC -o ${tmpOutput} ${tmpInput}`,
        { timeout: 120000 }
      );
      const cmykPdf = fs.readFileSync(tmpOutput);
      updateJob(job, { progress: 95, logs: [...job.logs, 'Conversión CMYK completada'] });
      updateJob(job, { stage: 'done', progress: 100, logs: [...job.logs, 'PDF listo para descargar'], pdf: cmykPdf });
    } catch (gsErr) {
      updateJob(job, { logs: [...job.logs, `CMYK falló, usando RGB: ${gsErr.message}`] });
      updateJob(job, { stage: 'done', progress: 100, logs: [...job.logs, 'PDF listo para descargar'], pdf: Buffer.from(pdf) });
    } finally {
      try { fs.unlinkSync(tmpInput); } catch (_) {}
      try { fs.unlinkSync(tmpOutput); } catch (_) {}
    }
  } catch (err) {
    try {
      const page = await browser?.newPage?.();
      if (page) {
        await page.screenshot({ path: '/tmp/pdf-error.png', fullPage: true });
        updateJob(job, { logs: [...job.logs, `Screenshot guardado en /tmp/pdf-error.png`] });
      }
    } catch (_) {}
    updateJob(job, { stage: 'error', progress: 0, error: err.message, logs: [...job.logs, `ERROR: ${err.message}`] });
  } finally {
    if (browser) await browser.close();
  }
}

function updateJob(job, updates) {
  const updated = { ...job, ...updates };
  jobs.set(job.id, updated);
}

app.post('/generate-pdf', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  const jobId = createJob(url);
  res.json({ jobId });
});

app.get('/pdf-status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const elapsed = Date.now() - job.createdAt;
  const timedOut = elapsed > JOB_TIMEOUT && job.stage !== 'done' && job.stage !== 'error';
  if (timedOut) {
    updateJob(job, { stage: 'error', error: 'Timeout excedido (120s)', logs: [...job.logs, 'ERROR: Timeout excedido'] });
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
