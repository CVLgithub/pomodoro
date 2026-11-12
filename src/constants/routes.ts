import type { Href } from 'expo-router';

/**
 * Zentrale Routen. Die Typen der Expo-Router-Routen entstehen erst beim Start
 * des Dev-Servers; die Zusicherung hält die Typprüfung davon unabhängig.
 */
const route = (path: string): Href => path as Href;

/** Wofür die Zuordnungs-Auswahl geöffnet wird: Timer oder Stoppuhr. */
export type AssignmentTarget = 'timer' | 'stopwatch';

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
  // Sheets: Routen unter /sheet erscheinen als natives Sheet über dem aktuellen Screen.
  assignmentSheet: (target: AssignmentTarget) => route(`/sheet/assignment?target=${target}`),
  timerModeSheet: route('/sheet/timer-mode'),
  manualSessionSheet: route('/sheet/manual-session'),
  sessionSheet: (id: string) => route(`/sheet/session/${id}`),
  newGroupSheet: route('/sheet/new-group'),
} as const;
