export function convertShadowForPDF(style) {
  if (!style.boxShadow || style.boxShadow === 'none') return style;

  const match = style.boxShadow.match(
    /(-?[\d.]+(?:px)?)\s+(-?[\d.]+px)\s+([\d.]+px)(?:\s+[\d.]+(?:px)?)?\s+(rgba?\([^)]+\)|#[\da-f]+|\w+)/i
  );
  if (!match) return style;

  const [, x, y, blur, color] = match;
  const dropShadow = `drop-shadow(${x} ${y} ${blur} ${color})`;
  const existingFilter = style.filter || '';
  return {
    ...style,
    boxShadow: 'none',
    filter: existingFilter ? `${existingFilter} ${dropShadow}` : dropShadow,
  };
}
