import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../src/components/ui/Button';
import { CircleButton } from '../../src/components/ui/CircleButton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Glass } from '../../src/components/ui/Glass';
import { Screen } from '../../src/components/ui/Screen';
import { Segmented } from '../../src/components/ui/Segmented';
import { colors } from '../../src/constants/colors';
import { routes } from '../../src/constants/routes';
import { useOpenSheet } from '../../src/hooks/useSheet';
import { useSessionsStore } from '../../src/store/sessionsStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { themedStyles } from '../../src/theme/runtime';
import {
  formatDateKey,
  formatShortDateLabel,
  formatTimeLabel,
  getTodayDateKey,
  parseDateKey,
} from '../../src/utils/date';
import {
  StatsPeriod,
  StatsBar,
  buildStatsBars,
  comparePreviousPeriod,
  computeFocusStreak,
  filterSessionsByRange,
  formatHoursClock,
  formatPeriodComparison,
  formatStatsRangeLabel,
  getStatsRange,
  shiftStatsAnchor,
  summarizeSessions,
} from '../../src/utils/stats';
import { isTagCompleted } from '../../src/utils/tagGroups';

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Tag' },
  { value: 'week', label: 'Woche' },
  { value: 'month', label: 'Monat' },
  { value: 'all', label: 'Gesamt' },
] as const;

const BAR_AREA_HEIGHT = 88;

/** Kurzform für die schmalen Monatsbalken, z. B. `12h` oder `45m`. */
const formatBarHours = (minutes: number): string =>
  minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`;
const SESSION_LIMIT = 30;

export default function StatsScreen() {
  const openSheet = useOpenSheet();
  const sessions = useSessionsStore((state) => state.sessions);
  const tags = useTagsStore((state) => state.tags);
  const tagGroups = useSettingsStore((state) => state.tagGroups);
  const goalHours = useSettingsStore((state) => state.notificationPreferences.dailyFocusGoalHours);
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [showCompletedTags, setShowCompletedTags] = useState(false);

  const todayKey = getTodayDateKey();
  const anchorKey = useMemo(() => formatDateKey(anchor), [anchor]);
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
  const { activeTagEntries, completedTagEntries, completedTagMinutes } = useMemo(() => {
    const active = summary.tags.filter(
      (entry) => !isTagCompleted(tagsById.get(entry.tagId), tagGroups),
    );
    const completed = summary.tags.filter((entry) =>
      isTagCompleted(tagsById.get(entry.tagId), tagGroups),
    );
    const completedMinutes = completed.reduce((sum, entry) => sum + entry.minutes, 0);

    return {
      activeTagEntries: active,
      completedTagEntries: completed,
      completedTagMinutes: completedMinutes,
    };
  }, [summary.tags, tagGroups, tagsById]);
  const bars = useMemo(
    () => buildStatsBars(period, anchor, period === 'all' ? sessions : periodSessions, todayKey),
    [anchor, period, periodSessions, sessions, todayKey],
  );
  const maxBarMinutes = Math.max(1, ...bars.map((bar) => bar.minutes));
  const maxTagMinutes = Math.max(1, ...summary.tags.map((entry) => entry.minutes));
  const canGoForward = range !== null && range.endKey < todayKey;
  const streak = useMemo(() => computeFocusStreak(sessions, todayKey), [sessions, todayKey]);
  const comparison = useMemo(() => {
    const result = comparePreviousPeriod(period, anchor, sessions, summary.totalMinutes, todayKey);
    return result ? { text: formatPeriodComparison(result), up: (result.changePercent ?? 0) > 0 } : null;
  }, [anchor, period, sessions, summary.totalMinutes, todayKey]);
  const goalMinutes = goalHours ? goalHours * 60 : null;
  const shownSessions = showAllSessions ? periodSessions : periodSessions.slice(0, SESSION_LIMIT);

  const changePeriod = (next: StatsPeriod) => {
    setPeriod(next);
    setAnchor(new Date());
    setShowAllSessions(false);
  };

  // Ein Balken führt eine Ebene tiefer: vom Wochen- oder Monatsbalken in den
  // Tag, vom Monatsbalken der Gesamtansicht in den Monat.
  const openBar = (bar: StatsBar) => {
    if (period === 'all') {
      const [year, month] = bar.key.split('-').map(Number);
      setPeriod('month');
      setAnchor(new Date(year, month - 1, 1, 12));
    } else {
      setPeriod('day');
      setAnchor(parseDateKey(bar.key));
    }

    setShowAllSessions(false);
  };

  const renderTagRow = (entry: (typeof summary.tags)[number]) => {
    const tag = tagsById.get(entry.tagId);

    return (
      <Pressable
        key={entry.tagId}
        accessibilityRole="button"
        accessibilityHint="Zeit nach Aufgaben anzeigen"
        onPress={() => openSheet(routes.statsTagSheet(entry.tagId, period, anchorKey))}
        style={({ pressed }) => [styles.tagRow, pressed ? styles.tagRowPressed : null]}
      >
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
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      </Pressable>
    );
  };

  return (
    <Screen
      title="Statistik"
      headerRight={
        <CircleButton
          icon="add"
          label="Session nachtragen"
          variant="primary"
          onPress={() => openSheet(routes.manualSessionSheet)}
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
          {period === 'day'
            ? goalMinutes
              ? `Stunden · Ziel ${formatHoursClock(goalMinutes)} · ${Math.round(
                  (summary.totalMinutes / goalMinutes) * 100,
                )} %`
              : 'Stunden'
            : summary.activeDays === 0
              ? 'Stunden'
              : `Stunden · Ø ${formatHoursClock(summary.averageMinutesPerActiveDay)} je aktivem Tag · ${
                  summary.activeDays === 1 ? '1 aktiver Tag' : `${summary.activeDays} aktive Tage`
                }`}
        </Text>
        {comparison?.text || streak >= 2 ? (
          <View style={styles.badges}>
            {comparison?.text ? (
              <View style={styles.badge}>
                <Ionicons
                  name={comparison.up ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={comparison.up ? colors.success : colors.textSecondary}
                />
                <Text style={styles.badgeLabel}>{comparison.text}</Text>
              </View>
            ) : null}
            {streak >= 2 ? (
              <View style={styles.badge} accessibilityLabel={`Serie: ${streak} Tage in Folge fokussiert`}>
                <Ionicons name="flame" size={14} color={colors.warning} />
                <Text style={styles.badgeLabel}>{streak} Tage in Folge</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {bars.length > 0 ? (
        <Glass radius={30} style={styles.chart}>
          {bars.map((bar) => (
            <Pressable
              key={bar.key}
              accessibilityRole="button"
              accessibilityLabel={`${period === 'all' ? bar.key : formatShortDateLabel(bar.key)}: ${formatHoursClock(bar.minutes)} Stunden`}
              accessibilityHint={period === 'all' ? 'Monat anzeigen' : 'Tag anzeigen'}
              disabled={period !== 'all' && bar.key > todayKey}
              onPress={() => openBar(bar)}
              style={({ pressed }) => [styles.barColumn, pressed ? styles.barPressed : null]}
            >
              {period === 'month' ? null : (
                <Text style={styles.barValue} numberOfLines={1}>
                  {bar.minutes === 0
                    ? ''
                    : period === 'all'
                      ? formatBarHours(bar.minutes)
                      : formatHoursClock(bar.minutes)}
                </Text>
              )}
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
              <Text
                style={[
                  styles.barLabel,
                  period === 'all' ? styles.barLabelDense : null,
                  bar.isCurrent ? styles.barLabelCurrent : null,
                ]}
                numberOfLines={1}
              >
                {bar.label}
              </Text>
            </Pressable>
          ))}
        </Glass>
      ) : null}

      {summary.tags.length > 0 ? (
        <Glass radius={26} style={styles.tagPanel}>
          {activeTagEntries.map(renderTagRow)}
          {completedTagEntries.length > 0 ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showCompletedTags }}
                onPress={() => setShowCompletedTags((value) => !value)}
                style={[
                  styles.tagRow,
                  activeTagEntries.length > 0 ? styles.separated : null,
                ]}
              >
                <Ionicons
                  name={showCompletedTags ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.completedTagToggleLabel} numberOfLines={1}>
                  Abgeschlossen · {completedTagEntries.length}
                </Text>
                <Text style={styles.tagValue}>{formatHoursClock(completedTagMinutes)}</Text>
              </Pressable>
              {showCompletedTags ? completedTagEntries.map(renderTagRow) : null}
            </>
          ) : null}
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
                  onPress={() => openSheet(routes.sessionSheet(session.id))}
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
    width: '100%',
    color: colors.textPrimary,
    fontSize: 84,
    lineHeight: 88,
    fontWeight: '700',
    letterSpacing: -4,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
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
  barPressed: {
    opacity: 0.6,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 10,
  },
  badge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: colors.surfaceElevated,
  },
  badgeLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  // Wert und Beschriftung sind breiter als ein schmaler Balken. Die feste Breite
  // lässt sie mittig über die Spalte hinausragen, statt umzubrechen.
  barValue: {
    width: 40,
    textAlign: 'center',
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
    width: 34,
    textAlign: 'center',
    minHeight: 16,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  barLabelDense: {
    fontSize: 11,
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
  tagRowPressed: {
    opacity: 0.6,
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
  completedTagToggleLabel: {
    flex: 1,
    color: colors.textSecondary,
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
}));
