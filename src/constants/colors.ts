import { getPalette } from '../theme/runtime';

/**
 * Farb-Tokens der aktiven Farbwelt. Jeder Zugriff liest die gerade aktive
 * Palette, deshalb nur zur Renderzeit oder in `themedStyles(() => ...)` lesen,
 * nie in einem `StyleSheet.create` auf Modulebene.
 */
export const colors = {
  get background() {
    return getPalette().bg;
  },
  get surface() {
    return getPalette().glass;
  },
  get surfaceMuted() {
    return getPalette().glassInner;
  },
  get surfaceElevated() {
    return getPalette().glassInner;
  },
  get border() {
    return getPalette().hairline;
  },
  get glassLine() {
    return getPalette().line;
  },
  get textPrimary() {
    return getPalette().fg;
  },
  get textSecondary() {
    return getPalette().sub;
  },
  get textMuted() {
    return getPalette().muted;
  },
  get accent() {
    return getPalette().primaryBg;
  },
  get onAccent() {
    return getPalette().primaryFg;
  },
  get accentMuted() {
    return getPalette().track;
  },
  get track() {
    return getPalette().track;
  },
  get success() {
    return getPalette().success;
  },
  get warning() {
    return getPalette().warning;
  },
  get danger() {
    return getPalette().danger;
  },
  get overlay() {
    return getPalette().overlay;
  },
  get sheet() {
    return getPalette().sheet;
  },
  get shadow() {
    return '#000000';
  },
};

export const tagPalette = [
  '#5EA2FF',
  '#46C37B',
  '#FFB655',
  '#FF6B6B',
  '#B68BFF',
  '#50C5D7',
  '#F28CC6',
  '#9BE564',
] as const;
