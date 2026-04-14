import 'react-native-gesture-handler';

import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '../src/constants/colors';
import { initializeDatabase } from '../src/db/client';
import { useAppResume } from '../src/hooks/useAppResume';
import { downsyncEntries } from '../src/services/sync/downsyncService';
import { getEntriesRequestUrl } from '../src/services/api/entriesService';
import { useSessionsStore } from '../src/store/sessionsStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useSyncStore } from '../src/store/syncStore';
import { useTagsStore } from '../src/store/tagsStore';
import { useTasksStore } from '../src/store/tasksStore';
import { useTimerStore } from '../src/store/timerStore';
import { useUiStore } from '../src/store/uiStore';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isBootstrapped = useUiStore((state) => state.isBootstrapped);
  const setBootstrapped = useUiStore((state) => state.setBootstrapped);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        await initializeDatabase();
        await useSettingsStore.getState().loadSettings();
        if (Platform.OS === 'web') {
          try {
            await downsyncEntries();
          } catch (error) {
            console.warn(
              'Web downsync failed during bootstrap',
              getEntriesRequestUrl(),
              error instanceof Error ? error.message : error,
            );
          }
        }
        await Promise.all([
          useTagsStore.getState().loadTags(),
          useTasksStore.getState().loadTasks(),
          useSessionsStore.getState().loadSessions(),
          useSyncStore.getState().loadQueue(),
        ]);
        await useTimerStore.getState().hydrate();
        await useTimerStore.getState().reconcileWithClock();

        if (isMounted) {
          setBootstrapped(true);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Bootstrap failed');
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [setBootstrapped]);

  const startupErrorMessage =
    errorMessage ??
    (fontError instanceof Error
      ? fontError.message
      : fontError
        ? 'Icon-Fonts konnten nicht geladen werden.'
        : null);

  useAppResume(async () => {
    if (Platform.OS === 'web') {
      try {
        await downsyncEntries();
      } catch (error) {
        console.warn(
          'Web downsync failed on resume',
          getEntriesRequestUrl(),
          error instanceof Error ? error.message : error,
        );
      }
    }

    await useTimerStore.getState().reconcileWithClock();
    await Promise.all([
      useSessionsStore.getState().loadSessions(),
      useSyncStore.getState().loadQueue(),
      useTasksStore.getState().loadTasks(),
      useTagsStore.getState().loadTags(),
    ]);
  });

  if (startupErrorMessage) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Start fehlgeschlagen</Text>
        <Text style={styles.errorBody}>{startupErrorMessage}</Text>
      </View>
    );
  }

  if (!fontsLoaded || !isBootstrapped) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loading}>Pomodoro wird vorbereitet...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="stats-chart" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="downsync" />
        <Stack.Screen name="task/[id]" />
        <Stack.Screen name="tag/[id]" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  loading: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  errorBody: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
