import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SessionDayGroup } from '../../src/components/stats/SessionDayGroup';
import { StatSummaryCard } from '../../src/components/stats/StatSummaryCard';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ModalSheet } from '../../src/components/ui/ModalSheet';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { TagPill } from '../../src/components/ui/TagPill';
import { TextField } from '../../src/components/ui/TextField';
import { colors } from '../../src/constants/colors';
import { spacing } from '../../src/constants/spacing';
import { useSessionsStore } from '../../src/store/sessionsStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { Session } from '../../src/types/session';
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
  const tags = useTagsStore((state) => state.tags);
  const updateSessionEntry = useSessionsStore((state) => state.updateSessionEntry);
  const deleteSessionEntry = useSessionsStore((state) => state.deleteSessionEntry);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

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

  const selectedTag = tags.find((tag) => tag.id === selectedTagId) ?? null;

  const openSessionEditor = (session: Session) => {
    setSelectedSession(session);
    setTitleInput(session.title);
    setSelectedTagId(session.tagId);
  };

  const closeSessionEditor = () => {
    setSelectedSession(null);
    setTitleInput('');
    setSelectedTagId('');
    setShowTagPicker(false);
    setIsSaving(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    void deleteSessionEntry(sessionId)
      .then(() => {
        closeSessionEditor();
      })
      .catch((error) => {
        Alert.alert(
          'Session konnte nicht gelöscht werden',
          error instanceof Error ? error.message : 'Unbekannter Fehler',
        );
      });
  };

  const handleSaveSession = async () => {
    if (!selectedSession || !titleInput.trim() || !selectedTagId || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await updateSessionEntry(selectedSession.id, {
        title: titleInput,
        tagId: selectedTagId,
      });
      closeSessionEditor();
    } catch (error) {
      Alert.alert(
        'Session konnte nicht gespeichert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
      setIsSaving(false);
    }
  };

  return (
    <Screen
      title="Statistik"
      subtitle="Detailierte Fokus Historie."
      headerRight={<Button label="Settings" variant="ghost" onPress={() => router.push('/settings')} />}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatSummaryCard label="Heute" value={formatMinutesShort(todayMinutes)} />
        <StatSummaryCard label="Woche" value={formatMinutesShort(weekMinutes)} />
        <StatSummaryCard label="Monat" value={formatMinutesShort(monthMinutes)} />
      </View>

      <SectionCard>
        <View style={styles.chartCard}>
          <View style={styles.chartCardText}>
            <Text style={styles.chartCardTitle}>Grafische Statistik</Text>
          </View>
          <Button label="Diagramm" onPress={() => router.push('/stats-chart')} />
        </View>
      </SectionCard>

      {sortedDates.length === 0 ? (
        <EmptyState
          title="Noch keine Fokus-Sessions"
          description="Sobald du Fokus-Timer abschließt, erscheint hier die Session-Historie."
        />
      ) : (
        sortedDates.map((date) => (
          <SessionDayGroup
            key={date}
            date={date}
            sessions={groupedSessions[date]}
            onPressSession={openSessionEditor}
          />
        ))
      )}

      <ModalSheet
        visible={Boolean(selectedSession)}
        title="Session bearbeiten"
        onClose={closeSessionEditor}
      >
        <SectionCard>
          <TextField
            label="Name"
            value={titleInput}
            onChangeText={setTitleInput}
            placeholder="Session benennen"
          />

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Tag</Text>
            <Pressable style={styles.selector} onPress={() => setShowTagPicker(true)}>
              {selectedTag ? (
                <TagPill label={selectedTag.name} color={selectedTag.color} />
              ) : (
                <Text style={styles.value}>Tag wählen</Text>
              )}
              <Text style={styles.link}>Wählen</Text>
            </Pressable>
          </View>

          {selectedSession ? (
            <View style={styles.metaBlock}>
              <Text style={styles.metaText}>
                {selectedSession.date} • {selectedSession.startTime.slice(11, 16)} -{' '}
                {selectedSession.endTime.slice(11, 16)}
              </Text>
            </View>
          ) : null}
        </SectionCard>

        <SectionCard>
          <View style={styles.rowActions}>
            <Button
              label="Speichern"
              onPress={() => void handleSaveSession()}
              disabled={!titleInput.trim() || !selectedTagId || isSaving}
            />
            <Button
              label="Löschen"
              variant="danger"
              onPress={() => {
                if (!selectedSession) {
                  return;
                }

                Alert.alert(
                  'Session löschen?',
                  `${selectedSession.title} wird aus der lokalen Statistik entfernt.`,
                  [
                    { text: 'Abbrechen', style: 'cancel' },
                    {
                      text: 'Löschen',
                      style: 'destructive',
                      onPress: () => handleDeleteSession(selectedSession.id),
                    },
                  ],
                );
              }}
            />
          </View>
        </SectionCard>

        <ModalSheet
          visible={showTagPicker}
          title="Tag wählen"
          onClose={() => setShowTagPicker(false)}
        >
          <View style={styles.modalList}>
            {tags.map((tag) => (
              <Pressable
                key={tag.id}
                style={styles.modalRow}
                onPress={() => {
                  setSelectedTagId(tag.id);
                  setShowTagPicker(false);
                }}
              >
                <TagPill label={tag.name} color={tag.color} />
              </Pressable>
            ))}
          </View>
        </ModalSheet>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fieldBlock: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  selector: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  link: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  metaBlock: {
    marginTop: spacing.sm,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  modalList: {
    gap: spacing.sm,
  },
  modalRow: {
    paddingVertical: spacing.sm,
  },
  chartCard: {
    gap: spacing.md,
  },
  chartCardText: {
    gap: spacing.xs,
  },
  chartCardTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  chartCardBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
