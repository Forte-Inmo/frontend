import React from 'react';
import { Document } from '@react-pdf/renderer';
import CaratulaPDF from './CaratulaPDF';
import UbicacionPDF from './UbicacionPDF';
import SituacionActualPDF from './SituacionActualPDF';
import DinamicaPDF from './DinamicaPDF';
import AnalisisSueloPDF from './AnalisisSueloPDF';
import TextoFotosPDF from './TextoFotosPDF';

const PAGE_MAP = {
  CARATULA: CaratulaPDF,
  UBICACION: UbicacionPDF,
  SITUACION_ACTUAL: SituacionActualPDF,
  DINAMICA: DinamicaPDF,
  ANALISIS_SUELO: AnalisisSueloPDF,
  TEXTO_FOTOS: TextoFotosPDF,
};

export default function InformePDF({ pagesData, campoMetadata, brandColors, settings }) {
  const colors = (brandColors && Object.keys(brandColors).length > 0) ? brandColors : {
    primary: '#107549',
    secondary: '#003399',
    accent: '#ccff00',
    dark: '#001a4d',
  };

  return (
    <Document>
      {pagesData.map((page, index) => {
        const PageComponent = PAGE_MAP[page.type];
        if (!PageComponent) return null;

        const isFirst = index === 0;
        const hasCaratula = pagesData[0]?.type === 'CARATULA';
        const showCaratula = isFirst && !hasCaratula;

        return (
          <PageComponent
            key={page.id || index}
            page={page}
            pageIndex={index}
            campoMetadata={campoMetadata}
            brandColors={colors}
            settings={settings}
          />
        );
      })}
    </Document>
  );
}