import React from 'react';
import { Page, View, Text, Image, StyleSheet, Svg, Circle, G, Path } from '@react-pdf/renderer';
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
    zIndex: 1,
    paddingTop: 38,
    paddingHorizontal: 46,
    paddingBottom: 24,
  },
  topCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    paddingTop: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 0,
    width: '92%',
    alignSelf: 'center',
  },
  titleCol: {
    paddingRight: 24,
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
    justifyContent: 'center',
    minHeight: 100,
  },
  titleText: {
    fontSize: 36,
    fontWeight: 900,
    fontStyle: 'italic',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    lineHeight: 0.9,
  },
  statsCol: {
    paddingLeft: 24,
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 30,
    fontWeight: 900,
    fontStyle: 'italic',
    color: COLORS.secondary,
    lineHeight: 1,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 8,
    fontWeight: 900,
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: COLORS.secondary,
  },
  rangesContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: -12,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    marginBottom: 12,
  },
  rangeCalc: {
    fontSize: 22,
    fontWeight: 900,
    fontStyle: 'italic',
    color: COLORS.accent,
    lineHeight: 1,
    minWidth: 100,
  },
  rangeDesc: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 1.3,
    paddingTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    paddingTop: 10,
    paddingBottom: 6,
  },
  footerText: {
    fontSize: 6,
    fontWeight: 900,
    letterSpacing: 2,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  footerAccent: {
    color: COLORS.accent,
  },
});

function PieChartSVG({ slices, size = 150 }) {
  const total = slices.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  let cumPercent = 0;
  const paths = slices.map((slice, i) => {
    const percent = total > 0 ? (Number(slice.percentage) || 0) / total * 100 : 0;
    const startAngle = cumPercent * 3.6;
    cumPercent += percent;
    const endAngle = cumPercent * 3.6;

    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArc = percent > 50 ? 1 : 0;

    const midRad = ((startAngle + endAngle) / 2 - 90) * Math.PI / 180;
    const labelR = r * 0.6;
    const labelX = cx + labelR * Math.cos(midRad);
    const labelY = cy + labelR * Math.sin(midRad);

    const d = percent >= 99.99
      ? ''
      : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return { ...slice, percent: Math.round(percent), d, labelX, labelY, isFull: percent >= 99.99 };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={r + 4} fill="white" />
      {paths.map((p, i) => p.isFull ? (
        <Circle key={i} cx={cx} cy={cy} r={r} fill={p.color} />
      ) : (
        <Path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth={0.5} />
      ))}
      {paths.map((p, i) => (
        <Text key={`label-${i}`} x={p.labelX} y={p.labelY + 2} textAnchor="middle" dominantBaseline="middle"
          fill={p.color === '#ccff00' ? '#003399' : 'white'} fontSize={11} fontWeight={900}>
          {p.percent}%
        </Text>
      ))}
    </Svg>
  );
}

export default function AnalisisSueloPDF({ page, pageIndex, campoMetadata, brandColors }) {
  const slices = page.slices || [
    { id: '1', label: 'Monte', percentage: 56, color: '#ccff00' },
    { id: '2', label: 'Limpio', percentage: 34, color: '#4a8df8' },
    { id: '3', label: 'Otro', percentage: 10, color: '#003399' },
  ];

  const tableData = page.tableData || [
    { calc: '20% - 30%', desc: 'BOSQUE DE CALDÉN ALTO' },
    { calc: '35% - 45%', desc: 'ESTRATO ARBUSTIVO MEDIO-DENSO' },
    { calc: '20% - 30%', desc: 'ESTRATO ARBUSTIVO ABIERTO O LAXO' },
    { calc: '2% - 5%', desc: 'SECTORES LIMPIO / INTERVENIDOS' },
  ];

  return (
    <Page size="A4" orientation="portrait" style={styles.page}>
      {page.fondo_url ? (
        <Image src={page.fondo_url} style={styles.bgImage} />
      ) : (
        <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#64748b' }} />
      )}

      <View style={styles.content}>
        <View style={styles.topCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={styles.titleCol}>
              <Text style={styles.titleText}>MONTE{'\n'}LIMPIO{'\n'}TOTAL</Text>
            </View>
            <View style={styles.statsCol}>
              <Text style={styles.statValue}>2.33%</Text>
              <Text style={styles.statValue}>97.67%</Text>
              <Text style={styles.statValue}>4495 HAS.</Text>
              <View style={{ gap: 2, marginTop: 4 }}>
                {slices.slice(0, 2).map((s, i) => (
                  <View key={i} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                    <Text style={styles.legendLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={{ alignItems: 'flex-start', marginLeft: -10, marginTop: -30 }}>
          <PieChartSVG slices={slices} size={200} />
        </View>

        <View style={styles.rangesContainer}>
          {tableData.map((row, i) => (
            <View key={i} style={styles.rangeRow}>
              <Text style={styles.rangeCalc}>{row.calc}</Text>
              <Text style={styles.rangeDesc}>{row.desc}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>
              SANTA ROSA <Text style={styles.footerAccent}>REAL INMOBILIARIA</Text>  TEL 2954-311804
            </Text>
            <Text style={styles.footerText}>
              GENERAL PICO <Text style={styles.footerAccent}>FORTE INMOBILIARIA</Text>  TEL 2302-410798
            </Text>
            <Text style={[styles.footerText, { color: COLORS.accent, marginTop: 2 }]}>
              WWW.FORTEINMOBILIARIA.COM.AR
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 8, fontWeight: 900, color: COLORS.white, letterSpacing: 1 }}>◆ FORTE</Text>
            <Text style={{ fontSize: 8, fontWeight: 900, color: COLORS.white, letterSpacing: 1 }}>≡ REAL</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}