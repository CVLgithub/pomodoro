import { ReactNode } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';
import { Glass } from '../ui/Glass';
import { ScreenShell } from '../ui/Screen';
import { useTabBarClearance } from '../ui/GlassTabBar';

interface SessionStageProps {
  /** Kopfzeile: links Titel oder Modus, rechts ein Status. */
  header: ReactNode;
  /** Kleine Zeile über der Zeit, z. B. der Zustand. */
  eyebrow?: ReactNode;
  time: string;
  /** Beschreibung der Zeit für Screenreader. */
  timeLabel: string;
  /** Inhalt direkt unter der Zeit, z. B. Fortschritt und Endzeit. */
  below?: ReactNode;
  /** Zuordnung und Bedienung in der Glasfläche unten. */
  children: ReactNode;
}

/**
 * Gemeinsamer Aufbau von Stoppuhr und Timer: Kopfzeile, die Zeit groß in der
 * Mitte, Zuordnung und Bedienung in einer Glasfläche über der Tab-Leiste.
 */
export const SessionStage = ({
  header,
  eyebrow,
  time,
  timeLabel,
  below,
  children,
}: SessionStageProps) => {
  const { width } = useWindowDimensions();
  const clearance = useTabBarClearance();
  const usableWidth = Math.min(width, 520);
  // Ab sechs Zeichen (z. B. "1:05:42") braucht die Zeit eine kleinere Schrift.
  const fontSize = Math.round(usableWidth * (time.length > 5 ? 0.21 : 0.29));

  return (
    <ScreenShell>
      <View style={[styles.root, { paddingBottom: clearance }]}>
        <View style={styles.header}>{header}</View>
        <View style={styles.center}>
          {eyebrow}
          <Text
            accessibilityLabel={timeLabel}
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[
              styles.time,
              { fontSize, lineHeight: Math.round(fontSize * 1.02), letterSpacing: -fontSize * 0.05 },
            ]}
          >
            {time}
          </Text>
          {below}
        </View>
        <Glass radius={38} style={styles.sheet}>
          {children}
        </Glass>
      </View>
    </ScreenShell>
  );
};

const styles = themedStyles(() => ({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  time: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  sheet: {
    padding: 10,
    gap: 8,
  },
}));
