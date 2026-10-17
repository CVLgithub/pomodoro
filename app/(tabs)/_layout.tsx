import { Tabs } from 'expo-router';


import { Ionicon } from '../../src/components/ui/Ionicon';
import { colors } from '../../src/constants/colors';

type TabIcon = {
  off: 'sunny-outline' | 'timer-outline' | 'calendar-outline' | 'list-outline' | 'bar-chart-outline';
  on: 'sunny' | 'timer' | 'calendar' | 'list' | 'bar-chart';
};

const icons: Record<string, TabIcon> = {
  today: { off: 'sunny-outline', on: 'sunny' },
  timer: { off: 'timer-outline', on: 'timer' },
  calendar: { off: 'calendar-outline', on: 'calendar' },
  tasks: { off: 'list-outline', on: 'list' },
  stats: { off: 'bar-chart-outline', on: 'bar-chart' },
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicon
            name={focused ? icons[route.name].on : icons[route.name].off}
            color={String(color)}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="today" options={{ title: 'Heute' }} />
      <Tabs.Screen name="timer" options={{ title: 'Timer' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Kalender' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Aufgaben' }} />
      <Tabs.Screen name="stats" options={{ title: 'Statistik' }} />
    </Tabs>
  );
}
