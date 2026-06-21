import React from 'react';
import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { COLORS, sharedStyles } from './pdfStyles';

const styles = StyleSheet.create({
  page: {
    width: '210mm',
    height: '297mm',
    position: 'relative',
    backgroundColor: COLORS.gray900,
    fontFamily: 'Inter',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  gradientFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  content: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 56,
    paddingTop: 38,
    paddingBottom: 56,
    zIndex: 1,
  },
  title: {
    fontSize: 40,
    fontFamily: 'Inter',
    fontStyle: 'italic',
    fontWeight: 900,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: -1,
    lineHeight: 1.1,
    marginTop: 32,
    marginBottom: 10,
  },
  description: {
    fontSize: 18,
    fontWeight: 600,
    color: COLORS.white,
    lineHeight: 1.4,
    width: '55%',
    marginBottom: 8,
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 7,
    fontWeight: 900,
    letterSpacing: 2,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  footerAccent: {
    color: COLORS.accent,
  },
  footerRight: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
});

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

export default function UbicacionPDF({ page, pageIndex, campoMetadata, brandColors }) {
  const hasBlocks = !!page.blocks;
  const blocks = page.blocks || [];

  return (
    <Page size="A4" orientation="portrait" style={styles.page}>
      {page.fondo_url ? (
        <Image src={page.fondo_url} style={styles.bgImage} />
      ) : (
        <View style={styles.gradientFallback} />
      )}

      <View style={styles.content}>
        {hasBlocks ? (
          <>
            {blocks.map((block) => (
              block.type === 'title' ? (
                <Text key={block.id} style={[styles.title, { transform: `translateY(${block.yOffset || 0}mm)` }]}>
                  {(block.title || 'UBICACIÓN Y DISTRIBUCIÓN').toUpperCase()}
                </Text>
              ) : (
                <Text key={block.id} style={[styles.description, { transform: `translateY(${block.yOffset || 0}mm)` }]}>
                  {stripHtml(block.text || 'Establecimiento agropecuario...')}
                </Text>
              )
            ))}
          </>
        ) : (
          <>
            <Text style={styles.title}>
              {(page.titulo || 'UBICACIÓN Y DISTRIBUCIÓN').toUpperCase()}
            </Text>

            <Text style={styles.description}>
              {stripHtml(page.descripcion || 'Establecimiento agropecuario de 5000 hectáreas. Ubicado en el departamento Conhelo, Provincia de La Pampa.')}
            </Text>
          </>
        )}

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>
              SANTA ROSA <Text style={styles.footerAccent}>REAL INMOBILIARIA</Text>  TEL 2954-311804
            </Text>
            <Text style={styles.footerText}>
              GENERAL PICO <Text style={styles.footerAccent}>FORTE INMOBILIARIA</Text>  TEL 2302-410798
            </Text>
            <Text style={[styles.footerText, { color: COLORS.accent, marginTop: 4 }]}>
              WWW.FORTEINMOBILIARIA.COM.AR
            </Text>
          </View>
          <View style={styles.footerRight}>
            <View style={styles.logoGroup}>
              <Text style={{ fontSize: 14, fontWeight: 900, color: COLORS.white }}>◆ FORTE</Text>
              <Text style={{ fontSize: 5, fontWeight: 900, color: 'rgba(255,255,255,0.7)', letterSpacing: 3 }}>INMOBILIARIA</Text>
            </View>
            <View style={styles.logoGroup}>
              <Text style={{ fontSize: 14, fontWeight: 900, color: COLORS.white }}>≡ REAL</Text>
              <Text style={{ fontSize: 5, fontWeight: 900, color: 'rgba(255,255,255,0.7)', letterSpacing: 3 }}>INMOBILIARIA</Text>
            </View>
          </View>
        </View>
      </View>
    </Page>
  );
}