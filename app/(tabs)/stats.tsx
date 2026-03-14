import { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { SessionDayGroup } from '../../src/components/stats/SessionDayGroup';
import { StatSummaryCard } from '../../src/components/stats/StatSummaryCard';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Screen } from '../../src/components/ui/Screen';
import { useSessionsStore } from '../../src/store/sessionsStore';
import {
  getMonthStart,
  getTodayDateKey,
  getWeekStart,
  isDateWithinRange,
} from '../../src/utils/date';
import { formatMinutesShort } from '../../src/utils/duration';

export default function StatsScreen() {
  const router = useRouter();
  const sessions = useSessionsStore((state) => state.sessions);

  const groupedSessions = useMemo(() => {
    return sessions.reduce<Record<string, typeof sessions>>((accumulator, session) => {
      accumulator[session.date] = [...(accumulator[session.date] ?? []), session];
      return accumulator;
    }, {});
  }, [sessions]);

  const todayKey = getTodayDateKey();
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();
  const now = new Date();

  const todayMinutes = sessions
    .filter((session) => session.date === todayKey)
    .reduce((sum, session) => sum + session.durationMinutes, 0);
  const weekMinutes = sessions
    .filter((session) => isDateWithinRange(session.date, weekStart, now))
    .reduce((sum, session) => sum + session.durationMinutes, 0);
  const monthMinutes = sessions
    .filter((session) => isDateWithinRange(session.date, monthStart, now))
    .reduce((sum, session) => sum + session.durationMinutes, 0);

  const sortedDates = Object.keys(groupedSessions).sort((left, right) =>
    left < right ? 1 : -1,
  );

  return (
    <Screen
      title="Statistik"
      subtitle="Fokus-Sessions lokal gruppiert und auswertbar."
      headerRight={<Button label="Settings" variant="ghost" onPress={() => router.push('/settings')} />}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatSummaryCard label="Heute" value={formatMinutesShort(todayMinutes)} />
        <StatSummaryCard label="Woche" value={formatMinutesShort(weekMinutes)} />
        <StatSummaryCard label="Monat" value={formatMinutesShort(monthMinutes)} />
      </View>

      {sortedDates.length === 0 ? (
        <EmptyState
          title="Noch keine Fokus-Sessions"
          description="Sobald du Fokus-Timer abschließt, erscheint hier die Session-Historie."
        />
      ) : (
        sortedDates.map((date) => (
          <SessionDayGroup key={date} date={date} sessions={groupedSessions[date]} />
        ))
      )}
    </Screen>
  );
}
