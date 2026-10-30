// scripts/check-contrast.mjs
// Verifies WCAG AA contrast compliance for all semantic token pairs in Light and Dark modes.

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function luminance(r, g, b) {
  const [sR, sG, sB] = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

function contrastRatio(hex1, hex2) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = luminance(r1, g1, b1);
  const l2 = luminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (lighter + 0.05) / (dark + 0.05);
}

const tokens = {
  light: {
    bg: '#FFFFFF',
    bgSubtle: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceHover: '#F4F4F5',
    border: '#E4E4E7',
    borderInput: '#8A8A93',
    text: '#09090B',
    textMuted: '#52525B',
    textSubtle: '#71717A',
    primary: '#18181B',
    primaryText: '#FFFFFF',
    accent: '#4F46E5',
    accentSubtle: '#EEF2FF',
    accentText: '#4338CA',
    success: '#15803D',
    successBg: '#F0FDF4',
    warning: '#B45309',
    warningBg: '#FFFBEB',
    danger: '#B91C1C',
    dangerBg: '#FEF2F2',
    focusRing: '#4F46E5',
  },
  dark: {
    bg: '#09090B',
    bgSubtle: '#0C0C0E',
    surface: '#18181B',
    surfaceHover: '#27272A',
    border: '#27272A',
    borderInput: '#71717A',
    text: '#FAFAFA',
    textMuted: '#A1A1AA',
    textSubtle: '#8F8F99',
    primary: '#FAFAFA',
    primaryText: '#09090B',
    accent: '#818CF8',
    accentSubtle: '#1E1B4B',
    accentText: '#A5B4FC',
    success: '#4ADE80',
    successBg: '#052E16',
    warning: '#FBBF24',
    warningBg: '#451A03',
    danger: '#F87171',
    dangerBg: '#450A0A',
    focusRing: '#818CF8',
  },
};

function runAudit() {
  let failed = false;
  console.log('====================================================');
  console.log('   AutoHub Design System Contrast Audit (WCAG AA)   ');
  console.log('====================================================\n');

  for (const theme of ['light', 'dark']) {
    console.log(`--- Checking [${theme.toUpperCase()}] Theme Tokens ---`);
    const t = tokens[theme];

    const pairs = [
      // Standard Text Pairs (Target >= 4.5:1)
      { name: 'text on bg', fg: t.text, bg: t.bg, target: 4.5, type: 'text' },
      { name: 'text on surface', fg: t.text, bg: t.surface, target: 4.5, type: 'text' },
      { name: 'text on bgSubtle', fg: t.text, bg: t.bgSubtle, target: 4.5, type: 'text' },
      { name: 'text on surfaceHover', fg: t.text, bg: t.surfaceHover, target: 4.5, type: 'text' },
      { name: 'textMuted on bg', fg: t.textMuted, bg: t.bg, target: 4.5, type: 'text' },
      { name: 'textMuted on surface', fg: t.textMuted, bg: t.surface, target: 4.5, type: 'text' },
      { name: 'textMuted on surfaceHover', fg: t.textMuted, bg: t.surfaceHover, target: 4.5, type: 'text' },
      { name: 'textSubtle on bg', fg: t.textSubtle, bg: t.bg, target: 4.5, type: 'text' },
      { name: 'textSubtle on surface', fg: t.textSubtle, bg: t.surface, target: 4.5, type: 'text' },

      // Button / Primary action pairs
      { name: 'primaryText on primary', fg: t.primaryText, bg: t.primary, target: 4.5, type: 'text' },

      // Accent pairs
      { name: 'accentText on accentSubtle', fg: t.accentText, bg: t.accentSubtle, target: 4.5, type: 'text' },
      { name: 'primaryText on accent', fg: t.primaryText, bg: t.accent, target: 3.0, type: 'ui' },

      // Status badges (Text on badge background >= 4.5:1)
      { name: 'success on successBg', fg: t.success, bg: t.successBg, target: 4.5, type: 'text' },
      { name: 'warning on warningBg', fg: t.warning, bg: t.warningBg, target: 4.5, type: 'text' },
      { name: 'danger on dangerBg', fg: t.danger, bg: t.dangerBg, target: 4.5, type: 'text' },

      // Graphical controls & borders (Target >= 3.0:1)
      { name: 'borderInput on bg', fg: t.borderInput, bg: t.bg, target: 3.0, type: 'ui' },
      { name: 'borderInput on surface', fg: t.borderInput, bg: t.surface, target: 3.0, type: 'ui' },
      { name: 'focusRing on bg', fg: t.focusRing, bg: t.bg, target: 3.0, type: 'ui' },
    ];

    for (const p of pairs) {
      const ratio = contrastRatio(p.fg, p.bg);
      const passed = ratio >= p.target;
      const status = passed ? 'PASS' : 'FAIL';
      const indicator = passed ? '✓' : '✗';
      console.log(
        `  ${indicator} ${p.name.padEnd(28)} : ${ratio.toFixed(2).padStart(5)}:1 (Min: ${p.target}:1) [${status}]`
      );
      if (!passed) {
        failed = true;
      }
    }
    console.log('');
  }

  if (failed) {
    console.error('❌ Contrast audit FAILED: One or more token pairs do not meet WCAG AA standards.\n');
    process.exit(1);
  } else {
    console.log('✅ Contrast audit PASSED: All semantic token pairs strictly adhere to WCAG AA!\n');
  }
}

runAudit();
