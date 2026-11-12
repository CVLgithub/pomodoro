import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';

import { CircleButton } from '../../src/components/ui/CircleButton';
import { Sheet } from '../../src/components/ui/Sheet';
import { colors } from '../../src/constants/colors';
import { MAX_TIMER_MINUTES, TIMER_MODES } from '../../src/constants/timerModes';
import { useTimerStore } from '../../src/store/timerStore';
import { themedStyles } from '../../src/theme/runtime';
import { haptics } from '../../src/utils/haptics';

/** Wahl des Timer-Modus und der Dauer je Modus. Beides lässt sich nur im Leerlauf ändern. */
export default function TimerModeSheet() {
  const timer = useTimerStore(
    useShallow((state) => ({
      activeMode: state.activeMode,
      status: state.status,
      focusMinutes: state.focusMinutes,
      shortBreakMinutes: state.shortBreakMinutes,
      longBreakMinutes: state.longBreakMinutes,
      setMode: state.setMode,
      setDurations: state.setDurations,
    })),
  );
  const isIdle = timer.status === 'idle';

  const runSafely = async (work: () => Promise<void>, title: string) => {
    try {
      await work();
    } catch (error) {
      Alert.alert(title, error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  };

  return (
    <Sheet title="Modus und Dauer">
      <View>
        {TIMER_MODES.map((entry, index) => {
          const selected = entry.mode === timer.activeMode;
          const minutes = timer[entry.durationKey];

          const changeMinutes = (next: number) => {
            haptics.selection();
            void runSafely(
              () => timer.setDurations({ [entry.durationKey]: next }),
              'Dauer konnte nicht gespeichert werden',
            );
          };

          return (
            <View key={entry.mode} style={[styles.modeRow, index > 0 ? styles.modeRowSeparated : null]}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: !isIdle }}
                disabled={!isIdle}
                onPress={() => {
                  if (!selected) {
                    haptics.selection();
                  }

                  void runSafely(() => timer.setMode(entry.mode), 'Modus konnte nicht gesetzt werden');
                }}
                style={[styles.modeChoice, !isIdle && !selected ? styles.dimmed : null]}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={colors.textPrimary}
                />
                <Text style={styles.modeLabel}>{entry.label}</Text>
              </Pressable>
              <View style={[styles.stepper, !isIdle ? styles.dimmed : null]}>
                <CircleButton
                  icon="remove"
                  label={`${entry.label} kürzer`}
                  disabled={!isIdle || minutes <= 1}
                  onPress={() => changeMinutes(minutes - 1)}
                />
                <Text style={styles.stepperValue}>{minutes} Min.</Text>
                <CircleButton
                  icon="add"
                  label={`${entry.label} länger`}
                  disabled={!isIdle || minutes >= MAX_TIMER_MINUTES}
                  onPress={() => changeMinutes(minutes + 1)}
                />
              </View>
            </View>
          );
        })}
      </View>
      {isIdle ? null : (
        <Text style={styles.hint}>
          Modus und Dauer lassen sich ändern, sobald die laufende Session beendet ist.
        </Text>
      )}
    </Sheet>
  );
}

const styles = themedStyles(() => ({
  modeRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modeRowSeparated: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modeChoice: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeLabel: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperValue: {
    minWidth: 64,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  dimmed: {
    opacity: 0.5,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
}));
