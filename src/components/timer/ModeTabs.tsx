import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { TimerMode } from '../../types/timer';

const labels: Record<TimerMode, string> = {
  focus: 'Fokus',
  shortBreak: 'Kurzpause',
  longBreak: 'Lange Pause',
};

interface ModeTabsProps {
  value: TimerMode;
  onChange: (value: TimerMode) => void;
  disabled?: boolean;
}

export const ModeTabs = ({ value, onChange, disabled }: ModeTabsProps) => (
  <View style={styles.container}>
    {(Object.keys(labels) as TimerMode[]).map((mode) => {
      const isActive = mode === value;
      return (
        <Pressable
          key={mode}
          disabled={disabled}
          onPress={() => onChange(mode)}
          style={[styles.tab, isActive ? styles.tabActive : null]}
        >
          <Text style={[styles.label, isActive ? styles.labelActive : null]}>
            {labels[mode]}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: '#1A0B06',
  },
});

