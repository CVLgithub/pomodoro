import { router } from 'expo-router';

import { routes } from '../../constants/routes';
import { showToast } from '../../store/uiStore';
import { Session } from '../../types/session';
import { formatMinutesLong } from '../../utils/duration';

/** Meldet eine gespeicherte Session mit der Möglichkeit, sie gleich zu korrigieren. */
export const announceSavedSession = (session: Session, prefix = 'Session gespeichert'): void => {
  showToast({
    message: `${prefix} · ${formatMinutesLong(session.durationMinutes)}`,
    tone: 'success',
    actionLabel: 'Bearbeiten',
    onAction: () => router.push(routes.sessionSheet(session.id)),
  });
};
