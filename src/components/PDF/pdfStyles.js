import { Font, StyleSheet } from '@react-pdf/renderer';

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf', fontWeight: 700 },
    { src: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuBWYMZg.ttf', fontWeight: 900 },
    { src: 'https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTc2dthjQ.ttf', fontWeight: 400, fontStyle: 'italic' },
    { src: 'https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTcPtxhjQ.ttf', fontWeight: 700, fontStyle: 'italic' },
    { src: 'https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTccNxhjQ.ttf', fontWeight: 900, fontStyle: 'italic' },
  ],
});

export const COLORS = {
  primary: '#107549',
  secondary: '#003399',
  accent: '#ccff00',
  dark: '#001a4d',
  green: '#8cc63f',
  blue: '#4a8df8',
  white: '#ffffff',
  black: '#000000',
  gray900: '#111827',
  gray800: '#1f2937',
  gray700: '#374151',
  gray100: '#f3f4f6',
  gray50: '#f9fafb',
};

export const sharedStyles = StyleSheet.create({
  page: {
    width: '210mm',
    height: '297mm',
    position: 'relative',
    fontFamily: 'Inter',
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 8,
    paddingBottom: 4,
  },
  footerText: {
    fontSize: 7,
    fontFamily: 'Inter',
    fontWeight: 900,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLORS.white,
  },
  footerAccent: {
    color: COLORS.accent,
  },
});