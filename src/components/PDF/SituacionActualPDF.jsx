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
  content: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: 56,
    zIndex: 1,
  },
  topCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    width: '92%',
    alignSelf: 'center',
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 40,
    fontFamily: 'Inter',
    fontStyle: 'italic',
    fontWeight: 900,
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: -1,
    lineHeight: 1,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.secondary,
    lineHeight: 1.4,
  },
  highlightText: {
    fontSize: 22,
    fontWeight: 900,
    color: COLORS.white,
    textTransform: 'uppercase',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 1.2,
    paddingHorizontal: 40,
    marginVertical: 28,
  },
  imageContainer: {
    width: '100%',
    height: '35%',
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 'auto',
    marginBottom: 48,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default function SituacionActualPDF({ page, pageIndex, campoMetadata, brandColors }) {
  return (
    <Page size="A4" orientation="portrait" style={styles.page}>
      {page.fondo_url ? (
        <Image src={page.fondo_url} style={styles.bgImage} />
      ) : (
        <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#1e293b' }} />
      )}

      <View style={styles.content}>
        <View style={styles.topCard}>
          <Text style={styles.cardTitle}>SITUACIÓN ACTUAL</Text>
          <Text style={styles.cardText}>
            {page.descripcion || 'Actualmente cuenta con 650 vacas madres y 500 terneros/as destetados...'}
          </Text>
        </View>

        <Text style={styles.highlightText}>
          {(page.destacado || 'CABE DESTACAR QUE LA CARGA ANIMAL ACTUAL NO REPRESENTA EL TOPE PRODUCTIVO DEL ESTABLECIMIENTO...').toUpperCase()}
        </Text>

        {page.imagen_inferior_url ? (
          <View style={styles.imageContainer}>
            <Image src={page.imagen_inferior_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </View>
        ) : (
          <View style={[styles.imageContainer, styles.imagePlaceholder]}>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 3 }}>
              Fotografía de Detalle
            </Text>
          </View>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <Text style={{ fontSize: 10, fontWeight: 900, color: COLORS.white }}>◆ FORTE</Text>
            <Text style={{ fontSize: 10, fontWeight: 900, color: COLORS.white }}>≡ REAL</Text>
          </View>
        </View>
      </View>

      <View style={styles.pageBadge}>
        <Text style={styles.pageBadgeText}>Pág. {pageIndex + 1}</Text>
      </View>
    </Page>
  );
}