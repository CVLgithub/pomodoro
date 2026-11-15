import { DarkTheme, DefaultTheme, Tabs, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { hasNativeGlass } from '../../src/components/ui/Glass';
import { GlassTabBar } from '../../src/components/ui/GlassTabBar';
import { colors } from '../../src/constants/colors';
import { getPalette } from '../../src/theme/runtime';

export default function TabsLayout() {
  if (hasNativeGlass) {
    const palette = getPalette();
    const contentStyle = { backgroundColor: colors.background };

    return (
      <ThemeProvider value={palette.scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <NativeTabs tintColor={colors.textPrimary}>
          <NativeTabs.Trigger
            name="today"
            disableAutomaticContentInsets
            contentStyle={contentStyle}
          >
            <NativeTabs.Trigger.Label>Stoppuhr</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: 'stopwatch', selected: 'stopwatch.fill' }} />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger
            name="timer"
            disableAutomaticContentInsets
            contentStyle={contentStyle}
          >
            <NativeTabs.Trigger.Label>Timer</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="hourglass" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger
            name="tasks"
            disableAutomaticContentInsets
            contentStyle={contentStyle}
          >
            <NativeTabs.Trigger.Label>Aufgaben</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: 'checkmark.square', selected: 'checkmark.square.fill' }}
            />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger
            name="stats"
            disableAutomaticContentInsets
            contentStyle={contentStyle}
          >
            <NativeTabs.Trigger.Label>Statistik</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger
            name="settings"
            role="search"
            disableAutomaticContentInsets
            contentStyle={contentStyle}
          >
            <NativeTabs.Trigger.Label>Einstellungen</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="slider.horizontal.3" />
          </NativeTabs.Trigger>
        </NativeTabs>
      </ThemeProvider>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Stoppuhr' }} />
      <Tabs.Screen name="timer" options={{ title: 'Timer' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Aufgaben' }} />
      <Tabs.Screen name="stats" options={{ title: 'Statistik' }} />
      <Tabs.Screen name="settings" options={{ title: 'Einstellungen' }} />
    </Tabs>
  );
}
