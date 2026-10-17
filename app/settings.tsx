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
import { DEFAULT_BACKEND_URL, FREE_SESSION_TITLE, GENERAL_TAG_ID } from '../src/constants/config';
import { colors } from '../src/constants/colors';
import { radii, spacing } from '../src/constants/spacing';
import { timerEngine } from '../src/services/timer/timerEngine';
import { notificationService } from '../src/services/notifications/notificationService';
import { useSessionsStore } from '../src/store/sessionsStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useSyncStore } from '../src/store/syncStore';
import { useTagsStore } from '../src/store/tagsStore';
import { useTimerStore } from '../src/store/timerStore';
import { NotificationPreferences } from '../src/types/notifications';
import { START_PAGE_OPTIONS } from '../src/types/settings';
import type { Tag } from '../src/types/tag';
import { addMinutes, formatDateKey, formatTimeLabel, toLocalIsoString } from '../src/utils/date';
import {
  buildTagGroupOptions,
  DEFAULT_TAG_GROUP_KEY,
  getTagGroupKey,
  sortTagsByGroupAndName,
} from '../src/utils/tagGroups';

const normalizeBackendUrl = (value: string): string => value.trim().replace(/\/+$/, '');
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_INPUT_PATTERN = /^\d{2}:\d{2}$/;

const createLocalDate = (dateInput: string, timeInput: string): Date | null => {
  if (!DATE_INPUT_PATTERN.test(dateInput) || !TIME_INPUT_PATTERN.test(timeInput)) {
    return null;
  }

  const [year, month, day] = dateInput.split('-').map(Number);
  const [hours, minutes] = timeInput.split(':').map(Number);

  if (
    [year, month, day, hours, minutes].some((value) => Number.isNaN(value)) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes
  ) {
    return null;
  }

  return date;
};

const getManualSessionDefaults = () => {
  const now = new Date();
  return {
    title: FREE_SESSION_TITLE,
    date: formatDateKey(now),
    startTime: formatTimeLabel(addMinutes(now, -25)),
    endTime: formatTimeLabel(now),
    tagId: GENERAL_TAG_ID,
  };
};

type SettingsTagGroup = {
  groupKey: string;
  groupLabel: string;
  tags: Tag[];
};

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
        subtitle="Lege fest, wann du erinnert werden möchtest."
      />
      {!notificationsSupported ? (
        <Text style={styles.warningText}>
          Benachrichtigungen sind auf diesem Gerät noch nicht verfügbar.
        </Text>
      ) : null}
      <NotificationToggleRow
        label="Sessionende"
        description="Benachrichtigt dich, wenn eine Session abgeschlossen ist."
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
          Benachrichtigt dich, sobald du dein Ziel für den Tag erreicht hast.
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
  const startPage = useSettingsStore((state) => state.startPage);
  const tagGroups = useSettingsStore((state) => state.tagGroups);
  const deleteTagGroup = useSettingsStore((state) => state.deleteTagGroup);
  const saveBackendUrl = useSettingsStore((state) => state.saveBackendUrl);
  const saveNotificationPreferences = useSettingsStore((state) => state.saveNotificationPreferences);
  const saveAutoSwitchToBreaks = useSettingsStore((state) => state.saveAutoSwitchToBreaks);
  const saveStartPage = useSettingsStore((state) => state.saveStartPage);
  const createSessionEntry = useSessionsStore((state) => state.createSessionEntry);
  const updateTag = useTagsStore((state) => state.updateTag);

  const [backendUrlInput, setBackendUrlInput] = useState(backendUrl);
  const [isSavingBackendUrl, setIsSavingBackendUrl] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [manualSessionDraft, setManualSessionDraft] = useState(getManualSessionDefaults);
  const [isSavingManualSession, setIsSavingManualSession] = useState(false);
  const [showCollapsedQueueItems, setShowCollapsedQueueItems] = useState(false);
  const [isEditingTagGroups, setIsEditingTagGroups] = useState(false);

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
  const visibleQueueItems = useMemo(
    () => queueItems.filter((item) => item.status === 'failed'),
    [queueItems],
  );
  const collapsedQueueItems = useMemo(
    () => queueItems.filter((item) => item.status !== 'failed'),
    [queueItems],
  );
  const collapsedQueueTitle = useMemo(
    () =>
      collapsedQueueItems.every((item) => item.status === 'synced')
        ? 'Bereits erledigte Einträge'
        : 'Weitere Einträge',
    [collapsedQueueItems],
  );

  const groupedTags = useMemo<SettingsTagGroup[]>(() => {
    const sortedTags = sortTagsByGroupAndName(tags);

    return buildTagGroupOptions(tags, tagGroups).map((group) => ({
      groupKey: group.key,
      groupLabel: group.label,
      tags: sortedTags.filter((tag) => getTagGroupKey(tag.groupName) === group.key),
    }));
  }, [tagGroups, tags]);

  const runSyncSafely = async (work: () => Promise<void>, title: string) => {
    try {
      await work();
    } catch (error) {
      Alert.alert(title, error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  };

  const handleDeleteTagGroup = (group: SettingsTagGroup) => {
    const tagCount = group.tags.length;
    const message =
      tagCount === 1
        ? 'Der zugehörige Tag wird nach Allgemein verschoben.'
        : tagCount > 1
          ? `${tagCount} zugehörige Tags werden nach Allgemein verschoben.`
          : 'Diese Gruppe wird dauerhaft entfernt.';

    Alert.alert('Tag-Gruppe löschen?', message, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              for (const tag of group.tags) {
                await updateTag(tag.id, { groupName: null });
              }
              await deleteTagGroup(group.groupLabel);
            } catch (error) {
              Alert.alert(
                'Tag-Gruppe konnte nicht gelöscht werden',
                error instanceof Error ? error.message : 'Unbekannter Fehler',
              );
            }
          })();
        },
      },
    ]);
  };

  const handleSaveBackendUrl = async () => {
    setIsSavingBackendUrl(true);

    try {
      await saveBackendUrl(backendUrlInput);
    } catch (error) {
      Alert.alert(
        'Adresse konnte nicht gespeichert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setIsSavingBackendUrl(false);
    }
  };

  const handleAddManualSession = async () => {
    const title = manualSessionDraft.title.trim();
    const startDate = createLocalDate(manualSessionDraft.date, manualSessionDraft.startTime);
    const endDate = createLocalDate(manualSessionDraft.date, manualSessionDraft.endTime);
    const now = new Date();

    if (!title) {
      Alert.alert('Session konnte nicht gespeichert werden', 'Bitte gib einen Namen für die Session ein.');
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert(
        'Session konnte nicht gespeichert werden',
        'Bitte nutze das Format YYYY-MM-DD für das Datum und HH:MM für die Uhrzeiten.',
      );
      return;
    }

    if (endDate <= startDate) {
      Alert.alert(
        'Session konnte nicht gespeichert werden',
        'Die Endzeit muss nach der Startzeit liegen.',
      );
      return;
    }

    if (endDate > now) {
      Alert.alert(
        'Session konnte nicht gespeichert werden',
        'Es können nur vergangene Sessions manuell hinzugefügt werden.',
      );
      return;
    }

    setIsSavingManualSession(true);

    try {
      await createSessionEntry({
        title,
        date: manualSessionDraft.date,
        startTime: toLocalIsoString(startDate),
        endTime: toLocalIsoString(endDate),
        tagId: manualSessionDraft.tagId,
      });
      setManualSessionDraft(getManualSessionDefaults());
      Alert.alert('Session gespeichert', 'Die vergangene Session wurde hinzugefügt.');
    } catch (error) {
      Alert.alert(
        'Session konnte nicht gespeichert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setIsSavingManualSession(false);
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
      title="Einstellungen"
      subtitle="Passe Timer, Tags und App-Verhalten an."
      headerRight={<Button label="Schließen" variant="ghost" onPress={() => router.back()} />}
    >
      <SectionCard>
        <SectionHeader title="Verbindung" subtitle="Lege fest, welche Adresse die App verwendet." />
        <TextField
          label="Adresse"
          value={backendUrlInput}
          onChangeText={setBackendUrlInput}
          placeholder="https://example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          helperText="Diese Adresse wird für Import und Übertragung verwendet."
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
        <Text style={styles.meta}>Aktuelle Adresse: {backendUrl}</Text>
      </SectionCard>

      <NotificationSettingsCard
        notificationPreferences={notificationPreferences}
        onSave={persistNotificationPreferences}
      />

      <SectionCard>
        <SectionHeader
          title="Startseite"
          subtitle="Wähle, welcher Bereich beim Öffnen der App erscheint."
        />
        <View style={styles.startPageOptions}>
          {START_PAGE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: startPage === option.value }}
              onPress={() => {
                void saveStartPage(option.value).catch((error) => {
                  Alert.alert(
                    'Startseite konnte nicht gespeichert werden',
                    error instanceof Error ? error.message : 'Unbekannter Fehler',
                  );
                });
              }}
              style={[
                styles.startPageOption,
                startPage === option.value ? styles.startPageOptionSelected : null,
              ]}
            >
              <Text
                style={[
                  styles.startPageOptionLabel,
                  startPage === option.value ? styles.startPageOptionLabelSelected : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Timer"
          subtitle="Lege fest, was nach einer abgeschlossenen Session passiert."
        />
        <NotificationToggleRow
          label="Automatisch zu Pausen wechseln"
          description="Wenn aktiv, springt der Timer danach automatisch zur kurzen oder langen Pause."
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
          subtitle="Erstelle Tags und ordne sie Gruppen zu."
          action={<Button label="Neu" variant="secondary" onPress={() => router.push('/tag/new')} />}
        />
        {tags.length <= 1 && tagGroups.length === 0 ? (
          <EmptyState
            title="Nur Allgemein vorhanden"
            description="Lege weitere Tags an, um Aufgaben und freie Sessions farblich zu strukturieren."
          />
        ) : null}
        <View style={styles.list}>
          {groupedTags.map((group) => (
            <View key={group.groupKey} style={styles.tagListGroup}>
              <View style={styles.tagListGroupHeader}>
                <Text style={styles.tagListGroupTitle}>{group.groupLabel}</Text>
                <View style={styles.tagListGroupActions}>
                  <Text style={styles.tagListGroupCount}>
                    {group.tags.length} {group.tags.length === 1 ? 'Tag' : 'Tags'}
                  </Text>
                  {isEditingTagGroups && group.groupKey !== DEFAULT_TAG_GROUP_KEY ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleDeleteTagGroup(group)}
                      style={styles.tagGroupDeleteButton}
                    >
                      <Text style={styles.tagGroupDeleteLabel}>Gruppe löschen</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <View style={styles.tagListGroupRows}>
                {group.tags.length > 0 ? (
                  group.tags.map((tag) => (
                    <Pressable
                      key={tag.id}
                      onPress={() => router.push(`/tag/${tag.id}`)}
                      style={styles.row}
                    >
                      <TagPill label={tag.name} color={tag.color} />
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.emptyGroupText}>Noch keine Tags in dieser Gruppe.</Text>
                )}
              </View>
            </View>
          ))}
        </View>
        {tagGroups.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsEditingTagGroups((isEditing) => !isEditing)}
            style={styles.tagGroupsEditButton}
          >
            <Text style={styles.tagGroupsEditLabel}>
              {isEditingTagGroups ? 'Fertig' : 'Bearbeiten'}
            </Text>
          </Pressable>
        ) : null}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Vergangene Session"
          subtitle="Erfasse eine bereits abgeschlossene Session manuell."
        />
        <TextField
          label="Name"
          value={manualSessionDraft.title}
          onChangeText={(value) =>
            setManualSessionDraft((current) => ({
              ...current,
              title: value,
            }))
          }
          placeholder="Was hast du gemacht?"
          helperText="Der Eintrag erscheint in Statistik und Verlauf wie eine normale Session."
        />
        <View style={styles.manualSessionRow}>
          <View style={styles.manualSessionField}>
            <TextField
              label="Datum"
              value={manualSessionDraft.date}
              onChangeText={(value) =>
                setManualSessionDraft((current) => ({
                  ...current,
                  date: value,
                }))
              }
              placeholder="2026-04-04"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.manualSessionField}>
            <TextField
              label="Start"
              value={manualSessionDraft.startTime}
              onChangeText={(value) =>
                setManualSessionDraft((current) => ({
                  ...current,
                  startTime: value,
                }))
              }
              placeholder="09:00"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.manualSessionField}>
            <TextField
              label="Ende"
              value={manualSessionDraft.endTime}
              onChangeText={(value) =>
                setManualSessionDraft((current) => ({
                  ...current,
                  endTime: value,
                }))
              }
              placeholder="09:25"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        <View style={styles.manualSessionTags}>
          <Text style={styles.preferenceLabel}>Tag</Text>
          <View style={styles.tagOptions}>
            {tags.map((tag) => {
              const isSelected = manualSessionDraft.tagId === tag.id;

              return (
                <Pressable
                  key={tag.id}
                  onPress={() =>
                    setManualSessionDraft((current) => ({
                      ...current,
                      tagId: tag.id,
                    }))
                  }
                  style={[
                    styles.tagOption,
                    isSelected ? styles.tagOptionSelected : null,
                  ]}
                >
                  <TagPill label={tag.name} color={tag.color} />
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.actionRow}>
          <Button
            label="Session hinzufügen"
            onPress={() => void handleAddManualSession()}
            disabled={isSavingManualSession}
          />
          <Button
            label="Zurücksetzen"
            variant="secondary"
            onPress={() => setManualSessionDraft(getManualSessionDefaults())}
            disabled={isSavingManualSession}
          />
        </View>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Import"
          subtitle="Prüfe neue oder geänderte Einträge und übernimm sie gezielt."
          action={
            <Button
              label="Öffnen"
              variant="secondary"
              onPress={() => router.push('/downsync')}
            />
          }
        />
        <Text style={styles.meta}>
          Du entscheidest dort für jeden Eintrag einzeln.
        </Text>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Ausstehende Übertragungen"
          subtitle="Einträge, die noch einmal gesendet werden müssen."
          action={
            <Button
              label="Alle senden"
              variant="secondary"
              onPress={() => void runSyncSafely(retryAll, 'Einträge konnten nicht gesendet werden')}
            />
          }
        />
        {queueItems.length === 0 ? (
          <EmptyState
            title="Nichts ausstehend"
            description="Hier erscheint nur etwas, wenn ein Senden nicht geklappt hat."
          />
        ) : (
          <>
            {visibleQueueItems.map((item) => (
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
            ))}
            {collapsedQueueItems.length > 0 ? (
              <View style={styles.syncQueueGroup}>
                <Pressable
                  style={styles.syncQueueToggle}
                  onPress={() => setShowCollapsedQueueItems((currentValue) => !currentValue)}
                >
                  <View style={styles.syncQueueToggleCopy}>
                    <Text style={styles.syncQueueToggleTitle}>{collapsedQueueTitle}</Text>
                    <Text style={styles.syncQueueToggleMeta}>
                      {showCollapsedQueueItems
                        ? 'Eingeklappte Einträge wieder ausblenden.'
                        : `${collapsedQueueItems.length} Einträge ausklappen.`}
                    </Text>
                  </View>
                  <Text style={styles.syncQueueToggleIcon}>
                    {showCollapsedQueueItems ? 'Weniger' : 'Mehr'}
                  </Text>
                </Pressable>
                {showCollapsedQueueItems
                  ? collapsedQueueItems.map((item) => (
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
                  : null}
              </View>
            ) : null}
          </>
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
  syncQueueGroup: {
    gap: spacing.md,
  },
  syncQueueToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  syncQueueToggleCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  syncQueueToggleTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  syncQueueToggleMeta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  syncQueueToggleIcon: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  manualSessionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  manualSessionField: {
    flex: 1,
  },
  manualSessionTags: {
    gap: spacing.sm,
  },
  startPageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  startPageOption: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  startPageOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  startPageOptionLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  startPageOptionLabelSelected: {
    color: colors.textPrimary,
  },
  tagOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagOption: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 999,
    padding: 2,
  },
  tagOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
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
    gap: spacing.md,
  },
  tagListGroup: {
    gap: spacing.sm,
  },
  tagListGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tagListGroupTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  tagListGroupCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tagListGroupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tagGroupDeleteButton: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 108, 0.3)',
    borderRadius: radii.sm,
  },
  tagGroupDeleteLabel: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  tagGroupsEditButton: {
    alignSelf: 'flex-end',
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  tagGroupsEditLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tagListGroupRows: {
    gap: spacing.xs,
    paddingLeft: spacing.md,
  },
  emptyGroupText: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
});
