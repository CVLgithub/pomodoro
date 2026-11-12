import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ManualSessionSheet } from '../../src/components/stats/ManualSessionSheet';
import { Button } from '../../src/components/ui/Button';
import { CircleButton } from '../../src/components/ui/CircleButton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Glass } from '../../src/components/ui/Glass';
import { ModalSheet } from '../../src/components/ui/ModalSheet';
import { Screen } from '../../src/components/ui/Screen';
import { Segmented } from '../../src/components/ui/Segmented';
import { TagChips } from '../../src/components/ui/TagChips';
import { TextField } from '../../src/components/ui/TextField';
import { colors } from '../../src/constants/colors';
import { useSessionsStore } from '../../src/store/sessionsStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { themedStyles } from '../../src/theme/runtime';
import { Session } from '../../src/types/session';
import { confirmAction } from '../../src/utils/confirm';
import { formatShortDateLabel, formatTimeLabel, getTodayDateKey } from '../../src/utils/date';
import {
  StatsPeriod,
  buildStatsBars,
  filterSessionsByRange,
  formatHoursClock,
  formatStatsRangeLabel,
  getStatsRange,
  shiftStatsAnchor,
  summarizeSessions,
} from '../../src/utils/stats';

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Tag' },
  { value: 'week', label: 'Woche' },
  { value: 'month', label: 'Monat' },
  { value: 'all', label: 'Gesamt' },
] as const;

const BAR_AREA_HEIGHT = 88;
const SESSION_LIMIT = 30;

export default function StatsScreen() {
  const sessions = useSessionsStore((state) => state.sessions);
  const updateSessionEntry = useSessionsStore((state) => state.updateSessionEntry);
  const deleteSessionEntry = useSessionsStore((state) => state.deleteSessionEntry);
  const tags = useTagsStore((state) => state.tags);
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [manualSheetVisible, setManualSheetVisible] = useState(false);
  const [editedSession, setEditedSession] = useState<Session | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const todayKey = getTodayDateKey();
  const tagsById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const range = useMemo(() => getStatsRange(period, anchor), [anchor, period]);
  const periodSessions = useMemo(
    () =>
      filterSessionsByRange(sessions, range).sort((left, right) =>
        right.startTime.localeCompare(left.startTime),
      ),
    [range, sessions],
  );
  const summary = useMemo(() => summarizeSessions(periodSessions), [periodSessions]);
  const bars = useMemo(
    () => buildStatsBars(period, anchor, period === 'all' ? sessions : periodSessions, todayKey),
    [anchor, period, periodSessions, sessions, todayKey],
  );
  const maxBarMinutes = Math.max(1, ...bars.map((bar) => bar.minutes));
  const maxTagMinutes = Math.max(1, ...summary.tags.map((entry) => entry.minutes));
  const canGoForward = range !== null && range.endKey < todayKey;
  const shownSessions = showAllSessions ? periodSessions : periodSessions.slice(0, SESSION_LIMIT);

  const changePeriod = (next: StatsPeriod) => {
    setPeriod(next);
    setAnchor(new Date());
    setShowAllSessions(false);
  };

  const openEditor = (session: Session) => {
    setEditedSession(session);
    setTitleInput(session.title);
    setTagInput(session.tagId);
  };

  const closeEditor = () => {
    setEditedSession(null);
    setIsSaving(false);
  };

  const saveSession = async () => {
    if (!editedSession || !titleInput.trim() || !tagInput || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await updateSessionEntry(editedSession.id, { title: titleInput, tagId: tagInput });
      closeEditor();
    } catch (error) {
      Alert.alert(
        'Session konnte nicht gespeichert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
      setIsSaving(false);
    }
  };

  const deleteSession = async (session: Session) => {
    const confirmed = await confirmAction({
      title: 'Session löschen?',
      message: `„${session.title}“ wird aus der Statistik entfernt. Unter Einstellungen › Sync lässt sie sich wiederherstellen.`,
      confirmLabel: 'Löschen',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteSessionEntry(session.id);
      closeEditor();
    } catch (error) {
      Alert.alert(
        'Session konnte nicht gelöscht werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    }
  };

  return (
    <Screen
      title="Statistik"
      headerRight={
        <CircleButton
          icon="add"
          label="Session nachtragen"
          variant="primary"
          onPress={() => setManualSheetVisible(true)}
        />
      }
    >
      <Segmented label="Zeitraum" options={PERIOD_OPTIONS} value={period} onChange={changePeriod} />

      <View style={styles.hero}>
        <View style={styles.rangeRow}>
          {range ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Früherer Zeitraum"
              onPress={() => setAnchor((current) => shiftStatsAnchor(period, current, -1))}
              style={styles.rangeArrow}
            >
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </Pressable>
          ) : null}
          <Text style={styles.rangeLabel}>{formatStatsRangeLabel(period, anchor, todayKey)}</Text>
          {range ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Späterer Zeitraum"
              accessibilityState={{ disabled: !canGoForward }}
              disabled={!canGoForward}
              onPress={() => setAnchor((current) => shiftStatsAnchor(period, current, 1))}
              style={[styles.rangeArrow, canGoForward ? null : styles.dimmed]}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </Pressable>
          ) : null}
        </View>
        <Text
          style={styles.total}
          adjustsFontSizeToFit
          numberOfLines={1}
          accessibilityLabel={`${Math.floor(summary.totalMinutes / 60)} Stunden ${summary.totalMinutes % 60} Minuten`}
        >
          {formatHoursClock(summary.totalMinutes)}
        </Text>
        <Text style={styles.totalDetail}>
          {period === 'day' || summary.activeDays === 0
            ? 'Stunden'
            : `Stunden · Ø ${formatHoursClock(summary.averageMinutesPerActiveDay)} je aktivem Tag · ${
                summary.activeDays === 1 ? '1 aktiver Tag' : `${summary.activeDays} aktive Tage`
              }`}
        </Text>
      </View>

      {bars.length > 0 ? (
        <Glass
          radius={30}
          style={styles.chart}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Fokuszeit je ${period === 'all' ? 'Monat' : 'Tag'}: ${
            bars
              .filter((bar) => bar.minutes > 0)
              .map((bar) => `${period === 'all' ? bar.key : formatShortDateLabel(bar.key)} ${formatHoursClock(bar.minutes)}`)
              .join(', ') || 'keine Einträge'
          }`}
        >
          {bars.map((bar) => (
            <View key={bar.key} style={styles.barColumn}>
              {bars.length <= 12 ? (
                <Text style={styles.barValue} numberOfLines={1}>
                  {bar.minutes > 0 ? formatHoursClock(bar.minutes) : ''}
                </Text>
              ) : null}
              <View style={styles.barArea}>
                <View
                  style={[
                    styles.bar,
                    bar.minutes > 0
                      ? { height: Math.max(4, Math.round((bar.minutes / maxBarMinutes) * BAR_AREA_HEIGHT)) }
                      : styles.barEmpty,
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, bar.isCurrent ? styles.barLabelCurrent : null]}>
                {bar.label}
              </Text>
            </View>
          ))}
        </Glass>
      ) : null}

      {summary.tags.length > 0 ? (
        <Glass radius={26} style={styles.tagPanel}>
          {summary.tags.map((entry) => {
            const tag = tagsById.get(entry.tagId);

            return (
              <View key={entry.tagId} style={styles.tagRow}>
                <View style={[styles.dot, { backgroundColor: tag?.color ?? colors.textMuted }]} />
                <Text style={styles.tagName} numberOfLines={1}>
                  {tag?.name ?? 'Ohne Tag'}
                </Text>
                <View style={styles.tagTrack}>
                  <View
                    style={[
                      styles.tagFill,
                      { width: `${Math.max(2, Math.round((entry.minutes / maxTagMinutes) * 100))}%` },
                    ]}
                  />
                </View>
                <Text style={styles.tagValue}>{formatHoursClock(entry.minutes)}</Text>
              </View>
            );
          })}
        </Glass>
      ) : null}

      {periodSessions.length === 0 ? (
        <EmptyState
          title="Keine Sessions in diesem Zeitraum"
          description="Abgeschlossene Sessions aus Timer und Stoppuhr erscheinen hier."
        />
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {periodSessions.length === 1 ? '1 Session' : `${periodSessions.length} Sessions`}
          </Text>
          <Glass radius={26}>
            {shownSessions.map((session, index) => {
              const tag = tagsById.get(session.tagId);

              return (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  accessibilityHint="Session bearbeiten"
                  onPress={() => openEditor(session)}
                  style={[styles.sessionRow, index > 0 ? styles.separated : null]}
                >
                  <View style={[styles.dot, { backgroundColor: tag?.color ?? colors.textMuted }]} />
                  <View style={styles.sessionCopy}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                      {session.title}
                    </Text>
                    <Text style={styles.sessionMeta} numberOfLines={1}>
                      {period === 'day' ? '' : `${formatShortDateLabel(session.date)} · `}
                      {formatTimeLabel(session.startTime)}–{formatTimeLabel(session.endTime)}
                    </Text>
                  </View>
                  <Text style={styles.sessionDuration}>{formatHoursClock(session.durationMinutes)}</Text>
                </Pressable>
              );
            })}
          </Glass>
          {periodSessions.length > SESSION_LIMIT && !showAllSessions ? (
            <Button
              label={`Alle ${periodSessions.length} anzeigen`}
              variant="secondary"
              onPress={() => setShowAllSessions(true)}
            />
          ) : null}
        </View>
      )}

      <ManualSessionSheet
        visible={manualSheetVisible}
        tags={tags}
        onClose={() => setManualSheetVisible(false)}
      />

      <ModalSheet
        visible={Boolean(editedSession)}
        title="Session bearbeiten"
        onClose={closeEditor}
        swipeToClose
      >
        {editedSession ? (
          <Text style={styles.editorMeta}>
            {formatShortDateLabel(editedSession.date)} · {formatTimeLabel(editedSession.startTime)}–
            {formatTimeLabel(editedSession.endTime)} · {formatHoursClock(editedSession.durationMinutes)} Std.
          </Text>
        ) : null}
        <TextField
          label="Name"
          value={titleInput}
          onChangeText={setTitleInput}
          placeholder="Session benennen"
        />
        <View style={styles.editorTags}>
          <Text style={styles.sectionTitle}>Tag</Text>
          <TagChips tags={tags} selectedTagId={tagInput} onSelect={setTagInput} />
        </View>
        <View style={styles.editorActions}>
          <View style={styles.editorAction}>
            <Button
              label="Löschen"
              variant="danger"
              onPress={() => {
                if (editedSession) {
                  void deleteSession(editedSession);
                }
              }}
            />
          </View>
          <View style={styles.editorAction}>
            <Button
              label="Sichern"
              onPress={() => void saveSession()}
              disabled={!titleInput.trim() || !tagInput || isSaving}
            />
          </View>
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = themedStyles(() => ({
  hero: {
    alignItems: 'center',
  },
  rangeRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rangeArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  total: {
    color: colors.textPrimary,
    fontSize: 84,
    lineHeight: 88,
    fontWeight: '700',
    letterSpacing: -4,
    fontVariant: ['tabular-nums'],
  },
  totalDetail: {
    paddingTop: 2,
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  dimmed: {
    opacity: 0.3,
  },
  chart: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barValue: {
    height: 14,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  barArea: {
    height: BAR_AREA_HEIGHT,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    paddingHorizontal: 1,
  },
  bar: {
    borderRadius: 6,
    backgroundColor: colors.textPrimary,
  },
  barEmpty: {
    height: 4,
    backgroundColor: colors.track,
  },
  barLabel: {
    minHeight: 16,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  barLabelCurrent: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  tagPanel: {
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  tagRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tagName: {
    width: 84,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  tagTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.track,
  },
  tagFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textPrimary,
  },
  tagValue: {
    minWidth: 44,
    textAlign: 'right',
    color: colors.textSecondary,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  section: {
    gap: 8,
    paddingTop: 4,
  },
  sectionTitle: {
    paddingHorizontal: 8,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  sessionRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  separated: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sessionCopy: {
    flex: 1,
    gap: 1,
  },
  sessionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  sessionMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  sessionDuration: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  editorMeta: {
    color: colors.textSecondary,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  editorTags: {
    gap: 8,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editorAction: {
    flex: 1,
  },
}));
