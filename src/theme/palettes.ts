export const THEME_NAMES = ['nebel', 'graphit', 'glut', 'wald'] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

export const DEFAULT_THEME: ThemeName = 'nebel';

export const isThemeName = (value: string): value is ThemeName =>
  (THEME_NAMES as readonly string[]).includes(value);

export interface Palette {
  name: ThemeName;
  label: string;
  scheme: 'light' | 'dark';
  /** Grundfläche hinter allem. */
  bg: string;
  /** Drei weiche Lichtflecken (RGB-Tripel), die dem Glas etwas zum Brechen geben. */
  glows: readonly [string, string, string];
  fg: string;
  sub: string;
  muted: string;
  /** Ersatzfüllung für Glasflächen, wenn natives Liquid Glass fehlt. */
  glass: string;
  /** Füllung für Felder und Zeilen innerhalb einer Glasfläche. */
  glassInner: string;
  /** Kontur einer Glasfläche. */
  line: string;
  /** Trennlinie zwischen Zeilen. */
  hairline: string;
  track: string;
  primaryBg: string;
  primaryFg: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
  sheet: string;
}

const darkBase = {
  scheme: 'dark' as const,
  fg: '#FFFFFF',
  muted: '#A9AEB8',
  glass: 'rgba(255,255,255,0.10)',
  glassInner: 'rgba(255,255,255,0.09)',
  line: 'rgba(255,255,255,0.18)',
  hairline: 'rgba(255,255,255,0.12)',
  track: 'rgba(255,255,255,0.24)',
  primaryBg: '#FFFFFF',
  success: '#6EE7A0',
  warning: '#FFC766',
  danger: '#FF8A80',
  overlay: 'rgba(0,0,0,0.55)',
};

export const palettes: Record<ThemeName, Palette> = {
  nebel: {
    name: 'nebel',
    label: 'Nebel',
    scheme: 'light',
    bg: '#E7E8EC',
    glows: ['255,255,255', '195,201,214', '220,211,198'],
    fg: '#0B0B0F',
    sub: '#3F4450',
    muted: '#5A6070',
    glass: 'rgba(255,255,255,0.55)',
    glassInner: 'rgba(255,255,255,0.55)',
    line: 'rgba(255,255,255,0.9)',
    hairline: 'rgba(11,11,15,0.10)',
    track: 'rgba(11,11,15,0.16)',
    primaryBg: '#0B0B0F',
    primaryFg: '#FFFFFF',
    success: '#17783C',
    warning: '#8A5A00',
    danger: '#A8141D',
    overlay: 'rgba(11,11,15,0.35)',
    sheet: '#F0F1F5',
  },
  graphit: {
    ...darkBase,
    name: 'graphit',
    label: 'Graphit',
    bg: '#08090B',
    glows: ['107,114,128', '63,70,84', '154,163,178'],
    sub: '#CDD1D8',
    primaryFg: '#08090B',
    sheet: '#16171B',
  },
  glut: {
    ...darkBase,
    name: 'glut',
    label: 'Glut',
    bg: '#0B0605',
    glows: ['217,72,31', '163,36,28', '232,154,50'],
    sub: '#F0DED6',
    primaryFg: '#0B0605',
    sheet: '#1B100D',
  },
  wald: {
    ...darkBase,
    name: 'wald',
    label: 'Wald',
    bg: '#030A08',
    glows: ['14,143,110', '11,94,99', '95,191,143'],
    sub: '#D5E7E0',
    primaryFg: '#030A08',
    sheet: '#0B1714',
  },
};
