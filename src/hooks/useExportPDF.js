export function useExportPDF() {
  const exportPDF = async ({ informeId, pageCount, nombre, campoNombre, userId, userName }) => {
    const filename = `${nombre}-${campoNombre}.pdf`.replace(/\s+/g, '_');
    // La URL debe ser accesible desde dentro de Docker. Si el pdf-service 
    // está en la misma red que la app, la appUrl puede necesitar ser la IP pública
    // o el hostname si es necesario. Pero probaremos con la URL actual y la ruta del frontend.
    const appUrl = `${window.location.origin}/dashboard/informes/${informeId}/builder?export=true`;
    
    const response = await fetch('/pdf-api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: appUrl,
        pageCount,
        filename,
        informeId,
        userId,
        userName,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error generando PDF');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { exportPDF };
}
