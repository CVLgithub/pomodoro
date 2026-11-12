import { Alert, Pressable, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { useSettingsStore } from '../../store/settingsStore';
import { THEME_NAMES, palettes } from '../../theme/palettes';
import { themedStyles } from '../../theme/runtime';

/** Auswahl der Farbwelt. Die Wahl gilt sofort und bleibt auf diesem Gerät gespeichert. */
export const ThemePicker = () => {
  const theme = useSettingsStore((state) => state.theme);
  const saveTheme = useSettingsStore((state) => state.saveTheme);

  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Farbwelt">
      {THEME_NAMES.map((name) => {
        const palette = palettes[name];
        const selected = name === theme;

        return (
          <Pressable
            key={name}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={palette.label}
            onPress={() => {
              if (selected) {
                return;
              }

              void saveTheme(name).catch((error) => {
                Alert.alert(
                  'Farbwelt konnte nicht gespeichert werden',
                  error instanceof Error ? error.message : 'Unbekannter Fehler',
                );
              });
            }}
            style={styles.option}
          >
            <View style={[styles.ring, selected ? styles.ringSelected : null]}>
              <View style={[styles.swatch, { backgroundColor: palette.bg }]}>
                <View
                  style={[styles.swatchGlow, { backgroundColor: `rgba(${palette.glows[0]},0.85)` }]}
                />
              </View>
            </View>
            <Text style={[styles.label, selected ? styles.labelSelected : null]}>
              {palette.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  ring: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ringSelected: {
    borderColor: colors.textPrimary,
  },
  swatch: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  swatchGlow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: -6,
    marginBottom: -6,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  labelSelected: {
    fontWeight: '700',
  },
}));
