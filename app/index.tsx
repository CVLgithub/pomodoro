import { Redirect, type Href } from 'expo-router';

import { StartPage } from '../src/types/settings';
import { useSettingsStore } from '../src/store/settingsStore';

const startPageRoutes: Record<StartPage, Href> = {
  today: '/(tabs)/today',
  timer: '/(tabs)/timer',
  calendar: '/(tabs)/calendar',
  tasks: '/(tabs)/tasks',
  stats: '/(tabs)/stats',
};

export default function Index() {
  const startPage = useSettingsStore((state) => state.startPage);

  return <Redirect href={startPageRoutes[startPage]} />;
}

