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
    opacity: 0.6,
  },
  gradientFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
  },
  content: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: 56,
    zIndex: 1,
  },
  blocksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    width: '94%',
    alignSelf: 'center',
    marginTop: 12,
    flex: 1,
  },
  blockTitle: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  blockTitleText: {
    fontFamily: 'Inter',
    fontStyle: 'italic',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    lineHeight: 1.1,
  },
  blockContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
  },
  blockText: {
    fontWeight: 600,
    lineHeight: 1.4,
  },
  blockImageContainer: {
    width: '100%',
    minHeight: 80,
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  blockImage: {
    width: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 16,
    paddingBottom: 8,
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
});

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n+/g, '\n').trim();
}

export default function DinamicaPDF({ page, pageIndex, campoMetadata, brandColors }) {
  const blocks = page.blocks || [];

  return (
    <Page size="A4" orientation="portrait" style={styles.page}>
      {page.fondo_url ? (
        <Image src={page.fondo_url} style={styles.bgImage} />
      ) : (
        <View style={styles.gradientFallback} />
      )}

      <View style={styles.content}>
        <View style={styles.blocksContainer}>
          {blocks.map((block, idx) => {
            const bgColor = block.type === 'title'
              ? 'transparent'
              : (block.variant === 'transparent' || (block.type === 'image' && block.showImageBg === false))
                ? 'transparent'
                : block.variant === 'fade-top'
                  ? 'transparent'
                  : block.bgColor || '#ffffff';

            const textColor = block.textColor || '#003399';

            if (block.type === 'title') {
              return (
                <View key={block.id || idx} style={[styles.blockTitle, { backgroundColor: block.bgColor || COLORS.primary }]}>
                  <Text style={[styles.blockTitleText, { color: block.textColor || '#ffffff', fontSize: block.titleSize === 'sm' ? 18 : block.titleSize === 'lg' ? 36 : block.titleSize === 'xl' ? 48 : 24 }]}>
                    {(block.title || 'TÍTULO').toUpperCase()}
                  </Text>
                </View>
              );
            }

            if (block.type === 'image') {
              return (
                <View key={block.id || idx} style={[styles.blockImageContainer, {
                  backgroundColor: block.showImageBg !== false ? 'rgba(0,0,0,0.05)' : 'transparent',
                  borderWidth: block.showImageBg !== false ? 1 : 0,
                  borderColor: 'rgba(0,0,0,0.05)',
                }]}>
                  {!block.hideTitle && block.title && (
                    <Text style={{ fontSize: block.titleSize === 'sm' ? 18 : block.titleSize === 'lg' ? 36 : block.titleSize === 'xl' ? 48 : 24, fontWeight: 900, color: textColor, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: -0.5, marginBottom: 8 }}>
                      {block.title.toUpperCase()}
                    </Text>
                  )}
                  {block.url ? (
                    <Image src={block.url} style={styles.blockImage} />
                  ) : null}
                </View>
              );
            }

            return (
              <View key={block.id || idx} style={[styles.blockContent, {
                backgroundColor: bgColor,
                backgroundImage: block.variant === 'fade-top' ? `linear-gradient(to bottom, ${block.bgColor || '#ffffff'} 0%, transparent 100%)` : undefined,
                borderWidth: (block.variant !== 'transparent' && block.variant !== 'fade-top' && block.type !== 'title') ? 0 : 0,
              }]}>
                {!block.hideTitle && block.title && (
                  <Text style={{ fontSize: block.titleSize === 'sm' ? 18 : block.titleSize === 'lg' ? 36 : block.titleSize === 'xl' ? 48 : 24, fontWeight: 900, color: textColor, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: -0.5, lineHeight: 1, marginBottom: 8 }}>
                    {block.title.toUpperCase()}
                  </Text>
                )}
                <Text style={[styles.blockText, { color: textColor, fontSize: block.textSize === 'sm' ? 14 : block.textSize === 'lg' ? 20 : block.textSize === 'xl' ? 28 : 16 }]}>
                  {stripHtml(block.text || '')}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>
              SANTA ROSA <Text style={styles.footerAccent}>REAL INMOBILIARIA</Text>  TEL 2954-311804
            </Text>
            <Text style={styles.footerText}>
              GENERAL PICO <Text style={styles.footerAccent}>FORTE INMOBILIARIA</Text>  TEL 2302-410798
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Text style={{ fontSize: 9, fontWeight: 900, color: COLORS.white }}>◆ FORTE</Text>
            <Text style={{ fontSize: 9, fontWeight: 900, color: COLORS.white }}>≡ REAL</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}