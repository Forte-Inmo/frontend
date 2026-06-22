const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const nodemailer = require('nodemailer');

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
const JOB_TIMEOUT = 120 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

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
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      headless: true,
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
    await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 30000 });
    updateJob(job, { progress: 30, logs: [...job.logs, 'Página cargada, esperando fuentes...'] });

    await page.waitForFunction('document.fonts.ready', { timeout: 10000 });
    updateJob(job, { progress: 40, logs: [...job.logs, 'Fuentes listas, esperando render completo...'] });

    await page.waitForSelector('[data-render-complete="true"]', { timeout: 45000 });
    updateJob(job, { progress: 45, logs: [...job.logs, 'Render completo, generando PDF...'] });

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
    updateJob(job, { progress: 70, logs: [...job.logs, `PDF generado (${(pdf.length / 1024).toFixed(0)} KB)`] });

    updateJob(job, { stage: 'cmyk', progress: 80, logs: [...job.logs, 'Convirtiendo a CMYK con Ghostscript...'] });
    const tmpInput = path.join('/tmp', `pdf-input-${Date.now()}.pdf`);
    const tmpOutput = path.join('/tmp', `pdf-output-${Date.now()}.pdf`);
    fs.writeFileSync(tmpInput, pdf);

    let finalPdf;
    try {
      execSync(
        `gs -q -dNOPAUSE -dBATCH -sDEVICE=pdfwrite ` +
        `-sProcessColorModel=DeviceCMYK ` +
        `-sColorConversionStrategy=CMYK ` +
        `-sColorConversionStrategyForImages=CMYK ` +
        `-dOverrideICC -o ${tmpOutput} ${tmpInput}`,
        { timeout: 120000 }
      );
      finalPdf = fs.readFileSync(tmpOutput);
      updateJob(job, { progress: 90, logs: [...job.logs, 'Conversión CMYK completada'] });
    } catch (gsErr) {
      updateJob(job, { logs: [...job.logs, `CMYK falló, usando RGB: ${gsErr.message}`] });
      finalPdf = Buffer.from(pdf);
    } finally {
      try { fs.unlinkSync(tmpInput); } catch (_) {}
      try { fs.unlinkSync(tmpOutput); } catch (_) {}
    }

    updateJob(job, { progress: 95, logs: [...job.logs, 'Subiendo PDF a Storage...'] });

    try {
      const storagePath = await uploadToStorage(job.userId, job.informeId, finalPdf);
      await updatePdfExport(job.exportId, {
        status: 'done',
        storage_path: storagePath,
        completed_at: new Date().toISOString(),
      });
      updateJob(job, { logs: [...job.logs, 'PDF subido a Storage'] });

      const downloadUrl = `${APP_URL}/pdf-download/${job.exportId}`;
      await Promise.race([
        sendEmail(job.userEmail, downloadUrl, job.informeTitle),
        new Promise(r => setTimeout(r, 10000)),
      ]);

      updateJob(job, {
        stage: 'done',
        progress: 100,
        logs: [...job.logs, 'PDF listo para descargar. Email enviado.'],
        pdf: finalPdf,
      });
    } catch (storageErr) {
      updateJob(job, { logs: [...job.logs, `Storage subida falló, sirviendo directo: ${storageErr.message}`] });
      await updatePdfExport(job.exportId, { status: 'done', completed_at: new Date().toISOString() });
      updateJob(job, {
        stage: 'done',
        progress: 100,
        logs: [...job.logs, 'PDF listo para descargar (sin storage)'],
        pdf: finalPdf,
      });
    }
  } catch (err) {
    try {
      const page = await browser?.newPage?.();
      if (page) {
        await page.screenshot({ path: '/tmp/pdf-error.png', fullPage: true });
        updateJob(job, { logs: [...job.logs, 'Screenshot guardado en /tmp/pdf-error.png'] });
      }
    } catch (_) {}
    updateJob(job, { stage: 'error', progress: 0, error: err.message, logs: [...job.logs, `ERROR: ${err.message}`] });
    await updatePdfExport(job.exportId, { status: 'error', error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}

function updateJob(job, updates) {
  const updated = { ...job, ...updates };
  jobs.set(job.id, updated);
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
  processJob(job);
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
