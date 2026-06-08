const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/generate-pdf', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

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
    await page.setViewport({ width: 794, height: 1123 });
    await page.emulateMediaType('screen');

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction('document.fonts.ready', { timeout: 10000 });
    await page.waitForSelector('[data-render-complete="true"]', { timeout: 15000 });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

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
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="informe.pdf"');
      res.send(cmykPdf);
    } catch (gsErr) {
      console.warn('Ghostscript CMYK conversion failed, falling back to RGB:', gsErr.message);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="informe.pdf"');
      res.send(Buffer.from(pdf));
    } finally {
      try { fs.unlinkSync(tmpInput); } catch (_) {}
      try { fs.unlinkSync(tmpOutput); } catch (_) {}
    }
  } catch (err) {
    try {
      await page.screenshot({ path: '/tmp/pdf-error.png', fullPage: true });
      const html = await page.content();
      fs.writeFileSync('/tmp/pdf-error.html', html.substring(0, 50000));
      console.error('PDF generation error:', err.message);
    } catch (_) {}
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`PDF service running on port ${PORT}`));
