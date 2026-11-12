import 'react-native-gesture-handler';

import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '../src/constants/colors';
import { initializeDatabase } from '../src/db/client';
import { useAppResume } from '../src/hooks/useAppResume';
import { getEntriesRequestUrl } from '../src/services/api/entriesService';
import { reloadStores, syncAndReload } from '../src/services/sync/fullSync';
import { useSettingsStore } from '../src/store/settingsStore';
import { useStopwatchStore } from '../src/store/stopwatchStore';
import { useTimerStore } from '../src/store/timerStore';
import { useUiStore } from '../src/store/uiStore';
import { UserIdOnboarding } from '../src/components/settings/UserIdOnboarding';
import { sheetScreenOptions } from '../src/components/ui/sheetScreenOptions';
import { themedStyles } from '../src/theme/runtime';

const runAutomaticSync = async (reason: string): Promise<void> => {
  const result = await syncAndReload();

  if (!result.ok) {
    console.warn(`Automatic sync failed (${reason})`, getEntriesRequestUrl(), result.message);
  }
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isBootstrapped = useUiStore((state) => state.isBootstrapped);
  const setBootstrapped = useUiStore((state) => state.setBootstrapped);
  const userId = useSettingsStore((state) => state.userId);
  const isDevUserId = useSettingsStore((state) => state.isDevUserId);
  const theme = useSettingsStore((state) => state.theme);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        await initializeDatabase();
        // Lokal zuerst: Die App startet mit dem lokalen Stand und gleicht
        // danach im Hintergrund ab, damit ein langsames oder nicht erreichbares
        // Backend den Start nicht aufhält.
        await reloadStores();
        await useTimerStore.getState().hydrate();
        await useStopwatchStore.getState().hydrate();
        await useTimerStore.getState().reconcileWithClock();

        if (isMounted) {
          setBootstrapped(true);
        }

        void runAutomaticSync('bootstrap');
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
    await runAutomaticSync('resume');
    await useTimerStore.getState().reconcileWithClock();
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

  const sheetOptions = sheetScreenOptions();

  return (
    // Der key baut den Baum nach einem Wechsel der Farbwelt neu auf, damit alle
    // Komponenten ihre Styles in den neuen Farben lesen.
    <GestureHandlerRootView key={theme} style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="downsync" />
        <Stack.Screen name="prefs/notifications" />
        <Stack.Screen name="prefs/tags" />
        <Stack.Screen name="prefs/deleted-sessions" />
        <Stack.Screen name="prefs/sync-queue" />
        <Stack.Screen name="prefs/connection" />
        <Stack.Screen name="task/[id]" />
        <Stack.Screen name="tag/[id]" />
        {/* Sheets. `dangerouslySingular` verhindert, dass ein Doppeltipp dasselbe
            Sheet zweimal übereinander öffnet. */}
        <Stack.Screen name="sheet/assignment" options={sheetOptions} dangerouslySingular />
        <Stack.Screen name="sheet/timer-mode" options={sheetOptions} dangerouslySingular />
        <Stack.Screen name="sheet/manual-session" options={sheetOptions} dangerouslySingular />
        <Stack.Screen name="sheet/session/[id]" options={sheetOptions} dangerouslySingular />
        <Stack.Screen name="sheet/new-group" options={sheetOptions} dangerouslySingular />
      </Stack>
      {!userId && !isDevUserId && !onboardingDismissed ? (
        <UserIdOnboarding
          onComplete={async () => {
            await useSettingsStore.getState().loadSettings();
            setOnboardingDismissed(true);
          }}
        />
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = themedStyles(() => ({
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
}));
