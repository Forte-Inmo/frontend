const express = require('express');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const ws = require('ws');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidos en el entorno');
}

const supabase = createClient(
  supabaseUrl || '', 
  supabaseServiceKey || '',
  {
    realtime: {
      transport: ws,
    },
  }
);

app.post('/generate', async (req, res) => {
  const { url, filename, informeId, userId, userName } = req.body;

  if (!url || !informeId) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos: url, informeId' });
  }

  let browser;
  try {
    console.log(`Generando PDF para: ${url}`);
    
    // Launch Puppeteer (optimized for Docker/Alpine)
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    });

    const page = await browser.newPage();

    // Set viewport to A4 size approximately
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // Navigate and wait for network to be idle
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');

    // Add CSS to hide elements with .export-hidden and [data-export-hide]
    await page.addStyleTag({
      content: `
        [data-export-hide],
        .export-hidden,
        button:not(.pdf-visible),
        label[for],
        input[type="file"],
        .editing-overlay,
        [class*="ring-"],
        [class*="border-emerald-"] { 
          visibility: hidden !important; 
          pointer-events: none !important;
          display: none !important;
        }
      `
    });

    // Pequeño retardo extra para asegurar renderizado de mapas/grids complejos
    await new Promise(r => setTimeout(r, 2000));

    // Generate PDF
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    console.log('PDF generado exitosamente. Subiendo a Supabase...');

    if (supabaseUrl && supabaseServiceKey) {
      // 1. Obtener el número de versión siguiente
      const { count, error: countError } = await supabase
        .from('informe_versiones')
        .select('*', { count: 'exact', head: true })
        .eq('informe_id', informeId);
        
      if (countError) console.error("Error obteniendo count:", countError);

      const versionNumber = (count || 0) + 1;

      // 2. Subir PDF a Storage
      const pdfPath = `informes/${informeId}/v${versionNumber}_${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(pdfPath, Buffer.from(pdfBytes), {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 3. Obtener URL pública
      const { data: { publicUrl: pdfUrl } } = supabase.storage
        .from('pdfs')
        .getPublicUrl(pdfPath);

      // 4. Registrar en tabla informe_versiones
      const { error: insertError } = await supabase
        .from('informe_versiones')
        .insert({
          informe_id: informeId,
          version_number: versionNumber,
          pdf_url: pdfUrl,
          pdf_path: pdfPath,
          created_by: userId || null,
          created_by_name: userName || 'Usuario',
        });
        
      if (insertError) throw insertError;
      console.log(`Versión v${versionNumber} registrada en BD.`);
    }

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'informe.pdf'}"`);
    res.setHeader('Content-Length', pdfBytes.length);

    // Send buffer
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ error: 'Error interno generando el PDF', details: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PDF Service escuchando en el puerto ${PORT}`);
});
