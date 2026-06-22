import React from 'react';
import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { COLORS, sharedStyles } from './pdfStyles';

const styles = StyleSheet.create({
  container: {
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
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '85%',
    backgroundColor: COLORS.green,
    opacity: 0.85,
  },
  content: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    zIndex: 1,
  },
  topSection: {
    display: 'flex',
    alignItems: 'center',
    marginTop: 28,
  },
  title: {
    fontSize: 52,
    fontFamily: 'Inter',
    fontWeight: 900,
    color: COLORS.accent,
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.white,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginTop: 8,
  },
  middleSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  hectareaNumber: {
    fontSize: 90,
    fontWeight: 900,
    color: COLORS.accent,
    textAlign: 'center',
    lineHeight: 1,
  },
  hasBadge: {
    backgroundColor: COLORS.blue,
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 900,
    paddingHorizontal: 40,
    paddingVertical: 8,
    marginTop: 12,
    textAlign: 'center',
  },
  bottomSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
  },
  mapPinContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  locationLine1: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.white,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  locationLine2: {
    fontSize: 20,
    fontWeight: 900,
    color: COLORS.white,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginTop: 4,
  },
  logosRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 42,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 24,
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  logoName: {
    fontSize: 20,
    fontWeight: 900,
    color: COLORS.white,
    letterSpacing: 1,
  },
  logoSub: {
    fontSize: 7,
    fontWeight: 900,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
});

function getSubtitulo(page, campoMetadata) {
  const uso = campoMetadata?.uso?.toLowerCase();
  if (uso === 'agricultura') return 'AGRÍCOLA';
  if (uso === 'ganaderia') return 'GANADERO';
  if (uso === 'ambos') return 'AGRÍCOLA - GANADERO';
  return page.subtitulo || 'EXPLOTACIÓN AGROPECUARIA';
}

export default function CaratulaPDF({ page, pageIndex, campoMetadata, brandColors }) {
  const logoDiamond = '◆';
  const logoBars = '≡';
  const ls = (page.logos_scale ?? 100) / 100;

  return (
    <Page size="A4" orientation="portrait" style={styles.container}>
      {page.portada_url && (
        <Image src={page.portada_url} style={styles.bgImage} />
      )}
      <View style={[styles.gradientOverlay, { backgroundColor: page.overlay_color || COLORS.green, opacity: (page.overlay_opacidad ?? 85) / 100 }]} />
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.title}>{(page.titulo || 'CAMPO EN VENTA').toUpperCase()}</Text>
          <Text style={styles.subtitle}>{getSubtitulo(page, campoMetadata)}</Text>
        </View>

        <View style={styles.middleSection}>
          <Text style={styles.hectareaNumber}>
            {campoMetadata?.superficie_total || '000'}
          </Text>
          <Text style={styles.hasBadge}>HAS.</Text>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.mapPinContainer}>
            <Text style={styles.locationLine1}>
              {(page.ubicacion_linea1 || campoMetadata?.departamento || 'DPTO. CONHELO').toUpperCase()}
            </Text>
            <Text style={styles.locationLine2}>
              {(page.ubicacion_linea2 || campoMetadata?.provincia || 'LA PAMPA').toUpperCase()}
            </Text>
          </View>

          <View style={[styles.logosRow, { paddingTop: 24 + Math.round((page.logos_offset ?? 0) * 2.83) }]}>
            <View style={styles.logoGroup}>
              <Text style={[styles.logoName, { fontSize: 20 * ls }]}>{logoDiamond} FORTE</Text>
              <Text style={[styles.logoSub, { fontSize: 7 * ls }]}>INMOBILIARIA</Text>
            </View>
            <View style={styles.logoGroup}>
              <Text style={[styles.logoName, { fontSize: 20 * ls }]}>{logoBars} REAL</Text>
              <Text style={[styles.logoSub, { fontSize: 7 * ls }]}>INMOBILIARIA</Text>
            </View>
          </View>
        </View>
      </View>
    </Page>
  );
}