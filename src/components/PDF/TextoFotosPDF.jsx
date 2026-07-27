import React from 'react';
import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { COLORS, sharedStyles } from './pdfStyles';

const styles = StyleSheet.create({
  page: {
    width: '210mm',
    height: '297mm',
    position: 'relative',
    backgroundColor: COLORS.white,
    fontFamily: 'Inter',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  content: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: 70,
    zIndex: 1,
  },
  contentLight: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: 70,
    zIndex: 1,
    color: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 14,
    color: COLORS.accent,
  },
  headerLabel: {
    fontSize: 9,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 3,
    opacity: 0.6,
  },
  mainContent: {
    flexDirection: 'row',
    flex: 1,
    gap: 20,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    width: 220,
  },
  textBlock: {
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.5,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 16,
  },
  footerDark: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 7,
    fontWeight: 900,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  footerAccent: {
    color: COLORS.accent,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 20,
  },
  pageBadge: {
    position: 'absolute',
    bottom: 36,
    left: 48,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pageBadgeText: {
    fontSize: 8,
    fontWeight: 900,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 2,
    opacity: 0.8,
  },
  pageBadgeDark: {
    position: 'absolute',
    bottom: 36,
    left: 48,
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  pageBadgeTextDark: {
    fontSize: 8,
    fontWeight: 900,
    color: COLORS.gray700,
    textTransform: 'uppercase',
    letterSpacing: 2,
    opacity: 0.7,
  },
});

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n+/g, '\n').trim();
}

export default function TextoFotosPDF({ page, pageIndex, campoMetadata, brandColors }) {
  const hasBg = !!page.fondo_url;
  const fotos = page.fotos || [];
  const textColor = hasBg ? COLORS.white : COLORS.gray700;

  return (
    <Page size="A4" orientation="portrait" style={hasBg ? styles.page : styles.page}>
      {page.fondo_url && (
        <Image src={page.fondo_url} style={styles.bgImage} />
      )}

      <View style={hasBg ? styles.content : Object.assign({}, styles.content, { color: COLORS.gray700 })}>
        <View style={styles.header}>
          <Text style={[styles.headerLabel, { color: hasBg ? 'rgba(255,255,255,0.5)' : '#9ca3af' }]}>
            CONTENIDO DEL INFORME
          </Text>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.leftColumn}>
            {hasBg ? (
              <View style={styles.glassCard}>
                <Text style={[styles.textBlock, { color: COLORS.gray700 }]}>
                  {stripHtml(page.texto_izquierdo || 'Contenido del informe...')}
                </Text>
              </View>
            ) : (
              <Text style={[styles.textBlock, { color: textColor }]}>
                {stripHtml(page.texto_izquierdo || 'Contenido del informe...')}
              </Text>
            )}
          </View>

          {fotos.length > 0 && (
            <View style={styles.rightColumn}>
              <View style={styles.photoGrid}>
                {fotos.map((foto, i) => (
                  <View key={i} style={styles.photoItem}>
                    <Image src={foto} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 12 }} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={hasBg ? styles.footer : styles.footerDark}>
          <View>
            <Text style={[styles.footerText, { color: hasBg ? COLORS.white : COLORS.gray700 }]}>
              SANTA ROSA <Text style={styles.footerAccent}>REAL INMOBILIARIA</Text>
            </Text>
            <Text style={[styles.footerText, { color: hasBg ? COLORS.white : COLORS.gray700, marginTop: 2 }]}>
              GENERAL PICO <Text style={styles.footerAccent}>FORTE INMOBILIARIA</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Text style={{ fontSize: 8, fontWeight: 900, color: hasBg ? COLORS.white : '#374151', letterSpacing: 1 }}>◆ FORTE</Text>
            <Text style={{ fontSize: 8, fontWeight: 900, color: hasBg ? COLORS.white : '#374151', letterSpacing: 1 }}>≡ REAL</Text>
          </View>
        </View>
      </View>

      <View style={hasBg ? styles.pageBadge : styles.pageBadgeDark}>
        <Text style={hasBg ? styles.pageBadgeText : styles.pageBadgeTextDark}>Pág. {pageIndex + 1}</Text>
      </View>
    </Page>
  );
}