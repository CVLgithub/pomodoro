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
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 84,
          paddingTop: 8,
          shadowColor: colors.shadow,
          shadowOpacity: 0.4,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -6 },
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
        tabBarIcon: ({ color, size }) => (
          <Ionicon name={icons[route.name]} color={String(color)} size={size} />
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
