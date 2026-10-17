import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { StatSummaryCard } from '../src/components/stats/StatSummaryCard';
import { EmptyState } from '../src/components/ui/EmptyState';
import { Screen } from '../src/components/ui/Screen';
import { SectionCard } from '../src/components/ui/SectionCard';
import { Button } from '../src/components/ui/Button';
import { colors } from '../src/constants/colors';
import { radii, spacing } from '../src/constants/spacing';
import { useSessionsStore } from '../src/store/sessionsStore';
import { useTagsStore } from '../src/store/tagsStore';
import { getMonthStart, getWeekStart, formatDateKey } from '../src/utils/date';
import { formatMinutesShort } from '../src/utils/duration';
import { compareTagGroupNames, getTagGroupKey, getTagGroupLabel } from '../src/utils/tagGroups';

type ChartRange = 'week' | 'month';

type ChartSegment = {
  tagId: string;
  label: string;
  color: string;
  minutes: number;
};

type ChartDay = {
  date: string;
  totalMinutes: number;
  segments: ChartSegment[];
};

type TagStat = {
  tagId: string;
  label: string;
  color: string;
  groupName: string | null;
  groupLabel: string;
  totalMinutes: number;
  activeDays: number;
};

type GroupStat = {
  groupKey: string;
  label: string;
  color: string;
  totalMinutes: number;
  activeDays: number;
  tagCount: number;
};

const CHART_HEIGHT = 220;
const WEEK_BAR_WIDTH = 34;
const MONTH_BAR_WIDTH = 20;
const FALLBACK_TAG_COLOR = '#6B7280';

const dayLabelFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });
const dateLabelFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' });
const monthLabelFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });

const buildDateKeys = (start: Date, end: Date): string[] => {
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  const finalDate = new Date(end);
  finalDate.setHours(0, 0, 0, 0);

  const keys: string[] = [];

  while (cursor.getTime() <= finalDate.getTime()) {
    keys.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
};

const getMonthEnd = (value: Date): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() + 1, 0);
  return date;
};

const addMonths = (value: Date, amount: number): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  return date;
};

const getChartRange = (range: ChartRange, monthAnchor: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (range === 'week') {
    const start = getWeekStart(today);

    return {
      start,
      end: today,
      dateKeys: buildDateKeys(start, today),
    };
  }

  const start = getMonthStart(monthAnchor);
  const end = getMonthEnd(monthAnchor);

  return {
    start,
    end,
    dateKeys: buildDateKeys(start, end),
  };
};

const formatDayLabel = (dateKey: string): string => {
  const label = dayLabelFormatter.format(new Date(`${dateKey}T00:00:00`));
  return label.replace('.', '');
};

const formatDateLabel = (dateKey: string): string =>
  dateLabelFormatter.format(new Date(`${dateKey}T00:00:00`));

export default function StatsChartScreen() {
  const router = useRouter();
  const sessions = useSessionsStore((state) => state.sessions);
  const tags = useTagsStore((state) => state.tags);
  const [range, setRange] = useState<ChartRange>('week');
  const [monthAnchor, setMonthAnchor] = useState(() => getMonthStart(new Date()));
  const [showAllTimeTagDetails, setShowAllTimeTagDetails] = useState(false);
  const currentMonthKey = formatDateKey(getMonthStart(new Date()));
  const selectedMonthKey = formatDateKey(monthAnchor);
  const canGoToNextMonth = selectedMonthKey < currentMonthKey;

  const chartData = useMemo(() => {
    const { dateKeys } = getChartRange(range, monthAnchor);
    const dateKeySet = new Set(dateKeys);
    const tagById = Object.fromEntries(tags.map((tag) => [tag.id, tag]));
    const totalsByTagInRange = new Map<string, { minutes: number; activeDates: Set<string> }>();

    const sessionsInRange = sessions.filter((session) => dateKeySet.has(session.date));
    sessionsInRange.forEach((session) => {
      if (session.durationMinutes <= 0) {
        return;
      }

      const entry = totalsByTagInRange.get(session.tagId) ?? {
        minutes: 0,
        activeDates: new Set<string>(),
      };

      entry.minutes += session.durationMinutes;
      entry.activeDates.add(session.date);
      totalsByTagInRange.set(session.tagId, entry);
    });

    const days: ChartDay[] = dateKeys.map((dateKey) => {
      const totalsByTag = new Map<string, number>();

      sessionsInRange.forEach((session) => {
        if (session.date !== dateKey) {
          return;
        }

        totalsByTag.set(session.tagId, (totalsByTag.get(session.tagId) ?? 0) + session.durationMinutes);
      });

      const segments = Array.from(totalsByTag.entries())
        .map(([tagId, minutes]) => {
          const tag = tagById[tagId];

          return {
            tagId,
            minutes,
            label: tag?.name ?? 'Unbekannt',
            color: tag?.color ?? FALLBACK_TAG_COLOR,
          };
        })
        .sort((left, right) => right.minutes - left.minutes);

      return {
        date: dateKey,
        totalMinutes: segments.reduce((sum, segment) => sum + segment.minutes, 0),
        segments,
      };
    });

    const tagStats: TagStat[] = Array.from(totalsByTagInRange.entries())
      .map(([tagId, entry]) => {
        const tag = tagById[tagId];
        const groupName = tag?.groupName ?? null;

        return {
          tagId,
          label: tag?.name ?? 'Unbekannt',
          color: tag?.color ?? FALLBACK_TAG_COLOR,
          groupName,
          groupLabel: getTagGroupLabel(groupName),
          totalMinutes: entry.minutes,
          activeDays: entry.activeDates.size,
        };
      })
      .sort((left, right) => {
        if (right.totalMinutes !== left.totalMinutes) {
          return right.totalMinutes - left.totalMinutes;
        }

        if (right.activeDays !== left.activeDays) {
          return right.activeDays - left.activeDays;
        }

        return left.label.localeCompare(right.label, 'de-DE');
      });

    return {
      days,
      sessionsInRange,
      tagStats,
      totalMinutes: days.reduce((sum, day) => sum + day.totalMinutes, 0),
      maxMinutes: Math.max(...days.map((day) => day.totalMinutes), 0),
      activeDays: days.filter((day) => day.totalMinutes > 0).length,
    };
  }, [monthAnchor, range, sessions, tags]);

  const averageMinutesPerActiveDay =
    chartData.activeDays > 0 ? Math.round(chartData.totalMinutes / chartData.activeDays) : 0;
  const allTimeData = useMemo(() => {
    const tagById = Object.fromEntries(tags.map((tag) => [tag.id, tag]));
    const activeDates = new Set<string>();
    const totalsByTag = new Map<string, { minutes: number; activeDates: Set<string> }>();
    const totalsByGroup = new Map<
      string,
      {
        label: string;
        minutes: number;
        activeDates: Set<string>;
        tagIds: Set<string>;
        tagMinutes: Map<string, number>;
      }
    >();

    sessions.forEach((session) => {
      if (session.durationMinutes <= 0) {
        return;
      }

      activeDates.add(session.date);
      const tag = tagById[session.tagId];

      const entry = totalsByTag.get(session.tagId) ?? {
        minutes: 0,
        activeDates: new Set<string>(),
      };

      entry.minutes += session.durationMinutes;
      entry.activeDates.add(session.date);
      totalsByTag.set(session.tagId, entry);

      const groupKey = getTagGroupKey(tag?.groupName);
      const groupEntry = totalsByGroup.get(groupKey) ?? {
        label: getTagGroupLabel(tag?.groupName),
        minutes: 0,
        activeDates: new Set<string>(),
        tagIds: new Set<string>(),
        tagMinutes: new Map<string, number>(),
      };

      groupEntry.minutes += session.durationMinutes;
      groupEntry.activeDates.add(session.date);
      groupEntry.tagIds.add(session.tagId);
      groupEntry.tagMinutes.set(
        session.tagId,
        (groupEntry.tagMinutes.get(session.tagId) ?? 0) + session.durationMinutes,
      );
      totalsByGroup.set(groupKey, groupEntry);
    });

    const tagStats: TagStat[] = Array.from(totalsByTag.entries())
      .map(([tagId, entry]) => {
        const tag = tagById[tagId];
        const groupName = tag?.groupName ?? null;

        return {
          tagId,
          label: tag?.name ?? 'Unbekannt',
          color: tag?.color ?? FALLBACK_TAG_COLOR,
          groupName,
          groupLabel: getTagGroupLabel(groupName),
          totalMinutes: entry.minutes,
          activeDays: entry.activeDates.size,
        };
      })
      .sort((left, right) => {
        const groupCompare = compareTagGroupNames(left.groupName, right.groupName);

        if (groupCompare !== 0) {
          return groupCompare;
        }

        if (right.totalMinutes !== left.totalMinutes) {
          return right.totalMinutes - left.totalMinutes;
        }

        if (right.activeDays !== left.activeDays) {
          return right.activeDays - left.activeDays;
        }

        return left.label.localeCompare(right.label, 'de-DE');
      });

    const groupStats: GroupStat[] = Array.from(totalsByGroup.entries())
      .map(([groupKey, entry]) => {
        let dominantTagId: string | null = null;
        let dominantTagMinutes = -1;

        entry.tagMinutes.forEach((minutes, tagId) => {
          if (minutes > dominantTagMinutes) {
            dominantTagId = tagId;
            dominantTagMinutes = minutes;
          }
        });

        const dominantTag = dominantTagId ? tagById[dominantTagId] : undefined;

        return {
          groupKey,
          label: entry.label,
          color: dominantTag?.color ?? FALLBACK_TAG_COLOR,
          totalMinutes: entry.minutes,
          activeDays: entry.activeDates.size,
          tagCount: entry.tagIds.size,
        };
      })
      .sort((left, right) => {
        if (right.totalMinutes !== left.totalMinutes) {
          return right.totalMinutes - left.totalMinutes;
        }

        if (right.activeDays !== left.activeDays) {
          return right.activeDays - left.activeDays;
        }

        return left.label.localeCompare(right.label, 'de-DE');
      });

    const totalMinutes = tagStats.reduce((sum, tag) => sum + tag.totalMinutes, 0);
    const activeDays = activeDates.size;

    return {
      totalMinutes,
      activeDays,
      averageMinutesPerActiveDay: activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0,
      groupStats,
      tagStats,
    };
  }, [sessions, tags]);

  const barWidth = range === 'week' ? WEEK_BAR_WIDTH : MONTH_BAR_WIDTH;
  const monthLabel = monthLabelFormatter.format(monthAnchor);

  return (
    <Screen
      title="Statistik Diagramm"
      subtitle="Tagesbalken nach Tags für Woche oder Monat."
      headerRight={<Button label="Zurück" variant="ghost" onPress={() => router.back()} />}
    >
      <SectionCard>
        <View style={styles.rangeHeader}>
          <Text style={styles.sectionTitle}>Zeitraum</Text>
          <View style={styles.rangeToggle}>
            <Pressable
              onPress={() => setRange('week')}
              style={[styles.rangeButton, range === 'week' ? styles.rangeButtonActive : null]}
            >
              <Text
                style={[
                  styles.rangeButtonLabel,
                  range === 'week' ? styles.rangeButtonLabelActive : null,
                ]}
              >
                Woche
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setRange('month')}
              style={[styles.rangeButton, range === 'month' ? styles.rangeButtonActive : null]}
            >
              <Text
                style={[
                  styles.rangeButtonLabel,
                  range === 'month' ? styles.rangeButtonLabelActive : null,
                ]}
              >
                Monat
              </Text>
            </Pressable>
          </View>
        </View>
        {range === 'month' ? (
          <View style={styles.monthSelector}>
            <Pressable
              onPress={() => setMonthAnchor((current) => addMonths(current, -1))}
              style={styles.monthNavButton}
            >
              <Text style={styles.monthNavButtonLabel}>Zurück</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable
              disabled={!canGoToNextMonth}
              onPress={() => setMonthAnchor((current) => addMonths(current, 1))}
              style={[
                styles.monthNavButton,
                !canGoToNextMonth ? styles.monthNavButtonDisabled : null,
              ]}
            >
              <Text
                style={[
                  styles.monthNavButtonLabel,
                  !canGoToNextMonth ? styles.monthNavButtonLabelDisabled : null,
                ]}
              >
                Weiter
              </Text>
            </Pressable>
          </View>
        ) : null}
      </SectionCard>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryWideCard}>
            <StatSummaryCard label="Gesamt" value={formatMinutesShort(chartData.totalMinutes)} />
          </View>
          <View style={styles.summaryNarrowCard}>
            <StatSummaryCard
              label="Tage"
              value={String(chartData.activeDays)}
              style={styles.summaryCompactStatCard}
            />
          </View>
        </View>
        <View style={styles.summaryBottomRow}>
          <View style={styles.summaryHalfCard}>
            <StatSummaryCard
              label="Durchschnitt"
              value={formatMinutesShort(averageMinutesPerActiveDay)}
            />
          </View>
          <View style={styles.summaryHalfCard}>
            <StatSummaryCard
              label="Max / Tag"
              value={formatMinutesShort(chartData.maxMinutes)}
            />
          </View>
        </View>
      </View>

      <SectionCard>
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitle}>Balkendiagramm</Text>
          <Text style={styles.scaleHint}>
            Skala bis {formatMinutesShort(chartData.maxMinutes || 0)}
          </Text>
        </View>

        {chartData.sessionsInRange.length === 0 ? (
          <EmptyState
            title="Keine Sessions im Zeitraum"
            description="Sobald in diesem Zeitraum Sessions vorhanden sind, erscheinen hier gestapelte Tagesbalken."
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollContent}
          >
            {chartData.days.map((day) => (
              <View key={day.date} style={[styles.barColumn, { width: barWidth }]}>
                <Text style={styles.barTotal}>
                  {day.totalMinutes > 0 ? formatMinutesShort(day.totalMinutes) : '0 min'}
                </Text>
                <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                  {day.totalMinutes > 0 && chartData.maxMinutes > 0 ? (
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max((day.totalMinutes / chartData.maxMinutes) * 100, 4)}%`,
                        },
                      ]}
                    >
                      {day.segments.map((segment, index) => (
                        <View
                          key={`${day.date}-${segment.tagId}`}
                          style={[
                            styles.segment,
                            { backgroundColor: segment.color, flex: segment.minutes },
                            index === 0 ? styles.segmentTop : null,
                            index === day.segments.length - 1 ? styles.segmentBottom : null,
                          ]}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyBar} />
                  )}
                </View>
                <Text style={styles.dayLabel}>{formatDayLabel(day.date)}</Text>
                <Text style={styles.dateLabel}>{formatDateLabel(day.date)}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </SectionCard>

      {chartData.days.length > 0 ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>Legende</Text>
          {chartData.tagStats.length > 0 ? (
            <View style={styles.legendGrid}>
              {chartData.tagStats.map((tag) => (
                <View key={tag.tagId} style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: tag.color }]} />
                  <Text style={styles.legendLabel}>{tag.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.supportText}>Im ausgewählten Zeitraum gibt es noch keine Einträge.</Text>
          )}

          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Zeit nach Tags</Text>
            {chartData.tagStats.length > 0 ? (
              <View style={styles.tagStatsList}>
                {chartData.tagStats.map((tag, index) => (
                  <View
                    key={`range-${tag.tagId}`}
                    style={[
                      styles.tagStatsRow,
                      index < chartData.tagStats.length - 1 ? styles.tagStatsRowBorder : null,
                    ]}
                  >
                    <View style={styles.tagStatsInfo}>
                      <View style={[styles.legendSwatch, { backgroundColor: tag.color }]} />
                      <Text style={styles.tagStatsLabel}>{tag.label}</Text>
                    </View>
                    <Text style={styles.tagStatsValue}>{formatMinutesShort(tag.totalMinutes)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.supportText}>
                Für den ausgewählten Zeitraum gibt es noch keine Zeit pro Tag.
              </Text>
            )}
          </View>
        </SectionCard>
      ) : null}

      <View style={styles.allTimeDivider}>
        <View style={styles.allTimeDividerLine} />
        <Text style={styles.allTimeDividerLabel}>Allzeit-Statistik</Text>
        <View style={styles.allTimeDividerLine} />
      </View>

      <SectionCard>
        <View style={styles.allTimeSummaryGrid}>
          <View style={styles.summaryHalfCard}>
            <StatSummaryCard
              label="Gesamtzeit"
              value={formatMinutesShort(allTimeData.totalMinutes)}
            />
          </View>
          <View style={styles.summaryHalfCard}>
            <StatSummaryCard
              label="Aktive Tage"
              value={String(allTimeData.activeDays)}
            />
          </View>
        </View>

        <View style={styles.allTimeAverageCard}>
          <StatSummaryCard
            label="Durchschnitt / Tag"
            value={formatMinutesShort(allTimeData.averageMinutesPerActiveDay)}
          />
        </View>

        <View style={styles.subsection}>
          <View style={styles.subsectionHeader}>
            <Text style={styles.subsectionTitle}>Zeit nach Tag-Gruppen</Text>
            {allTimeData.tagStats.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAllTimeTagDetails((currentValue) => !currentValue)}
                style={[
                  styles.advancedToggle,
                  showAllTimeTagDetails ? styles.advancedToggleActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.advancedToggleLabel,
                    showAllTimeTagDetails ? styles.advancedToggleLabelActive : null,
                  ]}
                >
                  {showAllTimeTagDetails ? 'Weniger' : 'Erweitert'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {allTimeData.groupStats.length > 0 ? (
            <View style={styles.tagStatsList}>
              {allTimeData.groupStats.map((group, index) => (
                <View
                  key={group.groupKey}
                  style={[
                    styles.tagStatsRow,
                    index < allTimeData.groupStats.length - 1 ? styles.tagStatsRowBorder : null,
                  ]}
                >
                  <View style={styles.tagStatsInfo}>
                    <View style={[styles.legendSwatch, { backgroundColor: group.color }]} />
                    <View style={styles.tagStatsText}>
                      <Text style={styles.tagStatsLabel}>{group.label}</Text>
                      <Text style={styles.tagStatsMeta}>
                        {group.tagCount} {group.tagCount === 1 ? 'Tag' : 'Tags'} - {group.activeDays}{' '}
                        {group.activeDays === 1 ? 'aktiver Tag' : 'aktive Tage'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.tagStatsValue}>{formatMinutesShort(group.totalMinutes)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              title="Noch keine Allzeit-Daten"
              description="Sobald Sessions vorhanden sind, erscheinen hier die Gesamtwerte nach Tag-Gruppen."
            />
          )}

          {showAllTimeTagDetails && allTimeData.tagStats.length > 0 ? (
            <View style={styles.advancedTagStats}>
              <Text style={styles.advancedTagStatsTitle}>Einzelne Tags</Text>
              <View style={styles.tagStatsList}>
                {allTimeData.tagStats.map((tag, index) => (
                  <View
                    key={tag.tagId}
                    style={[
                      styles.tagStatsRow,
                      index < allTimeData.tagStats.length - 1 ? styles.tagStatsRowBorder : null,
                    ]}
                  >
                    <View style={styles.tagStatsInfo}>
                      <View style={[styles.legendSwatch, { backgroundColor: tag.color }]} />
                      <View style={styles.tagStatsText}>
                        <Text style={styles.tagStatsLabel}>{tag.label}</Text>
                        <Text style={styles.tagStatsMeta}>
                          {tag.groupLabel} - {tag.activeDays}{' '}
                          {tag.activeDays === 1 ? 'aktiver Tag' : 'aktive Tage'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.tagStatsValue}>{formatMinutesShort(tag.totalMinutes)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  rangeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  rangeButton: {
    minWidth: 88,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  rangeButtonActive: {
    backgroundColor: colors.accent,
  },
  rangeButtonLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  rangeButtonLabelActive: {
    color: colors.background,
  },
  supportText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  monthNavButton: {
    minWidth: 92,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  monthNavButtonDisabled: {
    opacity: 0.45,
  },
  monthNavButtonLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  monthNavButtonLabelDisabled: {
    color: colors.textMuted,
  },
  monthLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  summaryGrid: {
    gap: spacing.md,
  },
  summaryTopRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryBottomRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryWideCard: {
    flex: 3,
    minWidth: 0,
  },
  summaryNarrowCard: {
    flex: 1,
    minWidth: 0,
  },
  summaryHalfCard: {
    flex: 1,
    minWidth: 0,
  },
  summaryCompactStatCard: {
    minWidth: 0,
    paddingHorizontal: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  scaleHint: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  chartScrollContent: {
    paddingTop: spacing.md,
    paddingRight: spacing.md,
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  barColumn: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  barTotal: {
    minHeight: 34,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  barTrack: {
    width: '100%',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'flex-end',
    padding: 3,
  },
  barFill: {
    width: '100%',
    borderRadius: radii.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    gap: 1,
  },
  segment: {
    width: '100%',
  },
  segmentTop: {
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
  },
  segmentBottom: {
    borderBottomLeftRadius: radii.sm,
    borderBottomRightRadius: radii.sm,
  },
  emptyBar: {
    width: '100%',
    minHeight: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(107, 114, 128, 0.12)',
  },
  dayLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
  },
  legendLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  subsection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  subsectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  subsectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  advancedToggle: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
  },
  advancedToggleActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  advancedToggleLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  advancedToggleLabelActive: {
    color: colors.textPrimary,
  },
  advancedTagStats: {
    gap: spacing.sm,
  },
  advancedTagStatsTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  allTimeDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  allTimeDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  allTimeDividerLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  allTimeSummaryGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  allTimeAverageCard: {
    marginTop: spacing.md,
  },
  tagStatsList: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  tagStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  tagStatsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tagStatsInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tagStatsText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  tagStatsLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  tagStatsMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  tagStatsValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
