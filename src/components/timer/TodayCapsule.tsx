import { useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { useTodayFocusMinutes } from '../../hooks/useTodayFocusMinutes';
import { useSettingsStore } from '../../store/settingsStore';
import { getPalette, themedStyles } from '../../theme/runtime';
import { formatMinutesLong } from '../../utils/duration';
import { formatHoursClock } from '../../utils/stats';
import { Glass } from '../ui/Glass';

/** Heutige Fokuszeit; mit gesetztem Tagesziel füllt sich der Rahmen, bei Erreichen grün. */
export const TodayCapsule = () => {
  const minutes = useTodayFocusMinutes();
  const goalHours = useSettingsStore((state) => state.notificationPreferences.dailyFocusGoalHours);
  const [width, setWidth] = useState(0);

  if (!goalHours) {
    return (
      <Glass radius={RADIUS} style={styles.capsule}>
        <Text style={styles.label}>Heute {formatMinutesLong(minutes)}</Text>
      </Glass>
    );
  }

  const goalMinutes = goalHours * 60;
  const progress = Math.min(1, minutes / goalMinutes);
  const reached = minutes >= goalMinutes;
  const isDark = getPalette().scheme === 'dark';
  const base = reached ? colors.success : colors.textPrimary;

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`Heute ${formatMinutesLong(minutes)} fokussiert. Tagesziel ${formatMinutesLong(
        goalMinutes,
      )}${reached ? ', erreicht' : `, ${Math.round(progress * 100)} Prozent`}`}
    >
      <Glass radius={RADIUS} style={styles.capsule}>
        <Text style={styles.label}>Heute {formatHoursClock(minutes)}</Text>
      </Glass>
      {width > 0 ? (
        <View pointerEvents="none" style={styles.outline}>
          <View style={styles.outlineTrack} />
          {/* Glaskörper: als Ganzes halbdurchsichtig, damit das Glas der Pill durchscheint
              und überlappende Stücke nicht dunkler wirken. */}
          <View style={[styles.outline, { opacity: isDark ? 0.6 : 0.55 }]} needsOffscreenAlphaCompositing>
            <ProgressOutline width={width} progress={progress} stroke={STROKE} color={base} />
          </View>
          {/* Lichtkante: schmaler, heller Streifen an der Außenseite. */}
          <View style={[styles.outline, { opacity: isDark ? 0.5 : 0.85 }]} needsOffscreenAlphaCompositing>
            <ProgressOutline width={width} progress={progress} stroke={HIGHLIGHT} color="#FFFFFF" />
          </View>
        </View>
      ) : null}
    </View>
  );
};

const RADIUS = 22;
const STROKE = 2.5;
const HIGHLIGHT = 1;

/**
 * Fortschritt als Rahmen der Pill: startet oben in der Mitte, läuft gleichzeitig
 * links- und rechtsherum und trifft sich unten in der Mitte. Ohne SVG gebaut:
 * gerade Kanten als Balken, die runden Enden als halbe Ringe, die in einer halben
 * Box gedreht und so nur zum gewünschten Teil sichtbar werden. Die Enden des
 * Balkens sind abgerundet; wo zwei Stücke aneinanderstoßen, überlappen sie leicht.
 * Der Strich liegt immer an der Außenkante, ein schmalerer Strich also auf deren Rand.
 */
const ProgressOutline = ({
  width,
  progress,
  stroke,
  color,
}: {
  width: number;
  progress: number;
  stroke: number;
  color: string;
}) => {
  const half = Math.max(0, width - 2 * RADIUS) / 2;
  const arc = Math.PI * RADIUS;
  const overlap = stroke / 2;

  // Strecke pro Seite: halbe obere Kante, Bogen, halbe untere Kante.
  const length = progress * (2 * half + arc);
  const top = Math.min(length, half);
  const capFraction = Math.min(Math.max(length - half, 0), arc) / arc;
  const bottom = Math.min(Math.max(length - half - arc, 0), half);

  const topExtra = capFraction > 0 ? overlap : 0;
  const topWidth = Math.max(stroke, 2 * (top + topExtra));
  const bottomWidth = bottom + overlap + (bottom >= half ? overlap : 0);
  const line = { height: stroke, borderRadius: stroke / 2, backgroundColor: color };

  return (
    <>
      {length > 0 ? (
        <View style={[styles.piece, line, { top: 0, left: width / 2 - topWidth / 2, width: topWidth }]} />
      ) : null}
      <Cap side="right" fraction={capFraction} stroke={stroke} color={color} width={width} />
      <Cap side="left" fraction={capFraction} stroke={stroke} color={color} width={width} />
      {bottom > 0 ? (
        <>
          <View
            style={[styles.piece, line, { bottom: 0, right: RADIUS - overlap, width: bottomWidth }]}
          />
          <View
            style={[styles.piece, line, { bottom: 0, left: RADIUS - overlap, width: bottomWidth }]}
          />
        </>
      ) : null}
    </>
  );
};

/**
 * Halbkreis-Bogen an einem Ende, jeweils von 12 nach 6 Uhr: rechts im, links
 * gegen den Uhrzeigersinn. Ein Punkt rundet das Ende ab, solange er nicht voll ist.
 */
const Cap = ({
  side,
  fraction,
  stroke,
  color,
  width,
}: {
  side: 'left' | 'right';
  fraction: number;
  stroke: number;
  color: string;
  width: number;
}) => {
  if (fraction <= 0) {
    return null;
  }
  const isRight = side === 'right';
  const degrees = isRight ? 45 + fraction * 180 : -135 - fraction * 180;

  const angle = fraction * Math.PI;
  const centerline = RADIUS - stroke / 2;
  const centerX = isRight ? width - RADIUS : RADIUS;
  const dotX = centerX + (isRight ? 1 : -1) * centerline * Math.sin(angle);
  const dotY = RADIUS - centerline * Math.cos(angle);

  return (
    <>
      <View style={[styles.capBox, isRight ? { right: 0 } : { left: 0 }]}>
        <View
          style={[
            styles.ring,
            {
              left: isRight ? -RADIUS : 0,
              borderWidth: stroke,
              borderLeftColor: color,
              borderBottomColor: color,
              transform: [{ rotate: `${degrees}deg` }],
            },
          ]}
        />
      </View>
      {fraction < 1 ? (
        <View
          style={[
            styles.piece,
            {
              left: dotX - stroke / 2,
              top: dotY - stroke / 2,
              width: stroke,
              height: stroke,
              borderRadius: stroke / 2,
              backgroundColor: color,
            },
          ]}
        />
      ) : null}
    </>
  );
};

const styles = themedStyles(() => ({
  capsule: {
    height: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  outline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  outlineTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS,
    borderWidth: STROKE,
    borderColor: colors.border,
  },
  piece: {
    position: 'absolute',
  },
  capBox: {
    position: 'absolute',
    top: 0,
    width: RADIUS,
    height: RADIUS * 2,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    top: 0,
    width: RADIUS * 2,
    height: RADIUS * 2,
    borderRadius: RADIUS,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
}));
