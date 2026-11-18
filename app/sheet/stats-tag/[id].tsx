import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Sheet } from '../../../src/components/ui/Sheet';
import { colors } from '../../../src/constants/colors';
import { useSessionsStore } from '../../../src/store/sessionsStore';
import { useSettingsStore } from '../../../src/store/settingsStore';
import { useTagsStore } from '../../../src/store/tagsStore';
import { useTasksStore } from '../../../src/store/tasksStore';
import { themedStyles } from '../../../src/theme/runtime';
import { getTodayDateKey, parseDateKey } from '../../../src/utils/date';
import {
  StatsPeriod,
  filterSessionsByRange,
  formatHoursClock,
  formatStatsRangeLabel,
  getStatsRange,
  summarizeTagTasks,
} from '../../../src/utils/stats';
import { formatTagWithGroup } from '../../../src/utils/tagGroups';

const isStatsPeriod = (value: string | undefined): value is StatsPeriod =>
  value === 'day' || value === 'week' || value === 'month' || value === 'all';

/**
 * Zeigt die Fokuszeit eines Tags im gewählten Zeitraum aufgeschlüsselt nach Aufgaben.
 */
export default function StatsTagSheet() {
  const params = useLocalSearchParams<{ id?: string; period?: string; anchor?: string }>();
  const tagId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  const rawPeriod = Array.isArray(params.period) ? params.period[0] : params.period;
  const rawAnchor = Array.isArray(params.anchor) ? params.anchor[0] : params.anchor;
  const period: StatsPeriod = isStatsPeriod(rawPeriod) ? rawPeriod : 'week';

  const sessions = useSessionsStore((state) => state.sessions);
  const tags = useTagsStore((state) => state.tags);
  const tagGroups = useSettingsStore((state) => state.tagGroups);
  const tasks = useTasksStore((state) => state.tasks);

  const todayKey = getTodayDateKey();
  const anchor = useMemo(
    () => (rawAnchor && /^\d{4}-\d{2}-\d{2}$/.test(rawAnchor) ? parseDateKey(rawAnchor) : new Date()),
    [rawAnchor],
  );
  const tag = useMemo(() => tags.find((entry) => entry.id === tagId), [tagId, tags]);
  const taskTitlesById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task.title])),
    [tasks],
  );
  const range = useMemo(() => getStatsRange(period, anchor), [anchor, period]);
  const taskEntries = useMemo(() => {
    const periodSessions = filterSessionsByRange(sessions, range);
    return summarizeTagTasks(periodSessions, tagId, taskTitlesById);
  }, [range, sessions, tagId, taskTitlesById]);

  const totalMinutes = useMemo(
    () => taskEntries.reduce((sum, entry) => sum + entry.minutes, 0),
    [taskEntries],
  );
  const maxMinutes = Math.max(1, ...taskEntries.map((entry) => entry.minutes));
  const title = tag ? formatTagWithGroup(tag, tagGroups) : 'Ohne Tag';
  const rangeLabel = formatStatsRangeLabel(period, anchor, todayKey);
  const dotColor = tag?.color ?? colors.textMuted;

  return (
    <Sheet title={title} maxBodyHeightRatio={0.6}>
      <View style={styles.summaryRow}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.meta} numberOfLines={1}>
          {rangeLabel}
        </Text>
        <Text style={styles.totalValue}>{formatHoursClock(totalMinutes)} Std.</Text>
      </View>

      {taskEntries.length === 0 ? (
        <Text style={styles.empty}>Keine Sessions für diesen Tag im gewählten Zeitraum.</Text>
      ) : (
        <View>
          {taskEntries.map((entry, index) => (
            <View
              key={entry.key}
              style={[styles.taskRow, index > 0 ? styles.taskRowSeparated : null]}
            >
              <View style={styles.taskHeader}>
                <View style={styles.taskCopy}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <Text style={styles.taskMeta}>
                    {entry.sessionCount === 1 ? '1 Session' : `${entry.sessionCount} Sessions`}
                  </Text>
                </View>
                <Text style={styles.taskValue}>{formatHoursClock(entry.minutes)}</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.max(2, Math.round((entry.minutes / maxMinutes) * 100))}%`,
                      backgroundColor: dotColor,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const styles = themedStyles(() => ({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  meta: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  totalValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 15,
    paddingVertical: 8,
  },
  taskRow: {
    paddingVertical: 10,
    gap: 8,
  },
  taskRowSeparated: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  taskCopy: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  taskMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  taskValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
}));
