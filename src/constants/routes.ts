import type { Href } from 'expo-router';

/**
 * Zentrale Routen. Die Typen der Expo-Router-Routen entstehen erst beim Start
 * des Dev-Servers; die Zusicherung hält die Typprüfung davon unabhängig.
 */
const route = (path: string): Href => path as Href;

export const routes = {
  timer: route('/(tabs)/timer'),
  tasks: route('/(tabs)/tasks'),
  newTask: route('/task/new'),
  task: (id: string) => route(`/task/${id}`),
  newTag: route('/tag/new'),
  tag: (id: string) => route(`/tag/${id}`),
  notifications: route('/prefs/notifications'),
  tags: route('/prefs/tags'),
  deletedSessions: route('/prefs/deleted-sessions'),
  syncQueue: route('/prefs/sync-queue'),
  connection: route('/prefs/connection'),
  import: route('/downsync'),
} as const;
