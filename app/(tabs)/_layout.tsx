import { Tabs } from 'expo-router';

import { Ionicon } from '../../src/components/ui/Ionicon';
import { colors } from '../../src/constants/colors';

const icons: Record<string, 'sunny-outline' | 'timer-outline' | 'calendar-outline' | 'list-outline' | 'bar-chart-outline'> = {
  today: 'sunny-outline',
  timer: 'timer-outline',
  calendar: 'calendar-outline',
  tasks: 'list-outline',
  stats: 'bar-chart-outline',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#0A0E14',
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicon name={icons[route.name]} color={color} size={size} />
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
