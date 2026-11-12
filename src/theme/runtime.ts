import { Appearance, ImageStyle, Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { DEFAULT_THEME, Palette, ThemeName, palettes } from './palettes';

let activeTheme: ThemeName = DEFAULT_THEME;

export const getActiveThemeName = (): ThemeName => activeTheme;

export const getPalette = (): Palette => palettes[activeTheme];

/**
 * Stellt die aktive Farbwelt um. Bereits gerenderte Komponenten übernehmen sie
 * erst beim nächsten Rendern; das Root-Layout hängt deshalb den Themennamen als
 * `key` an den Baum und baut ihn nach einem Wechsel neu auf.
 */
export const setActiveTheme = (name: ThemeName): void => {
  activeTheme = name;

  // Was iOS selbst zeichnet (Sheets, Tastatur, Rückfragen), kennt die Farbwelt
  // nicht und richtet sich nach hell oder dunkel. Die App ist systemweit auf
  // dunkel festgelegt; ohne diese Vorgabe stünde in der hellen Farbwelt dunkle
  // Schrift auf einem dunklen Sheet.
  if (Platform.OS === 'ios') {
    Appearance.setColorScheme(palettes[name].scheme);
  }
};

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Ersatz für `StyleSheet.create` auf Modulebene. Die Fabrik läuft pro Farbwelt
 * einmal (beim ersten Zugriff), sodass `colors.*` darin die Werte der gerade
 * aktiven Farbwelt liefert.
 */
export function themedStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  factory: () => T & NamedStyles<any>,
): T {
  const cache = new Map<ThemeName, Record<PropertyKey, unknown>>();

  const resolve = (): Record<PropertyKey, unknown> => {
    let styles = cache.get(activeTheme);
    if (!styles) {
      styles = StyleSheet.create(factory() as NamedStyles<any>) as Record<PropertyKey, unknown>;
      cache.set(activeTheme, styles);
    }
    return styles;
  };

  return new Proxy({} as object, {
    get: (_target, key) => resolve()[key],
    has: (_target, key) => key in resolve(),
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: (_target, key) => {
      const value = resolve()[key];
      return value === undefined
        ? undefined
        : { value, enumerable: true, configurable: true, writable: false };
    },
  }) as T;
}
