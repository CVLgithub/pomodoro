import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';

interface PrimaryControlProps {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}

/** Breite Haupttaste der Session (Start, Pause, Weiter). */
export const PrimaryControl = ({ label, icon, onPress }: PrimaryControlProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
  >
    <Ionicons name={icon} size={20} color={colors.onAccent} />
    <Text style={styles.primaryLabel}>{label}</Text>
  </Pressable>
);

interface RoundControlProps {
  /** Beschreibung für Screenreader. */
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Kurzer sichtbarer Text anstelle eines Symbols, z. B. "+5". */
  text?: string;
}

/** Runde Nebentaste der Session (Beenden, Verlängern). */
export const RoundControl = ({ label, onPress, icon, text }: RoundControlProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={({ pressed }) => [styles.round, pressed ? styles.pressed : null]}
  >
    {icon ? <Ionicons name={icon} size={22} color={colors.textPrimary} /> : null}
    {text ? <Text style={styles.roundText}>{text}</Text> : null}
  </Pressable>
);

export const ControlRow = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.row}>{children}</View>
);

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  primary: {
    flex: 1,
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.accent,
  },
  primaryLabel: {
    color: colors.onAccent,
    fontSize: 19,
    fontWeight: '700',
  },
  round: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassLine,
    backgroundColor: colors.surfaceElevated,
  },
  roundText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
}));
