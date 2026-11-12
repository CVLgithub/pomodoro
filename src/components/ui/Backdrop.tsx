import { Platform, StyleSheet, View } from 'react-native';

import { getPalette } from '../../theme/runtime';

const glow = (rgb: string, strength: number): object => {
  const gradient = `radial-gradient(circle, rgba(${rgb},${strength}) 0%, rgba(${rgb},0) 70%)`;

  return Platform.OS === 'web'
    ? { backgroundImage: gradient }
    : { experimental_backgroundImage: gradient };
};

/**
 * Grundfläche mit drei weichen Lichtflecken in den Farben der aktiven Farbwelt.
 * Liegt hinter dem gesamten Screen und gibt den Glasflächen etwas zum Brechen.
 */
export const Backdrop = () => {
  const palette = getPalette();
  const [first, second, third] = palette.glows;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: palette.bg }]}
    >
      <View style={[styles.first, glow(first, 0.7)]} />
      <View style={[styles.second, glow(second, 0.65)]} />
      <View style={[styles.third, glow(third, 0.5)]} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  first: {
    position: 'absolute',
    top: 20,
    left: -80,
    width: 560,
    height: 560,
  },
  second: {
    position: 'absolute',
    top: 380,
    left: -260,
    width: 520,
    height: 520,
  },
  third: {
    position: 'absolute',
    top: 470,
    right: -200,
    width: 460,
    height: 460,
  },
});
