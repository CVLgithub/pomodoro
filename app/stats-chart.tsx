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

const CHART_HEIGHT = 220;
const WEEK_BAR_WIDTH = 34;
const MONTH_BAR_WIDTH = 20;
const FALLBACK_TAG_COLOR = '#6C7687';

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
  const currentMonthKey = formatDateKey(getMonthStart(new Date()));
  const selectedMonthKey = formatDateKey(monthAnchor);
  const canGoToNextMonth = selectedMonthKey < currentMonthKey;

  const chartData = useMemo(() => {
    const { dateKeys } = getChartRange(range, monthAnchor);
    const dateKeySet = new Set(dateKeys);
    const tagById = Object.fromEntries(tags.map((tag) => [tag.id, tag]));

    const sessionsInRange = sessions.filter((session) => dateKeySet.has(session.date));
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

    const usedTagIds = new Set(
      days.flatMap((day) => day.segments.map((segment) => segment.tagId)),
    );

    return {
      days,
      sessionsInRange,
      activeTags: tags.filter((tag) => usedTagIds.has(tag.id)),
      totalMinutes: days.reduce((sum, day) => sum + day.totalMinutes, 0),
      maxMinutes: Math.max(...days.map((day) => day.totalMinutes), 0),
      activeDays: days.filter((day) => day.totalMinutes > 0).length,
    };
  }, [monthAnchor, range, sessions, tags]);

  const barWidth = range === 'week' ? WEEK_BAR_WIDTH : MONTH_BAR_WIDTH;
  const monthLabel = monthLabelFormatter.format(monthAnchor);

  return (
    <Screen
      title="Statistik Diagramm"
      subtitle="Tagesbalken nach Tags fuer die aktuelle Woche oder einen ausgewaehlten Monat."
      headerRight={<Button label="Zurueck" variant="ghost" onPress={() => router.back()} />}
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
              <Text style={styles.monthNavButtonLabel}>Zurueck</Text>
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
        <StatSummaryCard label="Gesamt" value={formatMinutesShort(chartData.totalMinutes)} />
        <StatSummaryCard label="Aktive Tage" value={String(chartData.activeDays)} />
        <StatSummaryCard
          label="Max / Tag"
          value={formatMinutesShort(chartData.maxMinutes)}
        />
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
            description="Sobald in diesem Zeitraum Fokus-Sessions vorhanden sind, erscheinen hier gestapelte Tagesbalken."
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

      {chartData.activeTags.length > 0 ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>Legende</Text>
          <View style={styles.legendGrid}>
            {chartData.activeTags.map((tag) => (
              <View key={tag.id} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: tag.color }]} />
                <Text style={styles.legendLabel}>{tag.name}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
    backgroundColor: 'rgba(108, 118, 135, 0.12)',
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
});
