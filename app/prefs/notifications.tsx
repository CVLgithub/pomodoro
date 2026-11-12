import { Alert, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { ChoiceChips } from '../../src/components/ui/ChoiceChips';
import { ListGroup, ToggleRow } from '../../src/components/ui/List';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { colors } from '../../src/constants/colors';
import { DAILY_FOCUS_GOAL_OPTIONS } from '../../src/constants/notifications';
import { applyNotificationPreferences } from '../../src/services/notifications/applyPreferences';
import { notificationService } from '../../src/services/notifications/notificationService';
import { useSettingsStore } from '../../src/store/settingsStore';
import { themedStyles } from '../../src/theme/runtime';
import { NotificationPreferences } from '../../src/types/notifications';

const GOAL_OFF = 0;
const GOAL_OPTIONS = [
  { value: GOAL_OFF, label: 'Aus' },
  ...DAILY_FOCUS_GOAL_OPTIONS.map((hours) => ({ value: hours as number, label: `${hours} Std.` })),
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const preferences = useSettingsStore((state) => state.notificationPreferences);
  const supported = notificationService.isSupported();

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
      });
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
        />
        <ChoiceChips
          options={GOAL_OPTIONS}
          selected={[preferences.dailyFocusGoalHours ?? GOAL_OFF]}
          onToggle={(hours) => update({ dailyFocusGoalHours: hours === GOAL_OFF ? null : hours })}
        />
      </SectionCard>
    </Screen>
  );
}

const styles = themedStyles(() => ({
  warning: {
    paddingHorizontal: 8,
    color: colors.warning,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
}));
