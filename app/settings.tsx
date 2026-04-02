import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DAILY_FOCUS_GOAL_OPTIONS } from '../src/constants/notifications';
import { SyncQueueCard } from '../src/components/sync/SyncQueueCard';
import { Button } from '../src/components/ui/Button';
import { EmptyState } from '../src/components/ui/EmptyState';
import { Screen } from '../src/components/ui/Screen';
import { SectionCard } from '../src/components/ui/SectionCard';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { TagPill } from '../src/components/ui/TagPill';
import { TextField } from '../src/components/ui/TextField';
import { DEFAULT_BACKEND_URL, GENERAL_TAG_ID } from '../src/constants/config';
import { colors } from '../src/constants/colors';
import { spacing } from '../src/constants/spacing';
import { timerEngine } from '../src/services/timer/timerEngine';
import { notificationService } from '../src/services/notifications/notificationService';
import { useSettingsStore } from '../src/store/settingsStore';
import { useSyncStore } from '../src/store/syncStore';
import { useTagsStore } from '../src/store/tagsStore';
import { useTimerStore } from '../src/store/timerStore';
import { NotificationPreferences } from '../src/types/notifications';

const normalizeBackendUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const NotificationToggleRow = ({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) => (
  <View style={styles.preferenceRow}>
    <View style={styles.preferenceCopy}>
      <Text style={styles.preferenceLabel}>{label}</Text>
      <Text style={styles.preferenceDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.border, true: colors.accentMuted }}
      thumbColor={value ? colors.accent : colors.textSecondary}
    />
  </View>
);

const NotificationSettingsCard = memo(function NotificationSettingsCard({
  notificationPreferences,
  onSave,
}: {
  notificationPreferences: NotificationPreferences;
  onSave: (nextValue: NotificationPreferences) => Promise<void>;
}) {
  const [draftPreferences, setDraftPreferences] = useState(notificationPreferences);
  const latestPersistedPreferences = useRef(notificationPreferences);

  useEffect(() => {
    latestPersistedPreferences.current = notificationPreferences;
    setDraftPreferences(notificationPreferences);
  }, [notificationPreferences]);

  const [notificationsSupported, setNotificationsSupported] = useState(false);

  useEffect(() => {
    setNotificationsSupported(notificationService.isSupported());
  }, []);

  const updatePreferences = (nextValue: NotificationPreferences) => {
    const previousValue = latestPersistedPreferences.current;
    setDraftPreferences(nextValue);

    void onSave(nextValue).catch(() => {
      setDraftPreferences(previousValue);
    });
  };

  return (
    <SectionCard>
      <SectionHeader
        title="Benachrichtigungen"
        subtitle="Steuert Erinnerungen fur Sessionende, Pausenende und Tagesziele."
      />
      {!notificationsSupported ? (
        <Text style={styles.warningText}>
          `expo-notifications` ist noch nicht installiert. Fuhre `npx expo install
          expo-notifications` aus, damit System-Benachrichtigungen verfugbar sind.
        </Text>
      ) : null}
      <NotificationToggleRow
        label="Sessionende"
        description="Benachrichtigt dich, wenn eine Fokus-Session abgeschlossen ist."
        value={draftPreferences.notifyOnFocusEnd}
        onValueChange={(value) =>
          updatePreferences({
            ...draftPreferences,
            notifyOnFocusEnd: value,
          })
        }
      />
      <NotificationToggleRow
        label="Pausenende"
        description="Benachrichtigt dich, wenn eine kurze oder lange Pause endet."
        value={draftPreferences.notifyOnBreakEnd}
        onValueChange={(value) =>
          updatePreferences({
            ...draftPreferences,
            notifyOnBreakEnd: value,
          })
        }
      />
      <View style={styles.goalSection}>
        <Text style={styles.preferenceLabel}>Tagesziel</Text>
        <Text style={styles.preferenceDescription}>
          Benachrichtigt dich, sobald du an einem Tag die gewahlte Fokuszeit erreicht hast.
        </Text>
        <View style={styles.goalOptions}>
          <Button
            label="Aus"
            variant={draftPreferences.dailyFocusGoalHours === null ? 'primary' : 'secondary'}
            onPress={() =>
              updatePreferences({
                ...draftPreferences,
                dailyFocusGoalHours: null,
              })
            }
          />
          {DAILY_FOCUS_GOAL_OPTIONS.map((hours) => (
            <Button
              key={hours}
              label={`${hours}h`}
              variant={draftPreferences.dailyFocusGoalHours === hours ? 'primary' : 'secondary'}
              onPress={() =>
                updatePreferences({
                  ...draftPreferences,
                  dailyFocusGoalHours: hours,
                })
              }
            />
          ))}
        </View>
      </View>
    </SectionCard>
  );
});

export default function SettingsScreen() {
  const router = useRouter();
  const tags = useTagsStore((state) => state.tags);
  const queueItems = useSyncStore((state) => state.items);
  const retryItem = useSyncStore((state) => state.retryItem);
  const retryAll = useSyncStore((state) => state.retryAll);
  const backendUrl = useSettingsStore((state) => state.backendUrl);
  const notificationPreferences = useSettingsStore((state) => state.notificationPreferences);
  const autoSwitchToBreaks = useSettingsStore((state) => state.autoSwitchToBreaks);
  const saveBackendUrl = useSettingsStore((state) => state.saveBackendUrl);
  const saveNotificationPreferences = useSettingsStore((state) => state.saveNotificationPreferences);
  const saveAutoSwitchToBreaks = useSettingsStore((state) => state.saveAutoSwitchToBreaks);

  const [backendUrlInput, setBackendUrlInput] = useState(backendUrl);
  const [isSavingBackendUrl, setIsSavingBackendUrl] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);

  useEffect(() => {
    setBackendUrlInput(backendUrl);
  }, [backendUrl]);

  useEffect(() => {
    let isMounted = true;

    const loadNotificationCapability = async () => {
      const granted = notificationService.isSupported()
        ? await notificationService.getPermissionStatus()
        : false;

      if (isMounted) {
        setNotificationsGranted(granted);
      }
    };

    void loadNotificationCapability();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasBackendUrlChanges = useMemo(
    () => normalizeBackendUrl(backendUrlInput) !== normalizeBackendUrl(backendUrl),
    [backendUrl, backendUrlInput],
  );

  const runSyncSafely = async (work: () => Promise<void>, title: string) => {
    try {
      await work();
    } catch (error) {
      Alert.alert(title, error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  };

  const handleSaveBackendUrl = async () => {
    setIsSavingBackendUrl(true);

    try {
      await saveBackendUrl(backendUrlInput);
    } catch (error) {
      Alert.alert(
        'Backend-URL konnte nicht gespeichert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setIsSavingBackendUrl(false);
    }
  };

  const persistNotificationPreferences = async (nextValue: NotificationPreferences) => {
    try {
      let hasPermission = notificationsGranted;
      const needsPermission =
        nextValue.notifyOnFocusEnd ||
        nextValue.notifyOnBreakEnd ||
        nextValue.dailyFocusGoalHours !== null;

      if (needsPermission && notificationService.isSupported() && !hasPermission) {
        const granted = await notificationService.requestPermission();
        setNotificationsGranted(granted);
        hasPermission = granted;

        if (!granted) {
          Alert.alert(
            'Benachrichtigungen nicht erlaubt',
            'Bitte erlaube Benachrichtigungen, damit Erinnerungen am Session- oder Pausenende gesendet werden.',
          );
          return;
        }
      }

      await saveNotificationPreferences(nextValue);

      const timerState = useTimerStore.getState();
      if (timerState.status === 'running') {
        const remainingSeconds = timerEngine.getRemainingSeconds(timerState);
        const shouldNotifyCurrentMode =
          (timerState.activeMode === 'focus' && nextValue.notifyOnFocusEnd) ||
          (timerState.activeMode !== 'focus' && nextValue.notifyOnBreakEnd);

        if (shouldNotifyCurrentMode && hasPermission) {
          await notificationService.scheduleTimerCompletionNotification(
            timerState.activeMode,
            remainingSeconds,
          );
        } else {
          await notificationService.cancelTimerCompletionNotification();
        }
      } else {
        await notificationService.cancelTimerCompletionNotification();
      }
    } catch (error) {
      Alert.alert(
        'Benachrichtigungen konnten nicht gespeichert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    }
  };

  return (
    <Screen
      title="Settings"
      subtitle="Lokale Quelle, Push-only Synchronisierung."
      headerRight={<Button label="SchlieBen" variant="ghost" onPress={() => router.back()} />}
    >
      <SectionCard>
        <SectionHeader title="Backend" subtitle="Zentrale Konfiguration fur Push-Requests" />
        <TextField
          label="Backend-URL"
          value={backendUrlInput}
          onChangeText={setBackendUrlInput}
          placeholder="https://example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          helperText="Die URL wird fur alle neuen Push-Requests verwendet."
        />
        <View style={styles.actionRow}>
          <Button
            label="Speichern"
            onPress={() => void handleSaveBackendUrl()}
            disabled={!hasBackendUrlChanges || isSavingBackendUrl}
          />
          <Button
            label="Standard"
            variant="secondary"
            onPress={() => setBackendUrlInput(DEFAULT_BACKEND_URL)}
            disabled={isSavingBackendUrl}
          />
        </View>
        <Text style={styles.meta}>Aktiv: {backendUrl}</Text>
      </SectionCard>

      <NotificationSettingsCard
        notificationPreferences={notificationPreferences}
        onSave={persistNotificationPreferences}
      />

      <SectionCard>
        <SectionHeader
          title="Timer"
          subtitle="Steuert, wie nach abgeschlossenen Fokus-Sessions weitergeschaltet wird."
        />
        <NotificationToggleRow
          label="Automatisch zu Pausen wechseln"
          description="Wenn aktiv, springt der Timer nach Fokus-Sessions automatisch zur kurzen oder langen Pause."
          value={autoSwitchToBreaks}
          onValueChange={(value) => {
            void saveAutoSwitchToBreaks(value).catch((error) => {
              Alert.alert(
                'Timer-Einstellung konnte nicht gespeichert werden',
                error instanceof Error ? error.message : 'Unbekannter Fehler',
              );
            });
          }}
        />
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Tags"
          subtitle="Allgemein bleibt geschutzt, weitere Tags sind editierbar."
          action={<Button label="Neu" variant="secondary" onPress={() => router.push('/tag/new')} />}
        />
        {tags.length <= 1 ? (
          <EmptyState
            title="Nur Allgemein vorhanden"
            description="Lege weitere Tags an, um Aufgaben und freie Sessions farblich zu strukturieren."
          />
        ) : null}
        <View style={styles.list}>
          {tags.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => router.push(`/tag/${tag.id}`)}
              style={styles.row}
            >
              <TagPill label={tag.name} color={tag.color} />
              <Text style={styles.rowMeta}>
                {tag.id === GENERAL_TAG_ID ? 'Standard' : 'Bearbeiten'}
              </Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Sync-Queue"
          subtitle="Fehlgeschlagene Pushes bleiben lokal sichtbar."
          action={
            <Button
              label="Alle senden"
              variant="secondary"
              onPress={() => void runSyncSafely(retryAll, 'Queue konnte nicht gesendet werden')}
            />
          }
        />
        {queueItems.length === 0 ? (
          <EmptyState
            title="Keine Queue-Eintrage"
            description="Sobald Requests gesendet werden, erscheinen Status und Payload hier."
          />
        ) : (
          queueItems.map((item) => (
            <SyncQueueCard
              key={item.id}
              item={item}
              onRetry={() =>
                runSyncSafely(
                  () => retryItem(item.id),
                  'Eintrag konnte nicht erneut gesendet werden',
                )
              }
            />
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  preferenceCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  preferenceLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  preferenceDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  goalSection: {
    gap: spacing.sm,
  },
  goalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  warningText: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
