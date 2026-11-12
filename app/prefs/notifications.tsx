import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ListGroup, ToggleRow } from '../../src/components/ui/List';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { Slider } from '../../src/components/ui/Slider';
import { colors } from '../../src/constants/colors';
import {
  DAILY_FOCUS_GOAL_MAX_HOURS,
  DAILY_FOCUS_GOAL_STEP_HOURS,
} from '../../src/constants/notifications';
import { applyNotificationPreferences } from '../../src/services/notifications/applyPreferences';
import { notificationService } from '../../src/services/notifications/notificationService';
import { useSettingsStore } from '../../src/store/settingsStore';
import { themedStyles } from '../../src/theme/runtime';
import { NotificationPreferences } from '../../src/types/notifications';

/** Der linke Anschlag des Reglers schaltet das Tagesziel aus. */
const GOAL_OFF = 0;

const formatGoal = (hours: number): string =>
  hours === GOAL_OFF ? 'Aus' : `${String(hours).replace('.', ',')} Std.`;

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const preferences = useSettingsStore((state) => state.notificationPreferences);
  const supported = notificationService.isSupported();
  // Wert unter dem Finger, solange der Regler gezogen wird.
  const [goalDraft, setGoalDraft] = useState<number | null>(null);
  const savedGoal = preferences.dailyFocusGoalHours ?? GOAL_OFF;

  const update = (patch: Partial<NotificationPreferences>) => {
    void applyNotificationPreferences({ ...preferences, ...patch })
      .then((result) => {
        if (result === 'permission-denied') {
          Alert.alert(
            'Benachrichtigungen nicht erlaubt',
            'Erlaube Benachrichtigungen in den Systemeinstellungen, damit die App dich erinnern kann.',
          );
        }
      })
      .catch((error) => {
        Alert.alert(
          'Benachrichtigungen konnten nicht gespeichert werden',
          error instanceof Error ? error.message : 'Unbekannter Fehler',
        );
      })
      // Erst jetzt steht der gespeicherte Wert fest; bis dahin hält der Regler den gezogenen.
      .finally(() => setGoalDraft(null));
  };

  return (
    <Screen title="Benachrichtigungen" onBack={() => router.back()}>
      {supported ? null : (
        <Text style={styles.warning}>
          Benachrichtigungen sind auf diesem Gerät nicht verfügbar. Die Einstellungen werden
          gespeichert, haben hier aber keine Wirkung.
        </Text>
      )}

      <ListGroup title="Timer">
        <ToggleRow
          label="Sessionende"
          detail="Wenn eine Fokus-Session abgelaufen ist."
          value={preferences.notifyOnFocusEnd}
          onValueChange={(value) => update({ notifyOnFocusEnd: value })}
        />
        <ToggleRow
          label="Pausenende"
          detail="Wenn eine kurze oder lange Pause abgelaufen ist."
          value={preferences.notifyOnBreakEnd}
          onValueChange={(value) => update({ notifyOnBreakEnd: value })}
          separated
        />
      </ListGroup>

      <SectionCard>
        <SectionHeader
          title="Tagesziel"
          subtitle="Einmal am Tag, sobald du so viele Stunden fokussiert hast."
          action={<Text style={styles.goalValue}>{formatGoal(goalDraft ?? savedGoal)}</Text>}
        />
        <Slider
          value={goalDraft ?? savedGoal}
          min={GOAL_OFF}
          max={DAILY_FOCUS_GOAL_MAX_HOURS}
          step={DAILY_FOCUS_GOAL_STEP_HOURS}
          accessibilityLabel="Tagesziel"
          formatValue={formatGoal}
          onChange={setGoalDraft}
          onCommit={(hours) => {
            if (hours === savedGoal) {
              setGoalDraft(null);
              return;
            }

            setGoalDraft(hours);
            update({ dailyFocusGoalHours: hours === GOAL_OFF ? null : hours });
          }}
        />
        <View style={styles.goalScale}>
          <Text style={styles.goalScaleLabel}>Aus</Text>
          <Text style={styles.goalScaleLabel}>{formatGoal(DAILY_FOCUS_GOAL_MAX_HOURS)}</Text>
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = themedStyles(() => ({
  goalValue: {
    minWidth: 72,
    textAlign: 'right',
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  goalScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  goalScaleLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  warning: {
    paddingHorizontal: 8,
    color: colors.warning,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
}));
